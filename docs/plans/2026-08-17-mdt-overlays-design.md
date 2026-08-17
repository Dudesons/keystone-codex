# Reading a whole MDT preset — design

**Goal:** a route imported from Mythic Dungeon Tools shows on our map everything MDT shows on
its own — the notes and the drawn strokes the author left, plus the dungeon's usable items —
instead of only its pulls.

**Why now:** we already carry all of it. `Route.source` keeps the original preset table so a
re-export hands the game back what we cannot edit, and a probe against
`src/lib/mdt/__fixtures__/real-export.txt` — an export actually produced by the game — found
**five note objects in it**, at the shape the addon documents:

```json
{"d":[72.2, -236.5, 1, true, "Lust, a lot of kicks to do"], "n":true}
```

The dungeon's items are extracted too: `Dungeon.pois` is populated and typed `unknown[]`,
which is why nobody noticed it holds the wrong shape (see decision 1). So this slice reads
data we own and throws nothing away — it stops discarding it at the last step.

## Scope: this is slice A of three

The request that started this — "support more MDT features in the route editor" — is three
independent projects, not one feature. This spec covers **A only**.

| | What | Depends on |
| --- | --- | --- |
| **A — read the whole preset** | show notes, strokes and items on the map, read-only | nothing |
| **B — hover intelligence** | forces %, efficiency score, the mob's codex beside the map | nothing |
| **C — edit** | left-hand toolbar, drawing and notes, undo, Y.js replication, re-export | **A** |

B shares no code with A and C; it is deferred only to keep one spec to one subject. C is the
one that breaks an existing invariant — writing `objects` back into the preset — and gets its
own design once we can draw on screen at all. Appendix A records what was learnt about B
while researching this, so B's spec does not re-derive it.

## The decisions

### 1. Fix how POIs are extracted, first

`mapPOIs` is indexed **by sublevel, then by POI**. `parseDungeon` does

```js
pois: intEntries(pois).map(([, poi]) => poi)
```

which yields a one-element list holding the sublevel's table, not a list of POIs. The
generated files show it plainly: `murder-row.json` has `pois: [{"1":{…},"2":{…}}]`. Flatten
it, and carry the sublevel down from the key it lives in, since the POI entries do not hold
one:

```js
pois: intEntries(pois).flatMap(([sublevel, list]) =>
  intEntries(list).map(([, poi]) => ({ ...poi, sublevel })),
)
```

An unrecognised `type` is **kept and reported** through `onWarn`, the way
`normaliseCharacteristics` already reports unknown crowd-control flags: it will not render,
but it will not vanish silently when a season adds one.

`src/lib/types.ts` gains `Poi` — `type: string`, `x`, `y`, `sublevel`, `sizeMult?`,
`info?: { texture: number; spellId: number; size: number }` — and `Dungeon.pois` stops being
`unknown[]`. `type` stays a `string` rather than a union of the two values seen today: a union
would make the extraction's own pass-through unrepresentable.

This is an extraction change, so the eight dungeon files are regenerated and **committed**. CI
runs no extraction script.

What is actually there, across the season pool:

| Dungeon | POIs | Types |
| --- | --- | --- |
| Murder Row | 11 | 1 `dungeonEntrance`, 10 `genericItem` |
| The Blinding Vale | 2 | 1 `dungeonEntrance`, 1 `genericItem` |
| The other six | 0 | `mapPOIs` is empty |

### 2. Item labels ride the existing spell chain

A POI's `info.texture` is a Blizzard file ID, useless outside the client. Its `info.spellId`
is not: the eleven items resolve to **seven unique spells**, and `fetch-assets.mjs` already
turns a spell ID into a name, a description and a downloaded icon, per configured locale.

The set it builds (`fetch-assets.mjs:116`) only walks `enemies`; POI spell IDs get added to
it. Nothing new in the app: `getSpell(id, locale)` already serves the result.

### 3. A pure module holds the object model, and only reads

`src/lib/mdt/objects.ts`:

```ts
export type MdtObject =
  | { kind: 'note'; at: Point; sublevel: number; text: string }
  | { kind: 'stroke'; points: Point[]; sublevel: number; color: string;
      size: number; smooth: boolean; layer: number; isArrow: boolean }

export function luaToObjects(preset: LuaTable): MdtObject[]
```

The contract is the addon's, quoted from `Modules/PresetObjects.lua:174`:

```
d: size, lineFactor, sublevel, shown, colorstring, drawLayer, [smooth]
l: x1,y1,x2,y2,…
t: triangle rotation
n: true    →  the object is a note, and d = { x, y, sublevel, shown, text }
```

Points come out already in map pixels through `toPixels`: the module renders nothing but
speaks the renderer's language, and no component ever sees MDT's inverted Y axis.

`luaToRoute` fills a read-only `Route.objects`; `readRoute` in `useRouteDoc` does the same
from the `source` it already decodes and caches. **`routeToLua` is not touched.** The objects
leave in the exported string because they never left `source`, so the invariant — we rewrite
`value.pulls` and nothing else — holds unchanged, and the Y.js document does not move a line:
the objects are already replicated to peers inside `source`.

Four rules inside the module:

- **`shown === false` is filtered out.** That flag is what `PresetObjectStepBack` sets when the
  author undoes a stroke; the object stays in the preset in case they redo it. Drawing it would
  show what someone erased.
- **`drawLayer` (`d[6]`) is honoured.** Strokes are sorted by it before rendering.
  `Array.prototype.sort` has been stable since ES2019, so equal layers keep their insertion
  order — which is MDT's own stacking, since `StorePresetObject` maintains that order. A stroke
  with no `d[6]` counts as `0`, which is what Blizzard does with a nil `layerSublevel`. Notes
  carry no `drawLayer` at all (their `d` ends at the text), so the sort orders strokes only —
  notes live in their own layer anyway (decision 4).
- **The arrow's direction is recomputed, not read.** MDT stores
  `atan2(starty - y, startx - x)` in a frame whose Y axis points up; ours points down, and
  transposing that angle is sign-juggling verifiable only by eye. The angle is redundant — it
  re-derives from the last two points, already converted. `t` therefore survives as the flag
  `isArrow`, and the direction comes from the geometry.
- **An unreadable object is skipped, never fatal.** Same law as "a mob with no `.md` entry
  still renders": a route must not stop displaying because one object is odd.

### 4. Three render layers, three files

`DungeonMap.tsx` is 589 lines already. It mounts the layers and holds the hover state; nothing
else in it moves. No opportunistic refactor.

**`ObjectLayer`** — inside the existing transformed `<svg>`. One `<polyline>` per stroke:
`stroke={color}`, `strokeWidth = size * 0.3 * MAP_SCALE` (the `0.3` is MDT's own factor),
`fill="none"`, pointer-events off. MDT's `smooth` draws a circle at every joint, which in SVG
is exactly `strokeLinecap`/`strokeLinejoin: round` — an equivalence, not an approximation. An
arrow gets a `<polygon>` head at its last point, oriented by the last segment.

**`PoiLayer`** — in the same `<svg>`, the way blips are: the spell icon in a disc sized from
`info.size`, hover opening the name and description from `getSpell(id, locale)`. A
`dungeonEntrance` has no spell: its own glyph and an i18n label. The hover panel reuses
`CloneTooltip`'s slot at the map's top-left — one hover slot, one convention.

**`NoteLayer`** — HTML **above** the transformed layer, on `PeerCursors`'s pattern and for its
reason: placed by `toContainerPoint`, a pin keeps its on-screen size and its text stays legible
at every zoom notch without being re-rasterised. Hover opens the box, a click keeps it open, a
click elsewhere closes it.

`DungeonPage` passes `mode === 'route' ? route.objects : undefined`. POIs come from
`lookup.dungeon.pois` and do not depend on the mode: an item exists whether or not anyone has
imported a route. No layer toggle — if a crowded route turns out to be unreadable, C adds the
toggles along with the editing toolbar.

New i18n keys go into **both** `en.ts` and `fr.ts`; `fr.ts` is typed against `en.ts`, so
`tsc -b` is the completeness check.

## Tests

| Level | Covered | Against |
| --- | --- | --- |
| Unit (node) | `luaToObjects`: the five notes, their coordinates and text; the `shown` filter; the stable `drawLayer` sort; a malformed object skipped | `src/lib/mdt/__fixtures__/real-export.txt`, the real in-game export |
| Unit (node) | POIs flattened with their sublevel; an unknown type kept and reported | `scripts/__fixtures__/MurderRow.lua`, copied from the addon (52 KB, against 34 for the existing fixture) — the only season dungeon carrying real POIs |
| Component (jsdom) | a stroke with its colour and width; one pin per note and its text on hover; an item icon and its tooltip | the real dungeon pool, as the existing component tests do |
| Integration (jsdom) | strokes visible in Route mode only, items in both tabs | `DungeonPage` |

### The gap, stated rather than filled

**The fixture we have contains no stroke object.** Until a real export carrying drawn lines and
an arrow exists in `__fixtures__`, `luaToObjects` is tested against real data for notes only.

A stroke table will not be hand-written to close it: that would test our idea of the input,
which is the failure mode the repository's own test rules name. Closing it needs five minutes
in the game — draw a few lines, an arrow and a note in MDT, export, commit the string — and
the stroke tests land with it.

Also worth knowing: `sublevelCount` is 1 for all eight season dungeons, so the sublevel filter
is written but exercised by no dungeon we ship today.

## Out of scope

- Creating, moving or deleting notes and strokes — slice C.
- The left-hand editing toolbar — slice C.
- Writing `objects` into the exported preset — slice C, and the one thing here that will touch
  the round-trip invariant.
- Forces percentage, efficiency score, codex on hover — slice B.
- Multi-floor dungeons: `sublevelCount > 1` still warns at extraction and renders one floor.

## Appendix A — what slice B will need, found on the way

MDT's efficiency score, from `Modules/DungeonEnemies.lua:515`:

```lua
local totalCount = MDT.dungeonTotalCount[db.currentDungeonIdx].normal
local score = 2.5 * (count / totalCount) * 13000 / (health / 20000)
```

`health` is the creature's **base** health — `Enemy.health`, which we already extract — not the
value scaled to a key level; `totalCount` is `Dungeon.totalCount`. The colour MDT prints it in
is `RGBToHex(max(0, min(1, 2 * (1 - v))), min(1, 2 * v), 0)` with `v = score / 10`: a red-to-green
ramp saturating at a score of 10. Nothing has to be regenerated for B.
