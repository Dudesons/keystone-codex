# Object write path — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan task by task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** the app can delete, modify and create a route's objects, replicate them to peers, undo its
own edits, and export a share string in which an object it never touched is byte-identical.

**Architecture:** one pure encoder decides, per entry in the preset's `objects` table, whether to
re-emit it verbatim, omit it, or synthesise it — from provenance recorded on each object rather than
from a dirty flag. The Y.js document gains an `objects` key that stays absent until the first edit,
so a session that never draws is unchanged. Undo is a `Y.UndoManager` on the document root,
isolated by transaction origin.

**Tech Stack:** TypeScript 5.7, Vitest (`app` project, node + jsdom), Y.js 13.6, `y-websocket` 3.1.

**Spec:** [`docs/plans/2026-08-18-mdt-object-editing-design.md`](2026-08-18-mdt-object-editing-design.md).
Read it before Task 1 — it argues every choice below and records which numbers were derived from a
real export rather than chosen.

**This is plan 1 of 2 for slice C.** It builds the write path, which has no visual surface and is
testable end to end without a browser. The slice ships when both land; nothing here is user-reachable
on its own, and that is deliberate — the encoder is what the rest stands on.

Plan 2 carries the spec's decisions **6** (a stroke in progress on `awareness`, not in the document),
**7** (the left column's two states) and **8** (a stroke clickable only while a selection tool is
active), plus the toolbar, the three gestures, selection, deletion and moving. It also carries the
spec's two heaviest verification steps, both of which need something this plan cannot produce: the
end-to-end test of two browsers drawing at each other, and **the in-game round trip**, which is
mandatory for this slice and can only be done once objects can be created by hand.

## Read this before trusting any code in this plan

**The code in this plan has never run.** On the slice A branch, four defects came from code written
into a plan document and taken as verified. On slice B, every one of the five tasks had to correct
something, and the whole-slice review still found a test that passed against an unimplemented
feature.

Treat every snippet here as a draft you are expected to correct. When you correct one, say so
plainly in your report and say why. Correcting the plan is the expected outcome, not a failure.

**One exception, and it is absolute: the numbers taken from the real fixture are not yours to
adjust.** The arrow angles `1.543530772997453` and `2.795456914547873`, the note shape
`{n, d}` with `d = [x, y, sublevel, true, text]`, the stroke `d[2]` values `1.1` and `1`, the layer
`-8`, and the fact that `l` holds strings while a note's `d` holds numbers — all of these were read
off `__fixtures__/real-export-strokes.txt` by decoding it. If your code disagrees with one, your
code is wrong. Print the value, work out why, and report it.

## Global Constraints

- **Everything committed is in English** — code, comments, tests, commit messages. The UI and
  `content/**.md` are the only translated surfaces.
- **Commit style:** imperative mood, no `feat:`/`fix:` prefix. The subject says what the commit does
  to the repository; the body says **why**, never what.
- **Never** `--no-verify`, `--no-hooks`, `--no-pre-commit-hook`.
- **Never** `git add -A` or `git commit -a` — another session commits to this repository
  concurrently. Run `git status` first and stage only named paths.
- All code files start with two `// ABOUTME: ` comment lines.
- **`npm test` must be green with no skips before every commit**, and `npm run typecheck` clean.
- **The invariant, in its new form:** an entry in the preset's `objects` table that this app did not
  edit is re-emitted **byte for byte**. Only an edited or created object passes through the encoder.
- **`codec.test.ts`'s byte-identical guard is extended, never weakened.** If you find yourself
  loosening an assertion in that file, stop and report it.
- Coordinates are stored on the model in **map pixels**, exactly as `luaToObjects` produces them.
  Conversion to MDT's space happens only inside the encoder.

## Commands on this machine

`node` and `npm` may not be on the Bash tool's PATH. Check with `node --version`; if it fails:

```
export PATH="/c/Program Files/nodejs:$PATH"
```

`rm` is denied by the permission layer — delete with `node -e "require('fs').unlinkSync('…')"`.

## File map

| File | Responsibility | Task |
| --- | --- | --- |
| `src/lib/mdt/objects.ts` | `from` on every object read; `objectsToLua`; the arrow angle; the synthesisers; the fixture-derived defaults | 1, 2 |
| `src/lib/mdt/objects.test.ts` | the reader's `from`, the encoder's four fidelity cases, the synthesisers | 1, 2 |
| `src/lib/mdt/route.ts` | `routeToLua` calls `objectsToLua` | 3 |
| `src/lib/mdt/codec.test.ts` | the byte-identical guard, extended | 3 |
| `src/lib/mdt/useRouteDoc.ts` | the `objects` key, lazy adoption, the object actions, the `UndoManager` | 4, 5 |
| `src/lib/mdt/useRouteDoc.test.tsx` | adoption timing, the actions, replication, undo | 4, 5 |

---

## Task 1: Provenance, and the entries the encoder must not touch

**Files:**
- Modify: `src/lib/mdt/objects.ts`
- Modify: `src/lib/mdt/objects.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // added to both MdtNote and MdtStroke
  /** The integer key this object came from in the preset's `objects` table. Absent when the app created it. */
  from?: number

  export function objectsToLua(source: LuaTable | undefined, objects: MdtObject[]): LuaTable
  ```

This task builds the encoder's **routing** — verbatim, omit, or synthesise — and only the first two
branches. Synthesis is Task 2, so a modified or created object throws here and Task 2 removes the
throw. That split is deliberate: deletion fidelity is what the byte-identical guard is about, and it
is worth passing a reviewer's gate on its own.

**Note before you start:** `luaToObjects` **reorders** what it returns — strokes sorted by layer,
then notes (`objects.ts:109-110`). The returned order therefore does not match the source's key
order, which is exactly why provenance is an index and not a position.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/mdt/objects.test.ts`. Read the file's existing imports and fixture-loading idiom
first and reuse it rather than adding a second way to load the fixture — the existing tests
`it.skip` when the fixture is absent, and yours should behave the same way.

```ts
import { objectsToLua } from './objects'

describe('objectsToLua — what it refuses to touch', () => {
  const preset = () => decodeMdtString(readFixture('real-export-strokes.txt')).table

  it('records where every object came from', () => {
    const objects = luaToObjects(preset())
    // Eleven entries, every one of them parseable in this fixture.
    expect(objects.every((o) => typeof o.from === 'number')).toBe(true)
    expect(new Set(objects.map((o) => o.from)).size).toBe(objects.length)
  })

  it('re-emits an untouched preset identically', () => {
    const source = preset()
    const out = objectsToLua(source, luaToObjects(source))
    expect(out).toEqual(source.get('objects'))
  })

  it('omits an object that no longer claims its entry', () => {
    const source = preset()
    const objects = luaToObjects(source)
    const dropped = objects.find((o) => o.kind === 'note')!
    const out = objectsToLua(
      source,
      objects.filter((o) => o !== dropped),
    )
    const before = asTable(source.get('objects'))!
    expect(out.size).toBe(before.size - 1)
    // Every surviving entry is the original object, not a copy of one.
    const survivors = [...out.values()]
    expect(survivors).not.toContain(before.get(dropped.from!))
  })

  it('keeps an entry it never understood, even though nothing claims it', () => {
    // MDT writes `shown: false` for a stroke its author undid, and keeps the object in case they
    // redo it. `luaToObjects` skips it, so no object can claim it — and it must survive anyway.
    const source = preset()
    const raw = asTable(source.get('objects'))!
    const hiddenKey = [...raw.keys()].find((k): k is number => typeof k === 'number')!
    const hidden = asTable(raw.get(hiddenKey))!
    asTable(hidden.get('d'))!.set(4, false)

    const objects = luaToObjects(source)
    expect(objects.some((o) => o.from === hiddenKey)).toBe(false)

    const out = objectsToLua(source, objects)
    expect([...out.values()]).toContain(hidden)
  })

  it('is empty for a preset with no objects at all', () => {
    expect(objectsToLua(undefined, []).size).toBe(0)
    expect(objectsToLua(new Map(), []).size).toBe(0)
  })
})
```

`asTable` is module-private in `objects.ts`. Either export it, or write a two-line local copy in the
test file — decide which and say why in your report. Exporting a helper for a test's convenience is
usually the wrong trade; `src/lib/mdt/` already duplicates `asTable` three times, so a fourth local
copy is consistent with the file's neighbours even though it is not lovely.

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run --project app src/lib/mdt/objects.test.ts
```

Expected: the new tests fail on `objectsToLua` not being exported; the existing ones still pass.

- [ ] **Step 3: Add `from` to the reader**

In `src/lib/mdt/objects.ts`, add to **both** `MdtNote` and `MdtStroke`:

```ts
  /**
   * The integer key this object came from in the preset's `objects` table. Absent when the app
   * created it. This is what lets `objectsToLua` hand an untouched entry back byte for byte
   * instead of rebuilding it — see the slice C design, decision 2.
   */
  from?: number
```

In `luaToObjects`, add `from: key` to the object pushed in each of the two branches — the
`notes.push({ … })` call and the `strokes.push({ … })` call.

- [ ] **Step 4: Write the encoder's routing**

Append to `src/lib/mdt/objects.ts`:

```ts
/**
 * Rebuilds a preset's `objects` table from the objects the app now holds.
 *
 * One rule, applied to the source's entries in key order:
 *
 *   - an entry some object claims through `from` is re-emitted **verbatim** when that object still
 *     equals what `luaToObjects` read from it, and synthesised when it does not;
 *   - an entry nobody claims is **omitted** if `luaToObjects` had parsed it — that is a deletion —
 *     and re-emitted verbatim if it had not, because an entry we never understood is not ours to
 *     rewrite;
 *   - objects with no `from` are synthesised and appended.
 *
 * Both "was it parsed" and "was it modified" are recomputed from `source` here rather than carried
 * as a flag on the object. A flag can go stale between the edit and the export; a comparison
 * cannot, and there are never enough objects for the cost to matter.
 */
export function objectsToLua(source: LuaTable | undefined, objects: MdtObject[]): LuaTable {
  const out: LuaTable = new Map()
  const raw = source ? asTable(source.get('objects')) : undefined

  const claimed = new Map<number, MdtObject>()
  for (const o of objects) if (o.from != null) claimed.set(o.from, o)

  const asRead = new Map<number, MdtObject>()
  if (source) for (const o of luaToObjects(source)) if (o.from != null) asRead.set(o.from, o)

  let next = 1
  if (raw) {
    for (const key of intKeys(raw)) {
      const object = claimed.get(key)
      if (object) {
        const original = asRead.get(key)
        out.set(next++, original && sameObject(object, original) ? raw.get(key)! : objectToLua(object))
        continue
      }
      if (!asRead.has(key)) out.set(next++, raw.get(key)!)
    }
  }

  for (const o of objects) if (o.from == null) out.set(next++, objectToLua(o))
  return out
}

/**
 * Whether an object still says what the preset said, ignoring the two fields the app added. `from`
 * is provenance and the identifier is ours; neither reaches MDT, so neither can make an entry
 * dirty.
 */
function sameObject(a: MdtObject, b: MdtObject): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'note' && b.kind === 'note') {
    return a.at.x === b.at.x && a.at.y === b.at.y && a.sublevel === b.sublevel && a.text === b.text
  }
  if (a.kind === 'stroke' && b.kind === 'stroke') {
    return (
      a.sublevel === b.sublevel &&
      a.color === b.color &&
      a.size === b.size &&
      a.smooth === b.smooth &&
      a.layer === b.layer &&
      a.isArrow === b.isArrow &&
      a.points.length === b.points.length &&
      a.points.every((p, i) => p.x === b.points[i].x && p.y === b.points[i].y)
    )
  }
  return false
}
```

And a placeholder for Task 2's synthesiser, so this task compiles and its own tests are honest about
what it does not yet do:

```ts
function objectToLua(_object: MdtObject): LuaTable {
  // Task 2 of the object write path replaces this. Until then, nothing may reach it: every test in
  // this task covers an object that is either untouched or absent.
  throw new Error('objectToLua: synthesising an object is not implemented yet')
}
```

**If the type checker objects to `raw.get(key)!` because `LuaTable`'s value type does not include
`LuaTable`,** read `src/lib/mdt/cbor.ts`'s `LuaValue`/`LuaTable` definitions and use whatever the
union actually allows. Say in your report what you found.

- [ ] **Step 5: Run them and watch them pass**

```bash
npx vitest run --project app src/lib/mdt/objects.test.ts
npm test
npm run typecheck
```

All green, no skips. Nothing calls `objectsToLua` yet, so no existing behaviour can have moved — if
something in `route.test.ts` or `codec.test.ts` fails, read it rather than adjusting it.

- [ ] **Step 6: Commit**

```bash
git status --short
git add src/lib/mdt/objects.ts src/lib/mdt/objects.test.ts
git commit
```

Subject: `Record where each of a preset's objects came from`. In the body, say why provenance is an
index rather than the original Lua entry: `source` is already in the document as a string, so the
entry is recoverable without a second copy, and a `LuaTable` is not serialisable in Y.js anyway.

---

## Task 2: The synthesisers, and MDT's arrow convention

**Files:**
- Modify: `src/lib/mdt/objects.ts`
- Modify: `src/lib/mdt/objects.test.ts`

**Interfaces:**
- Consumes: `objectsToLua`, `sameObject`, `objectToLua` from Task 1.
- Produces:
  ```ts
  /** The angle MDT stores in an arrow's `t`, in radians, in MDT's coordinate space. */
  export function arrowAngle(points: Point[]): number

  /** What MDT itself writes for a fresh stroke of each kind, read off the real fixture. */
  export const MDT_STROKE_DEFAULTS: { size: number; smooth: boolean; layer: number }
  export const MDT_ARROW_DEFAULTS: { size: number; smooth: boolean; layer: number }
  ```

**The three asymmetries this task has to get right**, all read off
`__fixtures__/real-export-strokes.txt` by decoding it:

| | A note | A stroke or arrow |
| --- | --- | --- |
| Keys on the object | `n` and `d`, nothing else | `d` and `l`, plus `t` for an arrow |
| Coordinates | full-precision **numbers** in `d[1]`, `d[2]` | **strings** at one decimal in `l` |
| `d[2]` | the note's Y | MDT's `lineFactor`: `1.1` freehand, `1` arrow |

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/mdt/objects.test.ts`:

```ts
import { arrowAngle, MDT_ARROW_DEFAULTS, MDT_STROKE_DEFAULTS } from './objects'

describe('arrowAngle — MDT’s own convention, derived from two real arrows', () => {
  /**
   * These two angles are what the game wrote. The convention was derived from them and from their
   * endpoints: `atan2(y1 - y2, x1 - x2)` in MDT's coordinate space. The reverse convention is
   * wrong by π on both, so a sign slip cannot pass this test.
   *
   * The tolerance is the rounding of coordinates MDT stores to one decimal, not slack.
   */
  it.each([
    ['objects[6]', 1.543530772997453],
    ['objects[7]', 2.795456914547873],
  ])('reproduces the angle MDT stored for %s', (_label, expected) => {
    const source = decodeMdtString(readFixture('real-export-strokes.txt')).table
    const arrows = luaToObjects(source).filter(
      (o): o is MdtStroke => o.kind === 'stroke' && o.isArrow,
    )
    const match = arrows.find((a) => Math.abs(arrowAngle(a.points) - expected) < 0.002)
    expect(match, `no arrow reproduced ${expected}`).toBeDefined()
  })

  it('is not symmetric: reversing an arrow turns it around', () => {
    const forward = arrowAngle([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
    const backward = arrowAngle([
      { x: 100, y: 0 },
      { x: 0, y: 0 },
    ])
    expect(Math.abs(Math.abs(forward - backward) - Math.PI)).toBeLessThan 1e-9
  })
})

describe('objectsToLua — synthesising', () => {
  it('writes a created note the way MDT writes one: two keys, numbers, shown', () => {
    const note: MdtNote = { kind: 'note', at: toPixels(700, -480), sublevel: 1, text: 'kick this' }
    const out = objectsToLua(undefined, [note])
    const obj = asTable(out.get(1))!
    expect([...obj.keys()].sort()).toEqual(['d', 'n'])
    expect(obj.get('n')).toBe(true)
    const d = asTable(obj.get('d'))!
    expect(d.get(1)).toBeCloseTo(700, 6)
    expect(d.get(2)).toBeCloseTo(-480, 6)
    expect(d.get(3)).toBe(1)
    expect(d.get(4)).toBe(true)
    expect(d.get(5)).toBe('kick this')
  })

  it('writes a created stroke’s coordinates as strings at one decimal', () => {
    const stroke: MdtStroke = {
      kind: 'stroke',
      points: [toPixels(100, -200), toPixels(110.26, -205.44)],
      sublevel: 1,
      color: 'ff365c',
      isArrow: false,
      ...MDT_STROKE_DEFAULTS,
    }
    const out = objectsToLua(undefined, [stroke])
    const obj = asTable(out.get(1))!
    const l = asTable(obj.get('l'))!
    expect(l.get(1)).toBe('100.0')
    expect(l.get(2)).toBe('-200.0')
    expect(l.get(3)).toBe('110.3')
    expect(l.get(4)).toBe('-205.4')
    expect(obj.has('t')).toBe(false)
    const d = asTable(obj.get('d'))!
    expect(d.get(2)).toBe(1.1)
    expect(d.get(7)).toBe(true)
  })

  it('gives a created arrow a `t`, and a different lineFactor', () => {
    const arrow: MdtStroke = {
      kind: 'stroke',
      points: [toPixels(0, 0), toPixels(0, -100)],
      sublevel: 1,
      color: 'ff365c',
      isArrow: true,
      ...MDT_ARROW_DEFAULTS,
    }
    const obj = asTable(objectsToLua(undefined, [arrow]).get(1))!
    const t = asTable(obj.get('t'))!
    expect(Number(t.get(1))).toBeCloseTo(arrowAngle(arrow.points), 9)
    expect(asTable(obj.get('d'))!.get(2)).toBe(1)
    // MDT writes no `smooth` key at all on an arrow.
    expect(asTable(obj.get('d'))!.has(7)).toBe(false)
  })

  it('synthesises an entry whose object was modified, and only that entry', () => {
    const source = decodeMdtString(readFixture('real-export-strokes.txt')).table
    const raw = asTable(source.get('objects'))!
    const objects = luaToObjects(source)
    const edited = objects.find((o): o is MdtNote => o.kind === 'note')!
    const changed = objects.map((o) => (o === edited ? { ...edited, text: 'rewritten' } : o))

    const out = objectsToLua(source, changed)
    const emitted = [...out.values()]
    // The edited entry is a new table…
    expect(emitted).not.toContain(raw.get(edited.from!))
    // …and every other one is still the original object.
    for (const o of objects) {
      if (o === edited) continue
      expect(emitted).toContain(raw.get(o.from!))
    }
  })

  it('round-trips a created note back through the reader', () => {
    const note: MdtNote = { kind: 'note', at: toPixels(300, -250), sublevel: 1, text: 'here' }
    const preset: LuaTable = new Map()
    preset.set('objects', objectsToLua(undefined, [note]))
    const [read] = luaToObjects(preset)
    expect(read).toMatchObject({ kind: 'note', sublevel: 1, text: 'here' })
    expect(read.kind === 'note' && read.at.x).toBeCloseTo(note.at.x, 6)
  })
})
```

Import `toPixels` from `../geometry` and `MdtNote` / `MdtStroke` in the test file if they are not
imported already — check the existing imports before adding a duplicate.

**One of these assertions has a syntax error** — `toBeLessThan 1e-9` is missing its parentheses. Fix
it and say so; it is there because this plan's code has not run, which is the point of Step 2.

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run --project app src/lib/mdt/objects.test.ts
```

Expected: the synthesising tests fail with `objectToLua: synthesising an object is not implemented
yet` from Task 1's placeholder, and the `arrowAngle` tests fail on the missing export. Task 1's own
tests still pass — nothing you are about to write may change them.

- [ ] **Step 3: Write the synthesisers**

In `src/lib/mdt/objects.ts`, add the import for the inverse conversion at the top:

```ts
import { toMdtCoords, toPixels, type Point } from '../geometry'
```

Then replace Task 1's `objectToLua` placeholder with:

```ts
/**
 * What MDT itself wrote for a fresh object of each kind, read off
 * `__fixtures__/real-export-strokes.txt`. We copy these rather than choose them: `layer` is `-8`
 * on every object in that export and we do not know what the number means, and a freehand stroke
 * is smoothed by default while an arrow carries no `smooth` key at all.
 */
export const MDT_STROKE_DEFAULTS = { size: 5, smooth: true, layer: -8 }
export const MDT_ARROW_DEFAULTS = { size: 13, smooth: false, layer: -8 }

/**
 * The angle MDT stores in an arrow's `t`, in radians and in MDT's own coordinate space.
 *
 * Derived from the two real arrows in `__fixtures__/real-export-strokes.txt`, whose endpoints and
 * stored angle are both known: it is the direction from the arrow's end back to its start, which
 * agrees with both to within the rounding of coordinates stored at one decimal. Computing it in
 * MDT's space rather than in map pixels matters — `toPixels` flips the Y sign, so the same formula
 * on pixels gives the wrong answer.
 */
export function arrowAngle(points: Point[]): number {
  const from = toMdtCoords(points[0].x, points[0].y)
  const to = toMdtCoords(points[points.length - 1].x, points[points.length - 1].y)
  return Math.atan2(from.y - to.y, from.x - to.x)
}

/** A note: two keys and nothing else, with full-precision coordinates. MDT's shape, not ours. */
function noteToLua(note: MdtNote): LuaTable {
  const at = toMdtCoords(note.at.x, note.at.y)
  const d: LuaTable = new Map()
  d.set(1, at.x)
  d.set(2, at.y)
  d.set(3, note.sublevel)
  d.set(4, true)
  d.set(5, note.text)

  const obj: LuaTable = new Map()
  obj.set('n', true)
  obj.set('d', d)
  return obj
}

function strokeToLua(stroke: MdtStroke): LuaTable {
  const d: LuaTable = new Map()
  d.set(1, stroke.size)
  // `d[2]` is MDT's `lineFactor`. We do not know what it does; these are the values the game wrote
  // for each kind, so a stroke we create looks to MDT like one it made itself.
  d.set(2, stroke.isArrow ? 1 : 1.1)
  d.set(3, stroke.sublevel)
  d.set(4, true)
  d.set(5, stroke.color)
  d.set(6, stroke.layer)
  // An arrow carries no `smooth` key in MDT's own output, so absent is not the same as false here.
  if (stroke.smooth) d.set(7, true)

  const l: LuaTable = new Map()
  let i = 1
  for (const p of stroke.points) {
    const m = toMdtCoords(p.x, p.y)
    // Strings at one decimal: what the game writes in `l`, and unlike a note, which stores its
    // position as a full-precision number. The asymmetry is MDT's.
    l.set(i++, m.x.toFixed(1))
    l.set(i++, m.y.toFixed(1))
  }

  const obj: LuaTable = new Map()
  obj.set('d', d)
  obj.set('l', l)
  if (stroke.isArrow) {
    const t: LuaTable = new Map()
    t.set(1, arrowAngle(stroke.points))
    obj.set('t', t)
  }
  return obj
}

function objectToLua(object: MdtObject): LuaTable {
  return object.kind === 'note' ? noteToLua(object) : strokeToLua(object)
}
```

`toPixels` may already be imported without `toMdtCoords` — extend the existing import rather than
adding a second one from the same module.

- [ ] **Step 4: Run them and watch them pass**

```bash
npx vitest run --project app src/lib/mdt/objects.test.ts
npm test
npm run typecheck
```

If an arrow angle is out by more than the tolerance, **do not widen the tolerance**: print
`arrowAngle(a.points)` beside the expected value, work out which term is wrong, and report it. If it
is out by roughly π, the endpoints are the wrong way round.

- [ ] **Step 5: Commit**

```bash
git status --short
git add src/lib/mdt/objects.ts src/lib/mdt/objects.test.ts
git commit
```

Subject: `Write an object back the way MDT wrote it`. Body: the three asymmetries between a note and
a stroke were read off a real export rather than inferred, and the arrow's rotation — which the
reader never reads — was derived from two real arrows, so the test fails if we drift from MDT rather
than merely from ourselves.

---

## Task 3: `routeToLua` uses the encoder, and the guard gets stricter

**Files:**
- Modify: `src/lib/mdt/route.ts` (`routeToLua`, around line 151)
- Modify: `src/lib/mdt/codec.test.ts` (`describe('MDT route')`, around line 168)

**Interfaces:**
- Consumes: `objectsToLua` from Tasks 1–2.

This is the task that ends the old invariant. It is small, and it is the one to be careful in.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/mdt/codec.test.ts`, inside the existing `describe('MDT route')` block. Read the
neighbouring test `'preserves the preset fields it does not understand on re-export'` first and
build on its idiom — it already clones a preset and adds extra keys.

```ts
  it('still hands back an objects table it was not asked to change', () => {
    // The guard that mattered before objects were editable, and still has to hold: importing and
    // re-exporting without touching anything must not rewrite a single object.
    const preset = decodeMdtString(readFixture('real-export-strokes.txt')).table
    const before = preset.get('objects')
    const out = routeToLua(luaToRoute(preset))
    expect(out.get('objects')).toEqual(before)
  })

  it('drops an object the route no longer holds', () => {
    const preset = decodeMdtString(readFixture('real-export-strokes.txt')).table
    const route = luaToRoute(preset)
    const kept = route.objects.filter((o) => o.kind !== 'note')
    const out = routeToLua({ ...route, objects: kept })
    const emitted = asTable(out.get('objects'))!
    expect(emitted.size).toBe(kept.length)
    expect(luaToObjects(out).some((o) => o.kind === 'note')).toBe(false)
  })

  it('carries an object the app created into the exported table', () => {
    const preset = decodeMdtString(readFixture('real-export-strokes.txt')).table
    const route = luaToRoute(preset)
    const added: MdtNote = { kind: 'note', at: toPixels(500, -400), sublevel: 1, text: 'new' }
    const out = routeToLua({ ...route, objects: [...route.objects, added] })
    expect(luaToObjects(out).some((o) => o.kind === 'note' && o.text === 'new')).toBe(true)
  })
```

Check `codec.test.ts`'s existing imports and its fixture helper before adding any — it already reads
`real-export.txt`, and the `real-export-strokes.txt` fixture may be loaded through the same helper
or not loaded there at all. If the file has no helper, follow `objects.test.ts`'s, including its
skip-if-absent behaviour.

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run --project app src/lib/mdt/codec.test.ts
```

Expected: the deletion and creation tests fail — today `objects` rides through untouched, so a
removed object comes back. **The first test should already pass**, because pass-through happens to
satisfy it. That is fine and is the point: it is a guard, not a new feature, and it must go on
passing after Step 3.

- [ ] **Step 3: Call the encoder**

In `src/lib/mdt/route.ts`, add to the imports at the top:

```ts
import { objectsToLua } from './objects'
```

In `routeToLua`, after `table.set('value', value)` and before the `colorPaletteInfo` block, add:

```ts
  // The objects are no longer passed through: they are rebuilt, entry by entry, from where each
  // one came from. `objectsToLua` re-emits an entry this app did not edit byte for byte, which is
  // what keeps a preset we merely read indistinguishable from the one we were handed.
  if (route.source || route.objects.length > 0) {
    table.set('objects', objectsToLua(route.source, route.objects))
  }
```

The guard matters: a route with neither a source nor objects must not gain an empty `objects` key it
never had. Check what `luaToRoute` does for a preset with no `objects` at all before trusting that
sentence, and say what you found.

Then update the doc comment on `Route.objects` (`route.ts:41-47`), which currently says "Read out of
`source` and never written back". It is now false. Replace it with what is true — that an unedited
object is re-emitted from its original entry and only an edited one is rebuilt — and point at the
design document rather than restating its argument.

The same claim appears in the file's header comment (`objects.ts:1-2`, "Read-only, so a re-export
still hands the game back its own table untouched") and possibly in `route.ts`'s header. Grep for it
and fix every copy. **A comment that is now actively false is the one kind you are required to
change.**

- [ ] **Step 4: Run everything**

```bash
npx vitest run --project app src/lib/mdt/codec.test.ts
npm test
npm run typecheck
npm run build
```

All green, no skips. The `'In-game compatibility'` block in `codec.test.ts` re-encodes
`real-export.txt` byte for byte — **if that one breaks, stop.** It means the encoder is rewriting
entries it should have passed through, and no amount of adjusting the test is the right answer.

- [ ] **Step 5: Commit**

```bash
git status --short
git add src/lib/mdt/route.ts src/lib/mdt/codec.test.ts src/lib/mdt/objects.ts
git commit
```

Subject: `Rebuild the preset's objects instead of passing them through`. Body: why the old invariant
had to end — an object the user deletes has to stop being exported — and what replaces it: an entry
this app did not edit is re-emitted byte for byte, which is the narrower promise the extended guard
in `codec.test.ts` now holds us to.

---

## Task 4: The document learns about objects, lazily

**Files:**
- Modify: `src/lib/mdt/useRouteDoc.ts`
- Modify: `src/lib/mdt/useRouteDoc.test.tsx`

**Interfaces:**
- Consumes: `MdtObject`, `MdtNote`, `MdtStroke` from `./objects`.
- Produces, added to `RouteActions`:
  ```ts
  /** Places an object. Adopts the preset's objects into the document first, if it has not happened yet. */
  addObject(object: MdtObject): void
  /** Replaces one object by identity. */
  updateObject(id: string, object: MdtObject): void
  removeObject(id: string): void
  ```
  and, exported for Task 5 and for plan 2:
  ```ts
  /** The transaction origin every object edit carries, so undo can be scoped to them. */
  export const OBJECT_EDIT = 'object-edit'
  ```

**The design's decision 1, restated because it is the whole task:** the `objects` key is **absent
until the first edit**. While absent, `Route.objects` stays derived from `source` exactly as today
(`useRouteDoc.ts:138`). The first edit adopts — materialises everything `luaToObjects(source)`
produced — and then applies itself, in one transaction.

**Identity.** Each stored object carries an `id`, `` `${clientID}:${n}` `` with `n` a counter local to
the session. There is no id generator anywhere in `src/` today; this one is deterministic and needs
no stub, unlike `crypto.randomUUID`.

`id` goes on `MdtObject` itself, beside `from`, as a second optional field:

```ts
  /** Set once the object is stored in the document. Bookkeeping: the encoder never reads it. */
  id?: string
```

Consumers keep taking `MdtObject[]` unchanged, selection in plan 2 has something stable to hold, and
the encoder cannot leak it because `objectToLua` and `sameObject` only ever read MDT's own fields.
The alternative — a parallel `objectIds: string[]` on `Route`, or a wrapper type — either keeps two
arrays in step or rewrites every consumer, and `from` already establishes that this model carries a
field MDT never sees.

An object still derived from `source`, before any adoption, has no `id`. That is correct: nothing can
select it, because nothing can edit it without adopting first.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/mdt/useRouteDoc.test.tsx`, using that file's own harness — read how it creates a doc
and calls actions before writing anything, and reuse it rather than building a second one.

```tsx
describe('Objects in the document', () => {
  const strokesPreset = () => readFixture('real-export-strokes.txt')

  it('does not touch the document until something is edited', () => {
    const { result } = mountRouteDoc()
    act(() => void result.current.actions.importRoute(strokesPreset()))
    // Eleven objects are visible, and none of them is stored: they are still derived from `source`.
    expect(result.current.route.objects.length).toBeGreaterThan(0)
    expect(result.current.doc.getMap('route').get('objects')).toBeUndefined()
  })

  it('adopts the preset’s objects on the first edit, then adds', () => {
    const { result } = mountRouteDoc()
    act(() => void result.current.actions.importRoute(strokesPreset()))
    const before = result.current.route.objects.length

    act(() =>
      result.current.actions.addObject({
        kind: 'note',
        at: { x: 10, y: 20 },
        sublevel: 1,
        text: 'mine',
      }),
    )

    const stored = result.current.doc.getMap('route').get('objects') as Y.Array<unknown>
    expect(stored.length).toBe(before + 1)
    expect(result.current.route.objects.length).toBe(before + 1)
    expect(result.current.route.objects.some((o) => o.kind === 'note' && o.text === 'mine')).toBe(true)
  })

  it('keeps provenance through adoption, so an untouched object still exports verbatim', () => {
    const { result } = mountRouteDoc()
    act(() => void result.current.actions.importRoute(strokesPreset()))
    act(() =>
      result.current.actions.addObject({ kind: 'note', at: { x: 1, y: 2 }, sublevel: 1, text: 'x' }),
    )
    const adopted = result.current.route.objects.filter((o) => o.from != null)
    expect(adopted.length).toBeGreaterThan(0)
    const out = routeToLua(result.current.route)
    const original = asTable(result.current.route.source!.get('objects'))!
    for (const o of adopted) {
      expect([...asTable(out.get('objects'))!.values()]).toContain(original.get(o.from!))
    }
  })

  it('removes an object, and the export stops carrying it', () => {
    const { result } = mountRouteDoc()
    act(() => void result.current.actions.importRoute(strokesPreset()))
    // Adopting is what gives an object its id, so edit once before reaching for one.
    act(() => result.current.actions.addObject({ kind: 'note', at: { x: 9, y: 9 }, sublevel: 1, text: 'seed' }))
    const target = result.current.route.objects.find((o) => o.kind === 'note' && o.text !== 'seed')!

    act(() => result.current.actions.removeObject(target.id!))

    expect(result.current.route.objects).not.toContain(target)
    const exported = luaToObjects(routeToLua(result.current.route))
    expect(exported.some((o) => o.kind === 'note' && o.text === target.text)).toBe(false)
  })

  it('replicates an object to a peer', () => {
    const { a, b } = twoConnectedDocs()
    act(() => void a.actions.importRoute(strokesPreset()))
    act(() =>
      a.actions.addObject({ kind: 'note', at: { x: 5, y: 5 }, sublevel: 1, text: 'shared' }),
    )
    expect(b.route.objects.some((o) => o.kind === 'note' && o.text === 'shared')).toBe(true)
  })
})
```

`mountRouteDoc`, `twoConnectedDocs` and `readFixture` are stand-ins for whatever this file already
has, and `result.current.doc` assumes the hook exposes the document — which it may not. **Read the
file first and use its real helpers and its real accessors.** Its collaboration tests already reach
a second peer somehow; follow that. If the hook does not expose the doc, assert on what the hook
does expose — `route.objects` staying derived is observable without touching the document — and say
in your report how you checked the key's absence, since that is the one assertion that genuinely
needs to see inside.

If nothing in the file fits, say so rather than inventing a harness its other tests will not
recognise.

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run --project app src/lib/mdt/useRouteDoc.test.tsx
```

Expected: failures on `actions.addObject` not existing.

- [ ] **Step 3: Store and adopt**

In `src/lib/mdt/useRouteDoc.ts`:

Add the origin constant near the top, beside the other module constants:

```ts
/**
 * The origin every object edit passes to `doc.transact`. Undo is scoped to it, which is how the
 * pull actions — which pass no origin at all — stay outside undo without being touched.
 */
export const OBJECT_EDIT = 'object-edit'
```

Add a helper beside `withPulls` (around line 370), following its shape: it lazily creates the array
and, unlike `withPulls`, seeds it from `source` the first time.

```ts
  /**
   * Runs `fn` against the document's object array, creating it on the first call by adopting
   * everything the preset carried. Adoption is deliberately lazy: a session that never edits an
   * object leaves the document exactly as slices A and B left it, and `readRoute` goes on deriving
   * the objects from `source`.
   */
  const withObjects = (fn: (objects: Y.Array<ObjectMap>) => void) =>
    doc.transact(() => {
      let stored = root.get('objects') as Y.Array<ObjectMap> | undefined
      if (!stored) {
        stored = new Y.Array<ObjectMap>()
        root.set('objects', stored)
        const source = decodeSource(root.get('source') as string | undefined)
        if (source) stored.push(luaToObjects(source).map((o) => storeObject(o, nextObjectId())))
      }
      fn(stored)
    }, OBJECT_EDIT)
```

The four helpers `withObjects` leans on, all module-private:

```ts
/** One object in the document. Y.js stores plain JSON, so the model's own fields go in as they are. */
type ObjectMap = Y.Map<unknown>

/**
 * `${clientID}:${n}`: deterministic, unique across peers because the client id is, and testable
 * without stubbing a random source.
 */
let objectSeq = 0
const nextObjectId = () => `${doc.clientID}:${objectSeq++}`

const storeObject = (object: MdtObject, id: string): ObjectMap => {
  const map: ObjectMap = new Y.Map()
  for (const [key, value] of Object.entries(object)) map.set(key, value)
  map.set('id', id)
  return map
}

/**
 * Reads the array back into the model. Stored flat rather than nested: `kind` is already the
 * discriminant, so a flat map needs no unwrapping and a new field on `MdtObject` needs no change
 * here.
 */
const readObjects = (stored: Y.Array<ObjectMap>): MdtObject[] =>
  stored.toArray().map((map) => Object.fromEntries(map.entries()) as unknown as MdtObject)

const indexOfObject = (objects: Y.Array<ObjectMap>, id: string): number =>
  objects.toArray().findIndex((map) => map.get('id') === id)
```

`nextObjectId` closes over `doc`, so it belongs wherever `doc` is in scope — check where that is
before placing it, and if `doc` is created per-session rather than per-hook, scope the counter the
same way so two sessions cannot mint the same id.

`readObjects` trusts the stored shape. That is deliberate and worth one sentence in your report: the
only writer is `storeObject`, and an object arriving from a peer was written by the same code. If you
would rather validate, say so — but do not add a schema library for it.

`readRoute` (around line 118) gains the branch that makes the whole design work:

```ts
  const stored = root.get('objects') as Y.Array<ObjectMap> | undefined
  const objects = stored ? readObjects(stored) : source ? luaToObjects(source) : []
```

The three actions follow `withPulls`'s callers exactly in shape:

```ts
    addObject: (object) => withObjects((objects) => objects.push([storeObject(object, nextObjectId())])),
    updateObject: (id, object) =>
      withObjects((objects) => {
        const index = indexOfObject(objects, id)
        if (index < 0) return
        // Y.Array has no replace: delete, then reinsert at the same index, as `movePull` does.
        objects.delete(index, 1)
        objects.insert(index, [storeObject(object, id)])
      }),
    removeObject: (id) =>
      withObjects((objects) => {
        const index = indexOfObject(objects, id)
        if (index >= 0) objects.delete(index, 1)
      }),
```

**Note the same wart `movePull` has:** delete-then-reinsert loses a concurrent peer's edit to that
object. It is the existing pattern in this file and matching it is right for now; note it in your
report rather than inventing a different one here.

- [ ] **Step 4: Run them and watch them pass**

```bash
npx vitest run --project app src/lib/mdt/useRouteDoc.test.tsx
npm test
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git status --short
git add src/lib/mdt/useRouteDoc.ts src/lib/mdt/useRouteDoc.test.tsx
git commit
```

Subject: `Let the document hold objects, from the first edit onward`. Body: why adoption is lazy —
a session that never draws must leave the document exactly as it was, so that nothing about import,
export or replication changes for anyone who does not use this.

---

## Task 5: Undo, and only my own

**Files:**
- Modify: `src/lib/mdt/useRouteDoc.ts`
- Modify: `src/lib/mdt/useRouteDoc.test.tsx`

**Interfaces:**
- Consumes: `OBJECT_EDIT` and the object actions from Task 4.
- Produces, added to `RouteActions`:
  ```ts
  undo(): void
  redo(): void
  ```
  and on the hook's return value:
  ```ts
  /** Whether there is anything of this session's own to undo, for a button's disabled state. */
  canUndo: boolean
  canRedo: boolean
  ```

**Why the manager is scoped to the root and not to the objects array** — this is the correction the
design records, and getting it wrong makes the task fail in two directions at once. The array does
not exist until the first edit, so there is nothing to scope to when the hook mounts, and the
transaction that *creates* the key has to be undoable like any other. So: scope `root`, and isolate
by origin. `trackedOrigins` must name `OBJECT_EDIT` **explicitly** — its default is
`new Set([null])`, and a bare `doc.transact(fn)` has a null origin, so the default would capture
every pull change in the file.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('Undoing my own object edits', () => {
  it('takes back the object I just added', () => {
    const { result } = mountRouteDoc()
    act(() => result.current.actions.addObject({ kind: 'note', at: { x: 1, y: 1 }, sublevel: 1, text: 'oops' }))
    expect(result.current.canUndo).toBe(true)

    act(() => result.current.actions.undo())

    expect(result.current.route.objects.some((o) => o.kind === 'note' && o.text === 'oops')).toBe(false)
  })

  it('undoing the very first edit gives back the derived state', () => {
    const { result } = mountRouteDoc()
    act(() => void result.current.actions.importRoute(readFixture('real-export-strokes.txt')))
    const derived = result.current.route.objects.length

    act(() => result.current.actions.addObject({ kind: 'note', at: { x: 1, y: 1 }, sublevel: 1, text: 'x' }))
    act(() => result.current.actions.undo())

    // The adoption went with it: the key is gone and the objects are derived from `source` again.
    expect(result.current.doc.getMap('route').get('objects')).toBeUndefined()
    expect(result.current.route.objects.length).toBe(derived)
  })

  it('redoes what it undid', () => {
    const { result } = mountRouteDoc()
    act(() => result.current.actions.addObject({ kind: 'note', at: { x: 2, y: 2 }, sublevel: 1, text: 'back' }))
    act(() => result.current.actions.undo())
    act(() => result.current.actions.redo())
    expect(result.current.route.objects.some((o) => o.kind === 'note' && o.text === 'back')).toBe(true)
  })

  it('does not undo a pull change, which carries no origin', () => {
    const { result } = mountRouteDoc()
    act(() => result.current.actions.addPull())
    const pulls = result.current.route.pulls.length
    // Nothing of ours has happened, so there is nothing to undo…
    expect(result.current.canUndo).toBe(false)
    act(() => result.current.actions.undo())
    // …and calling it anyway leaves the pulls alone.
    expect(result.current.route.pulls.length).toBe(pulls)
  })

  it('does not undo a peer’s object', () => {
    const { a, b } = twoConnectedDocs()
    act(() => b.actions.addObject({ kind: 'note', at: { x: 3, y: 3 }, sublevel: 1, text: 'theirs' }))
    expect(a.route.objects.some((o) => o.kind === 'note' && o.text === 'theirs')).toBe(true)

    act(() => a.actions.undo())

    expect(a.route.objects.some((o) => o.kind === 'note' && o.text === 'theirs')).toBe(true)
  })
})
```

The last test is the one worth watching fail for the right reason. A `Y.UndoManager` filters by
origin, and a change arriving from a peer comes in with the provider as its origin, not
`OBJECT_EDIT` — so it should already be excluded. **Confirm it fails before the manager exists and
passes after, rather than passing vacuously in both states**: with no `undo` at all it fails on the
missing action, which is not the same as being exercised. After Step 3, break `trackedOrigins`
deliberately — widen it to include `null` — and check this test or the pull test goes red. Restore
it, and report what you saw.

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run --project app src/lib/mdt/useRouteDoc.test.tsx
```

- [ ] **Step 3: Add the manager**

In `src/lib/mdt/useRouteDoc.ts`, where the doc and root are set up:

```ts
  /**
   * Undo covers this session's object edits and nothing else.
   *
   * Scoped to `root` rather than to the object array: the array does not exist until the first
   * edit, so there would be nothing to scope to here, and the transaction that creates it has to
   * be undoable like any other. Isolation comes from the origin instead — `trackedOrigins` names
   * `OBJECT_EDIT` explicitly because the default, `new Set([null])`, would capture every pull
   * change, since a bare `doc.transact(fn)` has a null origin.
   */
  const undoManager = useMemo(
    () => new Y.UndoManager(root, { trackedOrigins: new Set([OBJECT_EDIT]) }),
    [root],
  )
```

Expose the two actions and the two flags. The flags need to re-render when the stacks change, so
subscribe:

```ts
  const [undoState, setUndoState] = useState({ canUndo: false, canRedo: false })
  useEffect(() => {
    const sync = () =>
      setUndoState({
        canUndo: undoManager.undoStack.length > 0,
        canRedo: undoManager.redoStack.length > 0,
      })
    undoManager.on('stack-item-added', sync)
    undoManager.on('stack-item-popped', sync)
    sync()
    return () => {
      undoManager.off('stack-item-added', sync)
      undoManager.off('stack-item-popped', sync)
      undoManager.destroy()
    }
  }, [undoManager])
```

**Check the event names against the installed yjs** before trusting them — `node -e "const Y =
require('yjs'); console.log(Object.keys(new Y.UndoManager(new Y.Doc().getMap('x'))))"` will not list
events, so read `node_modules/yjs/dist/src/utils/UndoManager.d.ts` instead. Say in your report what
the file actually declares.

`destroy()` in the cleanup matters: the manager holds a listener on the doc, and this hook already
tears providers down carefully (`useRouteDoc.ts:268-275`) for exactly this class of reason.

- [ ] **Step 4: Run them and watch them pass, then break the isolation on purpose**

```bash
npx vitest run --project app src/lib/mdt/useRouteDoc.test.tsx
```

Then temporarily change `trackedOrigins` to `new Set([OBJECT_EDIT, null])`, re-run, and confirm the
pull test goes red. Restore it and re-run. Report both outcomes — a test that cannot fail is not
protecting the origin filter, and this branch has shipped one of those before.

```bash
npm test
npm run typecheck
npm run build
```

- [ ] **Step 5: Commit**

```bash
git status --short
git add src/lib/mdt/useRouteDoc.ts src/lib/mdt/useRouteDoc.test.tsx
git commit
```

Subject: `Undo my own object edits, and nobody else's`. Body: why the manager is scoped to the
document root rather than the object array — the array does not exist before the first edit, and the
transaction that creates it must be undoable — and why the origin set is named explicitly rather
than left to its default.

---

## Verification, once the tasks are done

- `npm test` green, no skips. `npm run typecheck` and `npm run build` clean.
- **`codec.test.ts`'s `'In-game compatibility'` block still re-encodes `real-export.txt` byte for
  byte.** This is the single most important line of this plan: it is what says the encoder does not
  touch what it was not asked to.
- `git diff main --stat` touches no file outside the file map above. In particular nothing under
  `src/components/` moves — this plan has no visual surface, and plan 2 is where the toolbar and the
  gestures land.
- Nothing is user-reachable yet. That is expected: there is no way to call `addObject` from the UI
  until plan 2.

## What plan 2 will need from this one

- `addObject`, `updateObject`, `removeObject`, `undo`, `redo`, `canUndo`, `canRedo` on `actions`.
- `OBJECT_EDIT`, exported, for anything else that has to edit inside the same origin.
- `MDT_STROKE_DEFAULTS` and `MDT_ARROW_DEFAULTS`, so the toolbar does not re-derive what MDT writes.
- `arrowAngle`, if the live preview wants to draw the arrowhead the same way the export will.
- Whatever you chose for object identity in Task 4 — plan 2's selection is built on it, so say so
  plainly in that task's report.
