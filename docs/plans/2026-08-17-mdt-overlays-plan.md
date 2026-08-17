# Reading a whole MDT preset — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** an imported MDT route shows its author's notes and strokes on our map, and every
dungeon shows its usable items — read-only, nothing new is created or written back.

**Architecture:** a pure module reads the preset's `objects` table into a discriminated union
already expressed in map pixels; three render layers consume it and the dungeon's typed
`pois`. `routeToLua` is not touched, so the objects still leave inside `Route.source` and the
round-trip invariant holds untouched.

**Tech Stack:** React 19, Vite 6, Tailwind 4, TypeScript 5.7, Vitest 3.2.7 (projects `app` in
node and jsdom, `relay` in workerd), Testing Library 16, Y.js 13.6. Extraction scripts are
plain `.mjs` run by Node.

**Spec:** [`docs/plans/2026-08-17-mdt-overlays-design.md`](2026-08-17-mdt-overlays-design.md)

## Global Constraints

- **English** for code, comments, commit messages and documentation. Interface text is never
  literal: it goes through `t()` with a key added to **both** `src/lib/i18n/en.ts` and
  `src/lib/i18n/fr.ts`.
- `fr.ts` is typed against `en.ts`, so `tsc -b` is the completeness check. **Do not** write a
  test comparing key sets.
- **No test may touch the network or need a WoW install.** CI has neither, and runs no
  extraction script.
- **`node` and `npm` are not on the Bash tool's PATH** on this machine. Prefix every command
  with `export PATH="/c/Program Files/nodejs:$PATH"`.
- **`rm` is denied** by the permission layer. Overwrite with the Write tool, or
  `node -e "require('fs').unlinkSync('…')"` when a file must truly go.
- **Another session holds ~260 dirty files** under `content/**` and in a few `src/` files.
  Stage only the paths a task names — never `git add -A`, never `git commit -a`.
- **MDT indices are sparse and must never be renumbered** (`intEntries` sorts without
  compacting). Routes reference those exact indices.
- **`--no-verify` and every other hook-bypassing git flag are forbidden.**
- Component test files carry `// @vitest-environment jsdom` at the top, declare their own
  `afterEach(cleanup)` (Testing Library runs without `globals: true`), and mount through
  `renderEn` / `renderFr` from `src/test/render.tsx`. jsdom implements neither
  `ResizeObserver` nor `scrollIntoView`: stub what the mounted component needs, as
  `DungeonMap.test.tsx` and `CodexPanel.test.tsx` already do.
- **A mob, a POI or an object we cannot read still leaves the app standing.** Skip it; never
  throw from a render path.

---

## File map

| File | Responsibility | Task |
| --- | --- | --- |
| `scripts/mdt-dungeon.mjs` | gains `POI_TYPES` and `normalisePois`; `parseDungeon` uses it | 1 |
| `src/lib/types.ts` | gains `Poi`; `Dungeon.pois` stops being `unknown[]`; `Route.objects` | 1, 3 |
| `scripts/spell-ids.mjs` | **new** — the pure "which spells do we need" rule, testable apart from the fetching | 2 |
| `scripts/fetch-assets.mjs` | calls it instead of walking `enemies` inline | 2 |
| `src/lib/mdt/objects.ts` | **new** — reads `preset.objects` into `MdtObject[]`, in map pixels | 3, 6 |
| `src/lib/mdt/route.ts` | `luaToRoute` fills `Route.objects`; `routeToLua` **unchanged** | 3 |
| `src/lib/mdt/useRouteDoc.ts` | `readRoute` fills `objects` from the decoded `source` | 3 |
| `src/components/map/PoiLayer.tsx` | **new** — item markers inside the transformed `<svg>`, plus `PoiTooltip` | 4 |
| `src/components/map/NoteLayer.tsx` | **new** — note pins in HTML above the transformed layer | 5 |
| `src/components/map/ObjectLayer.tsx` | **new** — strokes and arrow heads inside the `<svg>` | 6 |
| `src/components/map/DungeonMap.tsx` | mounts the layers, holds their hover state; nothing else moves | 4, 5, 6 |
| `src/routes/DungeonPage.tsx` | passes `route.objects` in Route mode only | 5 |

---

## Task 1: Type the POIs and flatten them

`mapPOIs` is indexed by sublevel and then by POI, and `parseDungeon` stores
`intEntries(pois).map(([, poi]) => poi)` — a one-element list holding the sublevel's table.
`murder-row.json` shows it: `"pois": [{"1":{…},"2":{…}}]`.

**Files:**
- Modify: `scripts/mdt-dungeon.mjs` (add `POI_TYPES` next to `DISPEL_FLAGS`, add
  `normalisePois`, change the `pois:` line in `parseDungeon`)
- Modify: `src/lib/types.ts:47-60` (add `Poi`, retype `Dungeon.pois`)
- Test: `scripts/mdt-dungeon.test.mjs`

**Interfaces:**
- Consumes: `intEntries(table)` and `unwrap(value)`, both already exported from
  `mdt-dungeon.mjs`.
- Produces:
  ```js
  export const POI_TYPES = ['genericItem', 'dungeonEntrance']
  export function normalisePois(mapPOIs, onWarn = console.warn) // → Poi[]
  ```
  and the TypeScript shape every later task reads:
  ```ts
  export interface Poi {
    type: string
    x: number
    y: number
    sublevel: number
    sizeMult?: number
    info?: { texture: number; spellId: number; size: number }
  }
  ```

- [ ] **Step 1: Write the failing test**

Append to `scripts/mdt-dungeon.test.mjs`, and add `normalisePois` and `POI_TYPES` to the
import block at the top of that file.

The Lua below is Murder Row's `mapPOIs` assignment **copied verbatim** from
`<MDT_PATH>/Midnight/MurderRow.lua` — the only season dungeon that carries POIs. Do not tidy
it: its value is that we did not write it.

```js
/**
 * Murder Row's `mapPOIs`, verbatim. Altar of Fangs — the file fixture — declares
 * `MDT.mapPOIs[dungeonIndex] = {}`, so the only real POI data in the season lives here.
 */
const POIS_LUA = `MDT.mapPOIs[dungeonIndex] = {
  [1] = {
    [1] = {
      ["type"] = "dungeonEntrance",
      ["x"] = 779.77130254431,
      ["y"] = -509.595640162,
      ["sizeMult"] = 1.5,
    },
    [2] = {
      ["type"] = "genericItem",
      ["x"] = 679.39639902037,
      ["y"] = -424.870189594,
      ["info"] = {
        ["texture"] = 236999,
        ["spellId"] = 1223570,
        ["size"] = 15,
      },
    },
    [3] = {
      ["type"] = "genericItem",
      ["x"] = 505.61695608532,
      ["y"] = -387.2334648551,
      ["info"] = {
        ["texture"] = 1003586,
        ["spellId"] = 1270638,
        ["size"] = 10,
      },
    },
  },
};`

describe('POIs', () => {
  const parsed = toPlain(parseAssignment(POIS_LUA, 'mapPOIs'), { arrays: false })

  it('flattens the sublevel index MDT nests them under', () => {
    const pois = normalisePois(parsed, () => {})
    expect(pois).toHaveLength(3)
    expect(pois.every((p) => p.sublevel === 1)).toBe(true)
  })

  it('keeps the entrance and its size multiplier', () => {
    const [entrance] = normalisePois(parsed, () => {})
    expect(entrance.type).toBe('dungeonEntrance')
    expect(entrance.x).toBeCloseTo(779.7713, 3)
    expect(entrance.y).toBeCloseTo(-509.5956, 3)
    expect(entrance.sizeMult).toBe(1.5)
  })

  it('keeps the spell an item points at', () => {
    const item = normalisePois(parsed, () => {})[1]
    expect(item.type).toBe('genericItem')
    expect(item.info).toEqual({ texture: 236999, spellId: 1223570, size: 15 })
  })

  it('keeps an unknown type and reports it', () => {
    // No season file declares an unfamiliar type, so this table is ours: what is under test
    // is our handling of the unknown, which by definition has no real sample.
    const warned = []
    const pois = normalisePois({ 1: { 1: { type: 'riftPortal', x: 1, y: -2 } } }, (w) => warned.push(w))
    expect(pois).toHaveLength(1)
    expect(pois[0].type).toBe('riftPortal')
    expect(warned.join(' ')).toContain('riftPortal')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run scripts/mdt-dungeon.test.mjs --project app
```

Expected: the file fails to collect — `normalisePois is not exported by './mdt-dungeon.mjs'`.

- [ ] **Step 3: Implement it**

In `scripts/mdt-dungeon.mjs`, below `DISPEL_FLAGS`:

```js
/** The POI types the map knows how to draw. An unfamiliar one is kept, and reported. */
export const POI_TYPES = ['genericItem', 'dungeonEntrance']
```

and next to `normaliseClones`:

```js
/**
 * Flattens `mapPOIs`, which MDT indexes by sublevel and then by POI.
 *
 * The sublevel lives in the outer key rather than in the entry, so it is carried down: a POI
 * that lost it could not be matched against the floor being drawn. Reading the entries as one
 * flat list — the old shape — silently stored the sublevel's whole table as a single POI.
 */
export function normalisePois(mapPOIs, onWarn = console.warn) {
  return intEntries(mapPOIs).flatMap(([sublevel, list]) =>
    intEntries(list).map(([, poi]) => {
      const type = unwrap(poi.type)
      if (!POI_TYPES.includes(type)) onWarn(`  ! unknown POI type, add it to POI_TYPES: ${type}`)
      return { ...poi, type, sublevel }
    }),
  )
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run scripts/mdt-dungeon.test.mjs --project app
```

Expected: PASS, and the existing assertions in that file untouched.

- [ ] **Step 5: Wire it into `parseDungeon`**

Replace the last line of the returned object in `parseDungeon`:

```js
    pois: intEntries(pois).map(([, poi]) => poi),
```

with:

```js
    pois: normalisePois(pois, onWarn),
```

- [ ] **Step 6: Type the result**

In `src/lib/types.ts`, above `Dungeon`:

```ts
/**
 * A point of interest MDT draws on the map: a usable item, a dungeon entrance.
 *
 * `sublevel` comes from the key `mapPOIs` nests the entry under, not from the entry itself.
 * `type` stays a `string` rather than a union of the values seen today: the extraction passes
 * an unfamiliar type through on purpose, and a union would make that unrepresentable.
 */
export interface Poi {
  type: string
  x: number
  y: number
  sublevel: number
  /** Entrances draw larger than their nominal size. */
  sizeMult?: number
  /** Items only: `texture` is a Blizzard file id, useless to us; `spellId` is not. */
  info?: { texture: number; spellId: number; size: number }
}
```

and in `Dungeon`, replace `pois: unknown[]` with `pois: Poi[]`.

- [ ] **Step 7: Typecheck**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run typecheck
```

Expected: clean. `pois` had no reader, so retyping it breaks nothing.

- [ ] **Step 8: Regenerate the dungeon files, and read the diff before trusting it**

This needs the WoW install; it is why CI never runs it.

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run extract
```

```bash
export PATH="/c/Program Files/nodejs:$PATH" && git diff --stat src/data/generated/
```

Expected: eight dungeon files touched, and `git diff src/data/generated/murder-row.json`
showing `pois` become a flat list of 11 entries each carrying `"sublevel": 1`. **If any field
other than `pois` moved, stop and report it**: that means MDT was updated since the last
extraction, and an unrelated data change must not ride into this commit.

- [ ] **Step 9: Run the whole suite, then commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
```

```bash
git add scripts/mdt-dungeon.mjs scripts/mdt-dungeon.test.mjs src/lib/types.ts src/data/generated/
```

```bash
git commit -m "Flatten the POIs the extraction was storing one sublevel deep

mapPOIs is indexed by sublevel and then by POI, and parseDungeon read it as
one flat list -- so murder-row.json held a single element containing the
sublevel's whole table instead of eleven POIs. The field is typed unknown[]
and has no reader, which is why nothing ever failed.

The sublevel is carried down from the key it lives in, since the entries do
not hold one, and an unfamiliar type is kept and reported rather than
dropped: a season that adds one should show up in a warning, not vanish."
```

---

## Task 2: Fetch the labels of the spells POIs point at

**Files:**
- Create: `scripts/spell-ids.mjs`
- Create: `scripts/spell-ids.test.mjs`
- Modify: `scripts/fetch-assets.mjs:116`

**Interfaces:**
- Consumes: `Dungeon.enemies[].spells[].id` and `Dungeon.pois[].info.spellId` (Task 1).
- Produces: `collectSpellIds(dungeons) → number[]`, sorted and deduplicated.

**Why its own module:** `fetch-assets.mjs` runs `main()` at import, so importing it runs the
whole job — network included. Pure logic has to move out before it can be tested at all, the
same reason `mdt-dungeon.mjs` and `tile-layout.mjs` exist.

- [ ] **Step 1: Write the failing test**

Create `scripts/spell-ids.test.mjs`:

```js
// ABOUTME: Tests which spells the asset fetch has to resolve: mob spells and POI items.
// ABOUTME: A pure rule, kept apart from fetch-assets.mjs, which runs its job at import.

import { describe, expect, it } from 'vitest'
import { collectSpellIds } from './spell-ids.mjs'

describe('collectSpellIds', () => {
  it('collects the spells of every mob', () => {
    const dungeons = [
      { enemies: [{ spells: [{ id: 300 }, { id: 100 }] }], pois: [] },
      { enemies: [{ spells: [{ id: 200 }] }], pois: [] },
    ]
    expect(collectSpellIds(dungeons)).toEqual([100, 200, 300])
  })

  it('collects the spell a usable item points at', () => {
    const dungeons = [
      { enemies: [], pois: [{ type: 'genericItem', info: { texture: 1, spellId: 1223570, size: 15 } }] },
    ]
    expect(collectSpellIds(dungeons)).toEqual([1223570])
  })

  it('ignores a POI with no spell, such as an entrance', () => {
    const dungeons = [{ enemies: [], pois: [{ type: 'dungeonEntrance', sizeMult: 1.5 }] }]
    expect(collectSpellIds(dungeons)).toEqual([])
  })

  it('counts a spell shared by several items once', () => {
    const dungeons = [
      {
        enemies: [{ spells: [{ id: 1270638 }] }],
        pois: [{ info: { spellId: 1270638 } }, { info: { spellId: 1270638 } }],
      },
    ]
    expect(collectSpellIds(dungeons)).toEqual([1270638])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run scripts/spell-ids.test.mjs --project app
```

Expected: FAIL — `Failed to load ./spell-ids.mjs`.

- [ ] **Step 3: Implement it**

Create `scripts/spell-ids.mjs`:

```js
// ABOUTME: Which spells the asset fetch has to resolve, from the extracted dungeons.
// ABOUTME: Its own module because fetch-assets.mjs runs its job at import and cannot be imported.

/**
 * Every spell id the app will need a name and an icon for, deduplicated and sorted.
 *
 * Two sources, and the second is easy to forget: a mob's spell list, and the `spellId` a
 * usable item on the map points at. A POI's `texture` is a Blizzard file id we cannot resolve
 * outside the client, so that `spellId` is the only way to draw an item as anything but a dot.
 */
export function collectSpellIds(dungeons) {
  const ids = new Set()
  for (const dungeon of dungeons) {
    for (const enemy of dungeon.enemies ?? []) {
      for (const spell of enemy.spells ?? []) ids.add(spell.id)
    }
    for (const poi of dungeon.pois ?? []) {
      if (poi.info?.spellId) ids.add(poi.info.spellId)
    }
  }
  return [...ids].sort((a, b) => a - b)
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run scripts/spell-ids.test.mjs --project app
```

Expected: PASS, four tests.

- [ ] **Step 5: Use it in the fetch**

In `scripts/fetch-assets.mjs`, add to the imports at the top:

```js
import { collectSpellIds } from './spell-ids.mjs'
```

and replace line 116:

```js
  const spellIds = [...new Set(dungeons.flatMap((d) => d.enemies.flatMap((e) => e.spells.map((s) => s.id))))]
```

with:

```js
  const spellIds = collectSpellIds(dungeons)
```

- [ ] **Step 6: Fetch, on a machine with network**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run fetch:assets
```

Expected: the "Spells: N unique, 7 to fetch" line names **7** to fetch — the POI spells
`1217960, 1223133, 1223537, 1223570, 1223607, 1265942, 1270638` — then `Icons: n/n`. Any of
the seven reported unresolved is worth naming in the commit message rather than hiding: the
app renders an unresolved spell with its raw id, by design.

- [ ] **Step 7: Run the suite and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
```

```bash
git add scripts/spell-ids.mjs scripts/spell-ids.test.mjs scripts/fetch-assets.mjs src/data/generated/spells.json public/icons/
```

```bash
git commit -m "Resolve the spells usable items point at, not only mobs' spells

A POI's texture is a Blizzard file id, unusable outside the client; its
spellId is what lets an item be drawn as an icon with a name. The fetch's
spell set only walked enemies, so those seven spells were never resolved.

The rule moved to its own module to be testable at all: fetch-assets.mjs
runs main() at import, so a test importing it would run the whole network
job."
```

---

## Task 3: Read the preset's notes into the route model

**Files:**
- Create: `src/lib/mdt/objects.ts`
- Create: `src/lib/mdt/objects.test.ts`
- Modify: `src/lib/mdt/route.ts` (`Route` gains `objects`, `luaToRoute` fills it, `emptyRoute`
  returns `objects: []`)
- Modify: `src/lib/mdt/useRouteDoc.ts:117-136` (`readRoute` fills `objects`)

**Interfaces:**
- Consumes: `LuaTable` / `LuaValue` from `./cbor`, `toPixels` and `Point` from `../geometry`.
- Produces:
  ```ts
  export interface MdtNote { kind: 'note'; at: Point; sublevel: number; text: string }
  export type MdtObject = MdtNote            // Task 6 adds MdtStroke to this union
  export function luaToObjects(preset: LuaTable): MdtObject[]
  ```
  and `Route.objects: MdtObject[]`, which Tasks 4–6 read.

**Note on the CBOR layer:** `cbor.ts` decodes both major 2 and major 3 into JS strings, so a
note's text arrives as a `string` — no `Uint8Array` handling is needed here.

- [ ] **Step 1: Write the failing test**

Create `src/lib/mdt/objects.test.ts`:

```ts
// ABOUTME: Tests reading a preset's drawn objects, against the real in-game export fixture.
// ABOUTME: That export carries five notes; strokes wait for a fixture that has some.

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MAP_SCALE } from '../geometry'
import { decodeMdtString } from './string'
import { luaToObjects } from './objects'
import type { LuaTable, LuaValue } from './cbor'

/** Skipped rather than failed when absent, so the repository stays testable without it. */
const fixture = path.join(__dirname, '__fixtures__', 'real-export.txt')
const raw = fs.existsSync(fixture) ? fs.readFileSync(fixture, 'utf8').trim() : ''
const run = raw ? it : it.skip

describe('luaToObjects — notes, from a real export', () => {
  run('reads every note the author left', () => {
    const objects = luaToObjects(decodeMdtString(raw).table)
    expect(objects).toHaveLength(5)
    expect(objects.every((o) => o.kind === 'note')).toBe(true)
    expect(objects.map((o) => o.text)).toContain('Lust, a lot of kicks to do')
  })

  run('places a note in map pixels, not in MDT coordinates', () => {
    const [first] = luaToObjects(decodeMdtString(raw).table)
    // d = [72.20766293212073, -236.4934240889332, 1, true, "Lust, a lot of kicks to do"]
    expect(first.at.x).toBeCloseTo(72.20766293212073 * MAP_SCALE, 6)
    expect(first.at.y).toBeCloseTo(236.4934240889332 * MAP_SCALE, 6)
    expect(first.sublevel).toBe(1)
  })

  run('skips what the author undid', () => {
    const table = decodeMdtString(raw).table
    const objects = table.get('objects') as LuaTable
    // The fixture's own first note, with its `shown` flag flipped: MDT keeps an undone object
    // in the preset in case it is redone, and `PresetObjectStepBack` is what sets this false.
    const hidden = objects.get(1) as LuaTable
    ;((hidden.get('d') as LuaTable)).set(4, false)
    expect(luaToObjects(table)).toHaveLength(4)
  })
})

describe('luaToObjects — what it refuses to break on', () => {
  /** A Lua table, spelled out: `Map<number | string, LuaValue>` needs the annotation to infer. */
  const table = (entries: [number | string, LuaValue][]): LuaTable => new Map(entries)
  const preset = (objects: LuaTable) => table([['objects', objects]])

  it('returns nothing when the preset has no objects at all', () => {
    expect(luaToObjects(new Map())).toEqual([])
  })

  it('skips an object with no details table instead of throwing', () => {
    expect(luaToObjects(preset(table([[1, table([['n', true]])]])))).toEqual([])
  })

  it('skips a note whose position is not a number', () => {
    const d = table([[1, 'nope'], [2, -10], [3, 1], [4, true], [5, 'text']])
    expect(luaToObjects(preset(table([[1, table([['d', d], ['n', true]])]])))).toEqual([])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/mdt/objects.test.ts --project app
```

Expected: FAIL to resolve `./objects`. If the three fixture tests report **skipped**, the
fixture is missing — stop and say so rather than proceeding: those three are the only ones
testing real data.

- [ ] **Step 3: Implement it**

Create `src/lib/mdt/objects.ts`:

```ts
// ABOUTME: Reads an MDT preset's `objects` — the notes and strokes drawn over a route.
// ABOUTME: Read-only, so a re-export still hands the game back its own table untouched.

/**
 * The objects an MDT preset carries beside its pulls.
 *
 * The shape is the addon's own, documented at `Modules/PresetObjects.lua:174`:
 *
 *     d: size, lineFactor, sublevel, shown, colorstring, drawLayer, [smooth]
 *     l: x1,y1,x2,y2,…
 *     t: triangle rotation
 *     n: true   →  the object is a note, and d = { x, y, sublevel, shown, text }
 *
 * Positions come out in map pixels: no component should have to know that MDT's Y axis points
 * up. Nothing here writes, which is what keeps `routeToLua` free to hand the original table
 * back with everything we cannot edit still inside it.
 */

import type { LuaTable, LuaValue } from './cbor'
import { toPixels, type Point } from '../geometry'

export interface MdtNote {
  kind: 'note'
  at: Point
  sublevel: number
  text: string
}

export type MdtObject = MdtNote

const asTable = (v: LuaValue | undefined): LuaTable | undefined => (v instanceof Map ? v : undefined)

const intKeys = (table: LuaTable): number[] =>
  [...table.keys()].filter((k): k is number => typeof k === 'number').sort((a, b) => a - b)

export function luaToObjects(preset: LuaTable): MdtObject[] {
  const raw = asTable(preset.get('objects'))
  if (!raw) return []

  const out: MdtObject[] = []
  for (const key of intKeys(raw)) {
    const obj = asTable(raw.get(key))
    const d = obj ? asTable(obj.get('d')) : undefined
    // An object we cannot read is skipped, never fatal: a route must not stop displaying
    // because one of its decorations is odd.
    if (!obj || !d) continue
    // `false` is what MDT writes when the author undoes a stroke; the object stays in the
    // preset in case they redo it. Drawing it would show what someone erased.
    if (d.get(4) === false) continue

    const sublevel = Number(d.get(3)) || 1

    if (obj.get('n') === true) {
      const x = Number(d.get(1))
      const y = Number(d.get(2))
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      const text = d.get(5)
      out.push({
        kind: 'note',
        at: toPixels(x, y),
        sublevel,
        text: typeof text === 'string' ? text : '',
      })
    }
  }
  return out
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/mdt/objects.test.ts --project app
```

Expected: PASS, six tests, none skipped.

- [ ] **Step 5: Put the objects on the route**

In `src/lib/mdt/route.ts`, add to the imports:

```ts
import { luaToObjects, type MdtObject } from './objects'
```

add to `Route`, after `pulls`:

```ts
  /**
   * The notes and strokes the preset carries, read-only.
   *
   * Read out of `source` and never written back: `routeToLua` hands the original table over
   * untouched, so these survive a round trip precisely because we do not rebuild them.
   */
  objects: MdtObject[]
```

fill it in `luaToRoute`'s returned object, after `pulls`:

```ts
    objects: luaToObjects(table),
```

and in `emptyRoute`:

```ts
export function emptyRoute(slug: string, mdtIndex: number, name = DEFAULT_ROUTE_NAME): Route {
  return { name, slug, mdtIndex, pulls: [{ color: nextColor(0), clones: [] }], objects: [] }
}
```

In `src/lib/mdt/useRouteDoc.ts`, add `luaToObjects` to the `./objects` import and change the
tail of `readRoute`:

```ts
  const source = decodeSource(root.get('source') as string | undefined)

  return {
    name: (root.get('name') as string) || DEFAULT_ROUTE_NAME,
    slug,
    mdtIndex,
    pulls: pulls.length ? pulls : [{ color: nextColor(0), clones: [] }],
    source,
    objects: source ? luaToObjects(source) : [],
  }
```

- [ ] **Step 6: Let the typechecker find every Route literal**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run typecheck
```

Expected: errors in `src/lib/mdt/route.test.ts`, `src/lib/mdt/useRouteDoc.ts` (the initial
`useState`), `src/components/route/RoutePanel.test.tsx` and possibly
`src/lib/mdt/useRouteDoc.test.tsx` — every place that builds a `Route` by hand. Add
`objects: []` to each. Do not weaken the field to optional to avoid this: a route always has
objects, possibly none, and `?? []` scattered across consumers says less.

- [ ] **Step 7: Run the suite and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
```

```bash
git add src/lib/mdt/objects.ts src/lib/mdt/objects.test.ts src/lib/mdt/route.ts src/lib/mdt/useRouteDoc.ts src/lib/mdt/route.test.ts src/components/route/RoutePanel.test.tsx
```

```bash
git commit -m "Read the notes a preset carries into the route model

Route.source has always carried them -- the in-game export fixture holds
five -- and we dropped them at the last step, displaying pulls only. They
now come out as MdtObject values already expressed in map pixels, so no
component has to know MDT's Y axis points up.

Read-only on purpose: routeToLua is untouched, so the objects still leave
inside source and the round trip keeps handing the game back what we cannot
edit. The Y.js document does not move either -- they are already replicated
to peers inside that string."
```

---

## Task 4: Draw the usable items on the map

**Files:**
- Create: `src/components/map/PoiLayer.tsx`
- Create: `src/components/map/PoiLayer.test.tsx`
- Modify: `src/components/map/DungeonMap.tsx` (mount the layer, hold `hoverPoi`, render the
  tooltip in `CloneTooltip`'s slot)
- Modify: `src/lib/i18n/en.ts` and `src/lib/i18n/fr.ts`

**Interfaces:**
- Consumes: `Poi` (Task 1) via `lookup.dungeon.pois`; `getSpell`, `iconUrl` from `../../lib/data`;
  `toPixels` from `../../lib/geometry`.
- Produces:
  ```tsx
  export default function PoiLayer(props: { pois: Poi[]; onHover: (index: number | null) => void }): ReactElement
  export function PoiTooltip(props: { poi: Poi }): ReactElement | null
  ```

- [ ] **Step 1: Add the two interface strings**

In `src/lib/i18n/en.ts`, next to the other `map.*` keys:

```ts
  'map.item': 'usable item',
  'map.dungeonEntrance': 'Dungeon entrance',
```

In `src/lib/i18n/fr.ts`, at the matching place:

```ts
  'map.item': 'objet utilisable',
  'map.dungeonEntrance': 'Entrée du donjon',
```

- [ ] **Step 2: Write the failing test**

Create `src/components/map/PoiLayer.test.tsx`:

```tsx
// ABOUTME: Tests the map's item markers: one per POI, the entrance apart, the tooltip's text.
// ABOUTME: jsdom lays out at zero, so this asserts structure and labels rather than geometry.

// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLookup, getSpell } from '../../lib/data'
import type { Poi } from '../../lib/types'
import { renderEn } from '../../test/render'
import PoiLayer, { PoiTooltip } from './PoiLayer'

afterEach(cleanup)

/** Murder Row is the one season dungeon with POIs; its data is the real thing. */
const pois = getLookup('murder-row')!.dungeon.pois

/** These layers are `<g>` elements: mounted bare, their children would not be in an svg tree. */
const svg = ({ children }: { children: ReactNode }) => <svg>{children}</svg>

describe('PoiLayer', () => {
  it('draws one marker per point of interest', () => {
    renderEn(<PoiLayer pois={pois} onHover={() => {}} />, { wrapper: svg })
    expect(screen.getAllByTestId(/^poi-/)).toHaveLength(pois.length)
  })

  it('reports the marker under the pointer, and its leaving', () => {
    const onHover = vi.fn()
    renderEn(<PoiLayer pois={pois} onHover={onHover} />, { wrapper: svg })
    const marker = screen.getByTestId('poi-1')
    fireEvent.mouseEnter(marker)
    expect(onHover).toHaveBeenLastCalledWith(1)
    fireEvent.mouseLeave(marker)
    expect(onHover).toHaveBeenLastCalledWith(null)
  })
})

describe('PoiTooltip', () => {
  it('names the spell an item points at', () => {
    const item = pois.find((p) => p.info?.spellId)!
    const spell = getSpell(item.info!.spellId, 'en')
    renderEn(<PoiTooltip poi={item} />)
    // An unresolved spell is rendered with its raw id, by design — assert whichever is true.
    expect(screen.getByText(spell ? spell.name : String(item.info!.spellId))).toBeTruthy()
  })

  it('names an entrance, which points at no spell', () => {
    const entrance: Poi = { type: 'dungeonEntrance', x: 0, y: -1, sublevel: 1, sizeMult: 1.5 }
    renderEn(<PoiTooltip poi={entrance} />)
    expect(screen.getByText('Dungeon entrance')).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/map/PoiLayer.test.tsx --project app
```

Expected: FAIL to resolve `./PoiLayer`.

- [ ] **Step 4: Implement the layer**

Create `src/components/map/PoiLayer.tsx`:

```tsx
// ABOUTME: The dungeon's points of interest — usable items and entrances — drawn on the map.
// ABOUTME: Inside the transformed svg, like the blips: an item belongs to a place, not a screen.

import type { Poi } from '../../lib/types'
import { getSpell, iconUrl } from '../../lib/data'
import { toPixels } from '../../lib/geometry'
import { useI18n } from '../../lib/i18n/context'

/** Map pixels per unit of a POI's declared `size`, chosen so a size-15 item reads like a pip. */
const SIZE_UNIT = 1.6

const radiusOf = (poi: Poi) => ((poi.info?.size ?? 12) * (poi.sizeMult ?? 1) * SIZE_UNIT) / 2

export default function PoiLayer({
  pois,
  onHover,
}: {
  pois: Poi[]
  onHover: (index: number | null) => void
}) {
  const { t } = useI18n()
  return (
    <g>
      {/* Its own clip, rather than DungeonMap's `blip-clip`: a layer that depends on a
          `<defs>` declared by its parent cannot be mounted — or tested — on its own. */}
      <defs>
        <clipPath id="poi-icon-clip" clipPathUnits="objectBoundingBox">
          <circle cx="0.5" cy="0.5" r="0.5" />
        </clipPath>
      </defs>
      {pois.map((poi, index) => {
        const { x, y } = toPixels(poi.x, poi.y)
        const r = radiusOf(poi)
        const spell = poi.info ? getSpell(poi.info.spellId) : undefined
        return (
          <g
            key={`poi-${index}`}
            data-testid={`poi-${index}`}
            onMouseEnter={() => onHover(index)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: 'help' }}
          >
            <circle cx={x} cy={y} r={r + 2} fill="#0b0d12" fillOpacity={0.75} stroke="#7fb069" strokeWidth={2} />
            {spell ? (
              <image href={iconUrl(spell.icon)} x={x - r} y={y - r} width={r * 2} height={r * 2} clipPath="url(#poi-icon-clip)" />
            ) : (
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={r * 1.4} fill="#7fb069">
                {poi.type === 'dungeonEntrance' ? '⌂' : '?'}
              </text>
            )}
            <title>{poi.type === 'dungeonEntrance' ? t('map.dungeonEntrance') : (spell?.name ?? t('map.item'))}</title>
          </g>
        )
      })}
    </g>
  )
}

/** The hover panel, in the slot `CloneTooltip` uses: one hover slot, one convention. */
export function PoiTooltip({ poi }: { poi: Poi }) {
  const { t, locale } = useI18n()
  const spell = poi.info ? getSpell(poi.info.spellId, locale) : undefined
  const title =
    poi.type === 'dungeonEntrance' ? t('map.dungeonEntrance') : (spell?.name ?? String(poi.info?.spellId ?? ''))

  return (
    <div className="pointer-events-none absolute top-3 left-3 max-w-72 rounded border border-ink-700 bg-ink-900/95 px-3 py-2 text-sm shadow-lg">
      <div className="flex items-center gap-2">
        {spell && <img src={iconUrl(spell.icon)} alt="" className="h-6 w-6 rounded" />}
        <span className="font-semibold text-ink-100">{title}</span>
      </div>
      <div className="mt-0.5 text-xs text-ink-400">
        {poi.type === 'dungeonEntrance' ? t('map.dungeonEntrance') : t('map.item')}
      </div>
      {spell?.description && <p className="mt-1 text-xs text-ink-300">{spell.description}</p>}
    </div>
  )
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/map/PoiLayer.test.tsx --project app
```

Expected: PASS, four tests.

- [ ] **Step 6: Mount it on the map**

In `src/components/map/DungeonMap.tsx`:

- add `import PoiLayer, { PoiTooltip } from './PoiLayer'`
- add `const [hoverPoi, setHoverPoi] = useState<number | null>(null)` beside the other hover
  state
- inside the `<svg>`, immediately after the `</defs>` block and **before** the pack outlines,
  so a marker never covers a blip's badge:

```tsx
          <PoiLayer pois={lookup.dungeon.pois} onHover={setHoverPoi} />
```

- beside the existing `{hoverClone && <CloneTooltip … />}` line, and after it, so a hovered
  mob keeps the slot:

```tsx
      {hoverClone == null && hoverPoi != null && lookup.dungeon.pois[hoverPoi] && (
        <PoiTooltip poi={lookup.dungeon.pois[hoverPoi]} />
      )}
```

- [ ] **Step 7: Assert it through the map, then commit**

Add to `src/components/map/DungeonMap.test.tsx`:

```tsx
describe('Points of interest', () => {
  it('draws the dungeon items whether or not a route exists', () => {
    renderEn(<DungeonMap slug="murder-row" lookup={getLookup('murder-row')!} />)
    expect(screen.getAllByTestId(/^poi-/).length).toBeGreaterThan(0)
  })
})
```

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
```

```bash
git add src/components/map/PoiLayer.tsx src/components/map/PoiLayer.test.tsx src/components/map/DungeonMap.tsx src/components/map/DungeonMap.test.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
```

```bash
git commit -m "Draw the dungeon's usable items on the map

Murder Row has eleven points of interest and The Blinding Vale two; they
were extracted and never drawn. Each item resolves through the spell it
points at, so it arrives with the icon, name and description the codex
already fetches for mob spells.

The markers sit inside the transformed svg, like the blips: an item belongs
to a place on the floor, not to a place on screen. They show in both tabs
because an item exists whether or not anyone imported a route. The hover
panel reuses CloneTooltip's slot, and yields to it when both would claim it."
```

---

## Task 5: Draw the notes, and gate them to Route mode

**Files:**
- Create: `src/components/map/NoteLayer.tsx`
- Create: `src/components/map/NoteLayer.test.tsx`
- Modify: `src/components/map/DungeonMap.tsx` (new `objects` prop, mount the layer)
- Modify: `src/routes/DungeonPage.tsx:224-247` (pass `route.objects` in Route mode)
- Modify: `src/routes/DungeonPage.test.tsx`
- Modify: `src/lib/i18n/en.ts` and `src/lib/i18n/fr.ts`

**Interfaces:**
- Consumes: `MdtObject` / `MdtNote` (Task 3), `Transform` and `toContainerPoint` from
  `./viewport`.
- Produces:
  ```tsx
  export default function NoteLayer(props: { notes: MdtNote[]; transform: Transform }): ReactElement
  ```
  and `DungeonMap`'s new optional prop `objects?: MdtObject[]`.

**Why HTML above the transform:** exactly `PeerCursors`'s reason — inside the scaled layer a
pin would have to be counter-divided by the scale and its text re-rasterised at every zoom
notch; outside, it is a translation and constant on-screen size follows on its own.

- [ ] **Step 1: Add the interface string**

`en.ts`: `'map.note': 'note',` — `fr.ts`: `'map.note': 'note',`

- [ ] **Step 2: Write the failing test**

Create `src/components/map/NoteLayer.test.tsx`:

```tsx
// ABOUTME: Tests the note pins: one per note, the text on hover, and kept open on click.
// ABOUTME: Positions are asserted through the transform, the one thing jsdom can still tell us.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { MdtNote } from '../../lib/mdt/objects'
import { renderEn } from '../../test/render'
import NoteLayer from './NoteLayer'

afterEach(cleanup)

const notes: MdtNote[] = [
  { kind: 'note', at: { x: 100, y: 200 }, sublevel: 1, text: 'Lust, a lot of kicks to do' },
  { kind: 'note', at: { x: 300, y: 400 }, sublevel: 1, text: 'Focus mob with shield' },
]

const transform = { scale: 0.5, tx: 10, ty: 20 }

describe('NoteLayer', () => {
  it('draws one pin per note', () => {
    renderEn(<NoteLayer notes={notes} transform={transform} />)
    expect(screen.getAllByTestId(/^note-pin-/)).toHaveLength(2)
  })

  it('places a pin where the note is, under the current transform', () => {
    renderEn(<NoteLayer notes={notes} transform={transform} />)
    // toContainerPoint: 100 * 0.5 + 10 = 60, 200 * 0.5 + 20 = 120
    expect(screen.getByTestId('note-pin-0').style.transform).toBe('translate(60px, 120px)')
  })

  it('shows the text only while its pin is hovered', () => {
    renderEn(<NoteLayer notes={notes} transform={transform} />)
    expect(screen.queryByText('Focus mob with shield')).toBeNull()
    fireEvent.mouseEnter(screen.getByTestId('note-pin-1'))
    expect(screen.getByText('Focus mob with shield')).toBeTruthy()
    fireEvent.mouseLeave(screen.getByTestId('note-pin-1'))
    expect(screen.queryByText('Focus mob with shield')).toBeNull()
  })

  it('keeps a note open once clicked, and closes it on a second click', () => {
    renderEn(<NoteLayer notes={notes} transform={transform} />)
    const pin = screen.getByTestId('note-pin-0')
    fireEvent.click(pin)
    fireEvent.mouseLeave(pin)
    expect(screen.getByText('Lust, a lot of kicks to do')).toBeTruthy()
    fireEvent.click(pin)
    expect(screen.queryByText('Lust, a lot of kicks to do')).toBeNull()
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/map/NoteLayer.test.tsx --project app
```

Expected: FAIL to resolve `./NoteLayer`.

- [ ] **Step 4: Implement the layer**

Create `src/components/map/NoteLayer.tsx`:

```tsx
// ABOUTME: The notes an MDT preset carries, as pins over the map with their text on hover.
// ABOUTME: Outside the transformed layer, so a pin keeps its size and its text stays legible.

import { useState } from 'react'
import type { MdtNote } from '../../lib/mdt/objects'
import { useI18n } from '../../lib/i18n/context'
import { toContainerPoint, type Transform } from './viewport'

/**
 * A route's notes.
 *
 * This layer sits over the transformed map rather than inside it, for `PeerCursors`'s reason:
 * inside, every pin would need counter-scaling and its text re-rasterising at each zoom notch;
 * outside, a pin is a translation and its constant on-screen size follows on its own.
 *
 * Hover opens a note, a click pins it open — reading a long note while the pointer wanders is
 * the ordinary case, not an edge one.
 */
export default function NoteLayer({ notes, transform }: { notes: MdtNote[]; transform: Transform }) {
  const { t } = useI18n()
  const [hovered, setHovered] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)

  return (
    <div className="absolute inset-0 overflow-hidden">
      {notes.map((note, index) => {
        const at = toContainerPoint(transform, note.at)
        const open = pinned === index || (pinned == null && hovered === index)
        return (
          <div
            key={`note-${index}`}
            className="absolute top-0 left-0 flex items-start gap-1"
            style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
          >
            <button
              data-testid={`note-pin-${index}`}
              title={t('map.note')}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setPinned((p) => (p === index ? null : index))}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition ${
                open
                  ? 'border-gold-400 bg-gold-500 text-ink-950'
                  : 'border-gold-500/70 bg-ink-900/90 text-gold-400 hover:bg-gold-500 hover:text-ink-950'
              }`}
            >
              !
            </button>
            {open && (
              <div className="max-w-64 rounded border border-gold-500/40 bg-ink-900/95 px-2 py-1 text-xs text-ink-100 shadow-lg">
                {note.text}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/map/NoteLayer.test.tsx --project app
```

Expected: PASS, four tests.

- [ ] **Step 6: Mount it on the map**

In `src/components/map/DungeonMap.tsx`:

- `import type { MdtNote, MdtObject } from '../../lib/mdt/objects'` and
  `import NoteLayer from './NoteLayer'`
- add to `Props`:

```tsx
  /** The preset's notes and strokes. Route mode only: they belong to an itinerary. */
  objects?: MdtObject[]
```

- destructure `objects` in the component's parameter list
- after `{cursors && <PeerCursors … />}`, so a note pin sits under nothing but the HUD:

```tsx
      {/* An explicit predicate, not a bare `o.kind === 'note'`: once Task 6 puts a second
          member in the union, `filter` alone hands back `MdtObject[]`. */}
      {objects && (
        <NoteLayer
          notes={objects.filter((o): o is MdtNote => o.kind === 'note')}
          transform={transform}
        />
      )}
```

- [ ] **Step 7: Pass them from the page, in Route mode only**

In `src/routes/DungeonPage.tsx`, add to the `<DungeonMap …>` props, beside `pullShapes`:

```tsx
            objects={mode === 'route' ? route.objects : undefined}
```

- [ ] **Step 8: Pin the gating at the page level**

Add to `src/routes/DungeonPage.test.tsx`, using that file's own `at()` mount helper and its
`getByRole('button', { name: 'Route' })` idiom rather than a second way of doing the same:

```tsx
describe('Points of interest', () => {
  /** Murder Row, not the SLUG the rest of the file uses: Altar of Fangs declares no POI. */
  it('shows the dungeon items in both tabs', () => {
    renderEn(at('/d/murder-row'))
    expect(screen.getAllByTestId(/^poi-/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    expect(screen.getAllByTestId(/^poi-/).length).toBeGreaterThan(0)
  })
})
```

The notes' gating is asserted in `DungeonMap.test.tsx` instead, where an `objects` prop can be
handed over directly — reaching it through the page would mean importing a route through the
panel, which is `RoutePanel`'s subject, not this one:

```tsx
describe('Preset notes', () => {
  const note = { kind: 'note' as const, at: { x: 100, y: 200 }, sublevel: 1, text: 'Lust here' }

  it('draws a pin for each note it is given', () => {
    renderEn(<DungeonMap slug="altar-of-fangs" lookup={getLookup('altar-of-fangs')!} objects={[note]} />)
    expect(screen.getByTestId('note-pin-0')).toBeTruthy()
  })

  it('draws none when the page passes no objects, as the codex tab does', () => {
    renderEn(<DungeonMap slug="altar-of-fangs" lookup={getLookup('altar-of-fangs')!} />)
    expect(screen.queryByTestId('note-pin-0')).toBeNull()
  })
})
```

- [ ] **Step 9: Run the suite and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
```

```bash
git add src/components/map/NoteLayer.tsx src/components/map/NoteLayer.test.tsx src/components/map/DungeonMap.tsx src/routes/DungeonPage.tsx src/routes/DungeonPage.test.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
```

```bash
git commit -m "Show the notes an imported route carries

The five notes in our own export fixture were read in the previous commit
and drawn nowhere. They now appear as pins over the map, opening on hover
and staying open on click -- reading a long note while the pointer wanders
is the ordinary case.

The layer sits outside the transformed map, like the peer cursors and for
the same reason: a pin inside it would need counter-scaling and its text
re-rasterising at every zoom notch. Notes are gated to Route mode, as the
pull outlines are: they belong to an itinerary, not to the dungeon."
```

---

## Task 6: Strokes and arrows — **blocked on a real fixture**

**Do not start this task while `src/lib/mdt/__fixtures__/` holds no export containing stroke
objects.** The one we have carries notes only. Closing that gap takes five minutes in the game
— in MDT, expand the top toolbar, draw a few lines and an arrow, export, and commit the string
as a second fixture — and a hand-written stroke table is **not** an acceptable substitute: it
would test our idea of the format rather than the format, which is the failure mode the
repository's test rules name.

When the fixture lands, its name goes here and the steps below become executable.

**Files:**
- Modify: `src/lib/mdt/objects.ts` (add `MdtStroke` to the union, parse `l`, `t`, sort by layer)
- Modify: `src/lib/mdt/objects.test.ts`
- Create: `src/components/map/ObjectLayer.tsx`
- Create: `src/components/map/ObjectLayer.test.tsx`
- Modify: `src/components/map/DungeonMap.tsx` (mount the layer inside the `<svg>`)

**Interfaces:**
- Produces:
  ```ts
  export interface MdtStroke {
    kind: 'stroke'
    points: Point[]
    sublevel: number
    /** MDT's hex colour, without the leading hash. */
    color: string
    /** MDT's brush size; the drawn width is `size * 0.3 * MAP_SCALE`. */
    size: number
    smooth: boolean
    /** `d[6]`, MDT's stacking order. Absent counts as 0, as a nil layerSublevel does in game. */
    layer: number
    isArrow: boolean
  }
  export type MdtObject = MdtNote | MdtStroke
  ```
  ```tsx
  export default function ObjectLayer(props: { strokes: MdtStroke[] }): ReactElement
  ```

**The three decisions this task implements**, from the spec:

1. `luaToObjects` returns `[...strokes, ...notes]`, the strokes sorted by `layer`.
   `Array.prototype.sort` is stable (ES2019), so equal layers keep the insertion order
   `StorePresetObject` maintains — which is MDT's own stacking.
2. `smooth` maps to `strokeLinecap`/`strokeLinejoin: 'round'`. MDT draws a circle at every
   joint; in SVG that is the same thing, not an approximation.
3. **The arrow head's direction is recomputed from the last two points**, never read from
   `t[1]`. MDT measures that angle in a frame whose Y axis points up; ours points down, and
   transposing it is sign-juggling verifiable only by eye. `t`'s presence survives as
   `isArrow`.

- [ ] **Step 1: Read the fixture before writing assertions against it**

Create `src/lib/mdt/probe.test.ts`, run it, note the values, then delete it. Guessing the
numbers and adjusting them until the test passes would be the same as asserting nothing.

```ts
// ABOUTME: Throwaway probe: prints the stroke objects the new fixture carries.
// ABOUTME: Deleted in the same step it is read.

import { readFileSync } from 'node:fs'
import { it } from 'vitest'
import { decodeMdtString } from './string'

const plain = (v: unknown): unknown => {
  if (v instanceof Map) {
    const keys = [...v.keys()]
    const contiguous = keys.every((k, i) => k === i + 1)
    return contiguous ? keys.map((k) => plain(v.get(k))) : Object.fromEntries(keys.map((k) => [k, plain(v.get(k))]))
  }
  return v
}

it('prints the fixture objects', () => {
  const raw = readFileSync(new URL('./__fixtures__/<the new fixture>.txt', import.meta.url), 'utf8').trim()
  const objects = decodeMdtString(raw).table.get('objects') as Map<number, unknown>
  for (const [i, obj] of objects) console.log(i, JSON.stringify(plain(obj)))
})
```

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/mdt/probe.test.ts --project app
```

```bash
export PATH="/c/Program Files/nodejs:$PATH" && node -e "require('fs').unlinkSync('src/lib/mdt/probe.test.ts')"
```

- [ ] **Step 2: Write the failing test for stroke parsing**

In `src/lib/mdt/objects.test.ts`, declare the second fixture beside the first — the strokes
live in a different export, so they cannot reuse `raw`:

```ts
/** The export carrying drawn strokes; the first fixture holds notes only. */
const drawings = path.join(__dirname, '__fixtures__', '<the new fixture>.txt')
const drawn = fs.existsSync(drawings) ? fs.readFileSync(drawings, 'utf8').trim() : ''
const runDrawn = drawn ? it : it.skip
```

add `MdtStroke` to the `./objects` type import, then append the block below. Everything in it
is true of any export with strokes in it, except
the last test: **replace its three `FIXTURE_…` constants with the values step 1 printed**, and
drop the stacking-order test if the export turned out to carry a single stroke, since ordering
one proves nothing.

```ts
describe('luaToObjects — strokes, from a real export', () => {
  const strokes = () =>
    luaToObjects(decodeMdtString(drawn).table).filter((o): o is MdtStroke => o.kind === 'stroke')

  runDrawn('reads every stroke as a list of at least two points', () => {
    expect(strokes().length).toBeGreaterThan(0)
    expect(strokes().every((s) => s.points.length >= 2)).toBe(true)
  })

  runDrawn('reads a colour MDT could have written, never the fallback', () => {
    expect(strokes().every((s) => /^[0-9a-f]{6}$/i.test(s.color))).toBe(true)
  })

  runDrawn('reads exactly one arrow among them', () => {
    expect(strokes().filter((s) => s.isArrow)).toHaveLength(1)
  })

  runDrawn('returns the strokes before the notes', () => {
    const kinds = luaToObjects(decodeMdtString(drawn).table).map((o) => o.kind)
    expect(kinds.lastIndexOf('stroke')).toBeLessThan(kinds.indexOf('note'))
  })

  runDrawn('returns them in MDT stacking order', () => {
    const layers = strokes().map((s) => s.layer)
    expect([...layers].sort((a, b) => a - b)).toEqual(layers)
  })

  runDrawn('pins the first stroke, so a codec regression cannot pass silently', () => {
    const [first] = strokes()
    expect(first.points[0].x).toBeCloseTo(FIXTURE_FIRST_X * MAP_SCALE, 6)
    expect(first.points[0].y).toBeCloseTo(-FIXTURE_FIRST_Y * MAP_SCALE, 6)
    expect(first.color).toBe(FIXTURE_FIRST_COLOR)
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/mdt/objects.test.ts --project app
```

Expected: the stroke tests fail — `luaToObjects` returns notes only, so `strokes()` is empty.

- [ ] **Step 4: Extend `luaToObjects`**

```ts
    const l = asTable(obj.get('l'))
    if (!l) continue
    const flat = intKeys(l).map((k) => Number(l.get(k)))
    // `l` is x1,y1,x2,y2,…: an odd tail means a stroke still being drawn when it was saved.
    const points: Point[] = []
    for (let i = 0; i + 1 < flat.length; i += 2) {
      if (!Number.isFinite(flat[i]) || !Number.isFinite(flat[i + 1])) continue
      points.push(toPixels(flat[i], flat[i + 1]))
    }
    if (points.length < 2) continue

    const color = d.get(5)
    strokes.push({
      kind: 'stroke',
      points,
      sublevel,
      color: typeof color === 'string' && /^[0-9a-fA-F]{6}$/.test(color) ? color : 'ffffff',
      size: Number(d.get(1)) || 5,
      smooth: d.get(7) === true,
      layer: Number(d.get(6)) || 0,
      isArrow: asTable(obj.get('t')) != null,
    })
```

with `const strokes: MdtStroke[] = []` and `const notes: MdtNote[] = []` replacing the single
`out`, and the return becoming:

```ts
  // Strokes first, in MDT's stacking order; notes are drawn by their own layer anyway.
  strokes.sort((a, b) => a.layer - b.layer)
  return [...strokes, ...notes]
```

`MdtStroke` joins the union in the same edit:

```ts
export type MdtObject = MdtNote | MdtStroke
```

MDT's fallback for an invalid colour is `ffffff` (`PresetObjects.lua:187-189`), and its
fallback for a missing size is `5` (`:184`) — both are copied here rather than invented.

- [ ] **Step 5: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/mdt/objects.test.ts --project app
```

Expected: PASS, and the note tests from Task 3 still passing beside them.

- [ ] **Step 6: Write the failing test for the render layer**

Create `src/components/map/ObjectLayer.test.tsx`:

```tsx
// ABOUTME: Tests how a stroke is drawn: its polyline, its width, its caps, its arrow head.
// ABOUTME: Geometry is asserted on attributes, which is the one thing jsdom reports faithfully.

// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MAP_SCALE } from '../../lib/geometry'
import type { MdtStroke } from '../../lib/mdt/objects'
import { renderEn } from '../../test/render'
import ObjectLayer from './ObjectLayer'

afterEach(cleanup)

const svg = ({ children }: { children: ReactNode }) => <svg>{children}</svg>

const line: MdtStroke = {
  kind: 'stroke',
  points: [
    { x: 10, y: 20 },
    { x: 30, y: 40 },
  ],
  sublevel: 1,
  color: 'ff3eff',
  size: 5,
  smooth: true,
  layer: 0,
  isArrow: false,
}

describe('ObjectLayer', () => {
  it('draws a stroke as one polyline through its points, in order', () => {
    const { container } = renderEn(<ObjectLayer strokes={[line]} />, { wrapper: svg })
    const polyline = container.querySelector('polyline')!
    expect(polyline.getAttribute('points')).toBe('10,20 30,40')
    expect(polyline.getAttribute('stroke')).toBe('#ff3eff')
  })

  it("takes its width from MDT's own 0.3 factor, in map pixels", () => {
    const { container } = renderEn(<ObjectLayer strokes={[line]} />, { wrapper: svg })
    expect(container.querySelector('polyline')!.getAttribute('stroke-width')).toBe(
      String(5 * 0.3 * MAP_SCALE),
    )
  })

  it('rounds the caps of a smooth stroke, the way MDT circles its joints', () => {
    const { container } = renderEn(<ObjectLayer strokes={[line]} />, { wrapper: svg })
    expect(container.querySelector('polyline')!.getAttribute('stroke-linecap')).toBe('round')
  })

  it('leaves the caps square when the stroke is not smooth', () => {
    const { container } = renderEn(<ObjectLayer strokes={[{ ...line, smooth: false }]} />, { wrapper: svg })
    expect(container.querySelector('polyline')!.getAttribute('stroke-linecap')).toBe('butt')
  })

  it('gives an arrow a head, and a plain line none', () => {
    const { container } = renderEn(<ObjectLayer strokes={[line, { ...line, isArrow: true }]} />, {
      wrapper: svg,
    })
    expect(container.querySelectorAll('polygon')).toHaveLength(1)
  })

  it('points the head along the last segment, not along a stored angle', () => {
    // Straight to the right: the head's tip is the last point, whatever MDT recorded.
    const right: MdtStroke = { ...line, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], isArrow: true }
    const { container } = renderEn(<ObjectLayer strokes={[right]} />, { wrapper: svg })
    const [tip] = container.querySelector('polygon')!.getAttribute('points')!.split(' ')
    expect(tip).toBe('100,0')
  })

  it('draws nothing at all when there is no stroke', () => {
    const { container } = renderEn(<ObjectLayer strokes={[]} />, { wrapper: svg })
    expect(container.querySelector('polyline')).toBeNull()
  })
})
```

- [ ] **Step 7: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/map/ObjectLayer.test.tsx --project app
```

Expected: FAIL to resolve `./ObjectLayer`.

- [ ] **Step 8: Implement `ObjectLayer`**

Create `src/components/map/ObjectLayer.tsx`:

```tsx
// ABOUTME: The strokes and arrows an MDT preset carries, drawn over the map.
// ABOUTME: Inert to the pointer: decoration must never eat a click meant for a blip.

import { MAP_SCALE } from '../../lib/geometry'
import type { MdtStroke } from '../../lib/mdt/objects'

/** MDT draws a stroke at `size * 0.3`; the scale carries that from its frame to our image. */
const widthOf = (stroke: MdtStroke) => stroke.size * 0.3 * MAP_SCALE

/** How much longer than wide an arrow head reads. */
const HEAD_RATIO = 1.6

/**
 * The head, as a triangle at the stroke's last point.
 *
 * Its direction comes from the last segment rather than from MDT's stored rotation: that angle
 * was measured in a frame whose Y axis points up, and transposing it is sign-juggling nothing
 * but the eye could check. The geometry says the same thing, in the axis we already converted.
 */
function arrowHead(stroke: MdtStroke): string {
  const [from, to] = stroke.points.slice(-2)
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const length = widthOf(stroke) * HEAD_RATIO
  const half = widthOf(stroke)
  const back = { x: to.x - Math.cos(angle) * length, y: to.y - Math.sin(angle) * length }
  const normal = { x: -Math.sin(angle) * half, y: Math.cos(angle) * half }
  return [
    `${to.x},${to.y}`,
    `${back.x + normal.x},${back.y + normal.y}`,
    `${back.x - normal.x},${back.y - normal.y}`,
  ].join(' ')
}

export default function ObjectLayer({ strokes }: { strokes: MdtStroke[] }) {
  return (
    <g className="pointer-events-none">
      {strokes.map((stroke, index) => {
        const color = `#${stroke.color}`
        return (
          <g key={`stroke-${index}`} data-testid={`stroke-${index}`}>
            <polyline
              points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={widthOf(stroke)}
              strokeLinecap={stroke.smooth ? 'round' : 'butt'}
              strokeLinejoin={stroke.smooth ? 'round' : 'miter'}
            />
            {stroke.isArrow && <polygon points={arrowHead(stroke)} fill={color} />}
          </g>
        )
      })}
    </g>
  )
}
```

- [ ] **Step 9: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/map/ObjectLayer.test.tsx --project app
```

Expected: PASS, seven tests.

- [ ] **Step 10: Mount it in `DungeonMap`**

Inside the `<svg>`, **after** the pull outlines and **before** the blips, so a stroke reads
over its route's outline but under the mobs:

```tsx
          {objects && <ObjectLayer strokes={objects.filter((o): o is MdtStroke => o.kind === 'stroke')} />}
```

with `MdtStroke` added to the type import already there for `MdtNote` and `MdtObject`.

- [ ] **Step 11: Run the suite and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
```

Commit message subject: `Show the strokes and arrows an imported route carries`. The body
should say which export the fixture came from, and that the arrow's direction is recomputed
from geometry rather than read from MDT's stored angle, with the reason.

---

## Verification, once the tasks are done

- [ ] `npm test` — green, and **`objects.test.ts`'s fixture tests reported as run, not
  skipped**. A skipped fixture test is the one failure mode this whole slice can hide.
- [ ] `npm run typecheck` — clean.
- [ ] `npm run build` — clean, and `dist/` still around 6 MB (seven icons is a rounding error;
  a jump means something else went in).
- [ ] Import a real route in `npm run dev`, then **export it and re-import that string into
  MDT in game.** The tests prove we read the objects; only the game proves we still hand them
  back. This is the check the spec's invariant rests on, and no test can stand in for it.
- [ ] Murder Row shows eleven item markers in both tabs; a dungeon with no POI shows none and
  logs nothing.
