# Editing a route's objects — design

**Goal:** draw on a dungeon map — notes, arrows, freehand strokes — delete and move what is
already there, undo your own work, see your teammates' strokes appear as they draw them, and
export the result as a share string MDT accepts.

**Why now:** slices A and B read the whole preset and made it legible. Nothing writes to it. The
route editor can rearrange pulls but cannot say *why* a pull is shaped that way, which is what the
notes and arrows in every shared MDT route exist to do.

## Scope: this is slice C of three, and it is not split further

The decomposition is the one recorded in
[the slice A design](2026-08-17-mdt-overlays-design.md#scope-this-is-slice-a-of-three). A and B are
merged work. This spec covers C.

C was originally sketched as two halves — draw in the app first, export to MDT later. **That split
does not survive the requirements.** Deleting an object that came from the imported preset means it
must not reappear on export, which means `routeToLua` has to rebuild `objects` rather than pass it
through. That rebuild *is* the export half. And once the encoder exists, re-exporting an object we
created costs almost nothing. So the encoder lands in this slice, and the slice stays whole.

## The invariant this changes, and what replaces it

Slices A and B rested on a sentence: `routeToLua` never rebuilds `objects`. Mechanically
(`route.ts:151-155`) it shallow-copies `route.source` into a new `Map`, sets only the keys it
understands, and every key it never mentions rides through untouched.

That sentence is now false, and something narrower takes its place:

> **An entry in the preset's `objects` table that this app did not edit is re-emitted byte for
> byte. Only an edited or created object passes through our encoder.**

The existing `codec.test.ts` guard — "preserves the preset fields it does not understand on
re-export", which asserts `objects` comes back identical — is therefore **extended, not weakened**.
A preset nobody edited must still round-trip identically once `objectsToLua` is in the path. That
test failing is the signal that this design is broken.

## Why a whole-model rebuild is not an option

`luaToObjects` is a reader, not a bijection. Rebuilding `objects` from `MdtObject[]` destroys four
things, each verified against the committed fixtures:

| What is lost | Why |
| --- | --- |
| An imported arrow's rotation | `t` is read for presence only — `isArrow: asTable(obj.get('t')) != null`. Its value is never read, so it cannot be re-emitted. |
| A hidden object | `d[4] === false` makes `luaToObjects` skip the entry (`objects.ts:64`). Hiding an object is a real MDT action. |
| A degenerate stroke | Fewer than two points and the entry is skipped (`objects.ts:91`); an odd trailing coordinate is dropped (`objects.ts:85`). |
| A boundary value | MDT's own fallbacks are copied on read: an invalid colour becomes `ffffff`, a missing size becomes 5, a missing layer becomes 0. A stroke of size 0 comes back as 5. |

Degrading a teammate's preset because we touched one note is not an acceptable cost of editing.

## The decisions

### 1. `objects` becomes a Y.js key, absent until the first edit

Today `objects` is **derived, not stored**: `readRoute` computes
`objects: source ? luaToObjects(source) : []` on every read (`useRouteDoc.ts:138`). There is
nowhere to put an object the app created.

The document gains a top-level `objects` key, a `Y.Array<Y.Map>`, and it is **absent until the
first edit**. While absent, `Route.objects` stays derived from `source` exactly as today: a session
that never draws behaves identically, and the export path does not change. The first edit runs one
transaction that **adopts** — materialises everything `luaToObjects(source)` produced into the
array — and then applies the edit. From then on the array is authoritative for rendering.

Rejected: keeping `source` pristine and storing a separate overlay of additions and deletions. It
avoids duplication, but moving or retexting an imported object becomes a per-field override, and
the merge is paid on every read. Lazy adoption gets the same non-duplication with one list to
reason about.

### 2. Provenance, not the raw entry

An object carries `from?: number` — the integer key of the entry it came from in `source`'s
`objects` table. Absent means the app created it.

Storing the *index* rather than the original Lua entry matters twice. `source` is already in the
document as an MDT string, so the raw entry is recoverable at export without a second copy. And a
`LuaTable` is a `Map` with mixed key types, which is not serialisable inside a Y.js document at all.

### 3. One rule in the encoder, and no flags to keep honest

`objectsToLua(source, objects)` walks `source`'s `objects` entries in key order:

- an entry some object claims via `from` → **re-emitted verbatim** if that object still equals what
  `luaToObjects` read from it, **synthesised** otherwise. Equality compares the fields MDT stores
  and ignores the two the app added, `from` and the identifier;
- an entry nobody claims → **omitted** if `luaToObjects` had parsed it (a deletion), **re-emitted
  verbatim** if it had not (we never understood it, so we do not touch it);
- then objects with no `from`, synthesised and appended.

Every loss in the table above travels the verbatim branch and never reaches our encoder.

Both "was it parsed" and "was it modified" are **recomputed from `source` at export** by re-reading
`luaToObjects`, rather than carried as a `dirty` flag. A flag can go stale; a comparison cannot. The
object count is small enough that the cost is irrelevant.

### 4. MDT's arrow convention, derived rather than guessed

Creating an arrow means synthesising the `t` value that `luaToObjects` never reads. The convention
was derived from the two real arrows in `__fixtures__/real-export-strokes.txt`, whose points and
`t` are both known:

```
t[1] = atan2(y1 - y2, x1 - x2)      // radians, in MDT's own coordinate space
```

| Arrow | Points | MDT's `t` | Computed | Δ |
| --- | --- | --- | --- | --- |
| `objects[6]` | `235.9,-497.1 → 235.0,-529.2` | 1.543530772997453 | 1.54276628683505 | 0.00076 |
| `objects[7]` | `253.6,-487.7 → 288.5,-500.3` | 2.795456914547873 | 2.7951242017736755 | 0.00033 |

Both agree to within the rounding of coordinates stored to one decimal. The reverse convention,
`atan2(y2 - y1, x2 - x1)`, is wrong by π on both. The unit test asserts these two arrows, so the
claim fails loudly if it was luck.

### 5. What the fixture says to emit, copied without pretending to understand it

The same fixture settles three values our reader ignores and our encoder must nonetheless produce:

| Key | Freehand stroke | Arrow | Read by `luaToObjects`? |
| --- | --- | --- | --- |
| `d[1]` | 5 | 13 | yes, as `size` |
| `d[2]` | 1.1 | 1 | **no** |
| `d[6]` | −8 | −8 | yes, as `layer` |
| `d[7]` | `true` | absent | yes, as `smooth` |

So MDT's freehand default is `smooth: true`, an arrow carries no `smooth` key at all, and `d[2]`
means something we do not know. A synthesised object copies the value the fixture shows for its
kind. **This is imitation, not understanding**, and it is recorded as such so nobody later mistakes
`1.1` for a considered choice.

`l` holds **strings**, not numbers — `objects.ts:84` coerces with `Number(l.get(k))`. A synthesised
stroke emits strings at one decimal, matching what the game wrote.

### 6. A stroke in progress rides on awareness, not the document

`awareness.setLocalStateField` already carries peer cursors (`useRouteDoc.ts:537`), which is the
precedent: ephemeral state lives outside the document.

A stroke being drawn is published on awareness and enters the document only on release, as one
operation. The alternative — a document operation per sampled point — would put an order of
magnitude more into the shared history for a gesture that is discarded as often as it is kept. The
freehand stroke in the fixture has **132 points**.

Sampling drops a point closer than a minimum distance to the last one, so a slow gesture does not
produce ten times what MDT produces.

### 7. The left column has two states

Slice B's design already reserved this space: "It gets a strip in this column instead of
re-litigating the page's layout later."

With no tool active and nothing selected, the column shows slice B's mob panel. With a tool active
or an object selected, it shows the editing surface — the note's text, the stroke's colour and
size. Weighing a pack and marking the map are different tasks; sharing 360px between them serves
neither.

### 8. A stroke is only clickable while a selection tool is active

`ObjectLayer` draws into a `<g className="pointer-events-none">` and `NoteLayer` is a
`pointer-events-none` layer whose pins alone opt back in. **A layer over the map without
`pointer-events-none` swallowed every click on this branch once already**, and no test caught it —
a reviewer opening a real browser did.

So a stroke becomes a hit target only while a selection tool is active: an invisible wider path
beneath it with `pointer-events: stroke`, mounted conditionally. With no tool active the map
behaves exactly as it does today, and that is checkable with `document.elementFromPoint` at a
blip's centre — the probe that caught the slice A regression.

### 9. Undo is local, and covers objects only

A `Y.UndoManager` scoped to the **document root**, isolated by `trackedOrigins` set to a single
origin the new object actions pass to `doc.transact`.

Scoping to the root rather than to the objects array is deliberate and is what makes decision 1
work: the array does not exist until the first edit, so there is nothing to scope to at
construction, and the transaction that *creates* the key has to be undoable like any other. The
existing pull actions pass no origin (`useRouteDoc.ts:370-384`), which means `trackedOrigins` must
name our origin **explicitly** rather than rely on the default `new Set([null])` — that default
would capture every pull change, since a bare `doc.transact(fn)` has a null origin. Naming our
origin excludes them by construction.

Undoing the first edit therefore removes the adoption with it: the array disappears and rendering
falls back to `objects` derived from `source` — exactly the prior state, with nothing written to
make that so.

`Ctrl+Z` / `Cmd+Z` on a document listener, active in Route mode only and inert while a note's text
field has focus.

### 10. Identity is `${clientID}:${n}`

Selection and deletion need a stable identifier, and a Y.Array index is not one under concurrent
edit. There is no id generator anywhere in `src/` today. A counter scoped to the Y.js client id is
deterministic, testable without a stub, and does not depend on what jsdom exposes of
`crypto.randomUUID`.

## What gets built

| File | Change |
| --- | --- |
| `src/lib/mdt/objects.ts` | `from` on every object read; `objectsToLua`; the synthesisers for note, arrow and stroke. |
| `src/lib/mdt/route.ts` | `routeToLua` calls `objectsToLua` when the route carries edited objects. |
| `src/lib/mdt/useRouteDoc.ts` | the `objects` key, lazy adoption, the object actions, the `UndoManager`, the in-progress stroke on awareness. |
| `src/components/route/ObjectToolbar.tsx` | **new** — the tool strip. |
| `src/components/route/ObjectEditor.tsx` | **new** — the column's editing state. |
| `src/components/map/DrawSurface.tsx` | **new** — the gesture: pointer down/move/up, sampling, the live preview. |
| `src/components/map/ObjectLayer.tsx` | selection outline; the conditional hit target. |
| `src/components/map/NoteLayer.tsx` | selection; drag to move. |
| `src/components/map/PeerCursors.tsx` | the peers' in-progress strokes, which ride the same awareness state. |
| `src/routes/DungeonPage.tsx` | tool and selection state; the column's two states. |
| `src/lib/i18n/en.ts`, `fr.ts` | the tool names, the editor's labels. |

## Testing

| Level | What it proves |
| --- | --- |
| Unit | `objectsToLua`: each of the four fidelity cases re-emitted identically; deletion omits; creation appends; modification synthesises. The arrow convention against both real arrows. Strings at one decimal in `l`. |
| Unit, codec | **The existing byte-identical guard, extended**: an unedited preset still round-trips identically with `objectsToLua` in the path. |
| Y.js | Adoption on the first edit and not before; each new action; undo confined to local edits; undoing the adoption restoring the derived state. |
| Integration, jsdom | The toolbar; the column's two states; a full `pointerdown`/`move`/`up` gesture; selection; deletion; the note's text field swallowing `Ctrl+Z`. |
| End-to-end | Two real browsers on the real relay: one draws, the other sees the stroke during the gesture and then fixed. This is the only level that can prove awareness carries it. |
| Browser, by hand | With no tool active, `elementFromPoint` at a blip's centre still reaches the blip, and clicking a mob still moves the forces total. |
| **In the game** | **Mandatory for this slice, not optional as it was for A and B.** Export a route with a created note, arrow and stroke, import it into MDT, and confirm the game draws them. We are writing into the preset for the first time; only the client can say whether it accepts what we produce. |

The freehand gesture is the first place jsdom will mislead us outright: it models neither pointer
capture nor event throughput. The end-to-end level is where that gesture is really tested.

## Deliberately not in this slice

- **No permission model.** Any peer may edit, as is already true of pulls.
- **No editing in the Codex tab.** The column exists in Route mode only and drawing follows it.
- **Undo does not cover pulls.** Consistent with leaving their actions untouched, and there is no
  undo anywhere in the app today to be consistent with instead.
- **No `d[2]`, no `smooth` toggle, no layer control.** We copy what the fixture shows and expose
  none of it, because we cannot yet say what a user would be choosing.
- **No text formatting in a note.** MDT stores a plain string.
