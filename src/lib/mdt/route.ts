// ABOUTME: The route model, and the bridge to and from MDT preset tables.
// ABOUTME: Keeps the original Lua table so drawings and notes survive a round trip.

/**
 * The route model, and the bridge to MDT presets.
 *
 * An MDT preset carries far more than pulls: drawings, notes, rift offsets, assignments. We keep
 * the original Lua table and rewrite only `value.pulls` and `objects`; everything else rides
 * through untouched. An object this app did not edit is re-emitted from its source entry byte for
 * byte rather than passed through wholesale — see
 * `docs/plans/2026-08-18-mdt-object-editing-design.md`, "The invariant this changes, and what
 * replaces it".
 */

import type { CloneRef } from '../types'
import { cloneKey, dungeonList, type DungeonLookup } from '../data'
import type { LuaTable, LuaValue } from './cbor'
import { MdtUserError } from './errors'
import { luaToObjects, objectsToLua, type MdtObject } from './objects'

/** MDT's default palette (colorPaletteIdx 4), reused so pulls look the same as in game. */
export const PULL_COLORS = [
  'ff3eff', '3eb0ff', 'ffdd3e', '3eff88', 'ff803e',
  'c43eff', '3effe0', 'ff3e6b', '9dff3e', '3e6bff',
  'ffb03e', '6bff3e', 'ff3ec4', '3effb0', 'e0ff3e',
]

export interface Pull {
  color: string
  clones: CloneRef[]
}

export interface Route {
  name: string
  /** Dungeon slug, resolved from `currentDungeonIdx`. */
  slug: string
  mdtIndex: number
  pulls: Pull[]
  difficulty?: number
  uid?: string
  /** The original table, kept so nothing is lost on re-export. */
  source?: LuaTable
  /**
   * The notes and strokes the preset carries.
   *
   * Read out of `source` on import. An object this app never edited is re-emitted from its
   * original entry byte for byte on export; only an edited or created object is rebuilt. See
   * `docs/plans/2026-08-18-mdt-object-editing-design.md`, "The invariant this changes, and what
   * replaces it".
   */
  objects: MdtObject[]
}

const asTable = (v: LuaValue | undefined): LuaTable | undefined => (v instanceof Map ? v : undefined)

const slugForMdtIndex = (idx: number) => dungeonList.find((d) => d.mdtIndex === idx)?.slug

export function nextColor(index: number): string {
  return PULL_COLORS[index % PULL_COLORS.length]
}

/** `#ff3eff` <-> `ff3eff`: MDT stores it without the hash, SVG needs one. */
export const toCssColor = (c: string) => (c.startsWith('#') ? c : `#${c.replace(/^#/, '')}`)

// ---------------------------------------------------------------------------
// Preset MDT -> Route
// ---------------------------------------------------------------------------

export function luaToRoute(table: LuaTable): Route {
  const value = asTable(table.get('value'))
  if (!value) throw new MdtUserError('noValue')

  const mdtIndex = Number(value.get('currentDungeonIdx'))
  const slug = slugForMdtIndex(mdtIndex)
  if (!slug) throw new MdtUserError('notInPool', { mdtIndex })

  const rawPulls = asTable(value.get('pulls'))
  const pulls: Pull[] = []

  if (rawPulls) {
    // Pulls are indexed 1..n; we walk them in numeric order.
    const indices = [...rawPulls.keys()].filter((k): k is number => typeof k === 'number').sort((a, b) => a - b)
    for (const i of indices) {
      const pull = asTable(rawPulls.get(i))
      if (!pull) continue

      const clones: CloneRef[] = []
      for (const [key, entry] of pull) {
        // An integer key is a mob index; "color" and friends are metadata.
        if (typeof key !== 'number') continue
        const cloneTable = asTable(entry)
        if (!cloneTable) continue
        for (const cloneIdx of cloneTable.values()) {
          if (typeof cloneIdx === 'number') clones.push({ enemyIdx: key, cloneIdx })
        }
      }

      const color = pull.get('color')
      pulls.push({
        color: typeof color === 'string' ? color : nextColor(pulls.length),
        clones,
      })
    }
  }

  const name = table.get('text')
  const uid = table.get('uid')
  const difficulty = table.get('difficulty')

  return {
    name: typeof name === 'string' ? name : 'Imported route',
    slug,
    mdtIndex,
    pulls,
    objects: luaToObjects(table),
    uid: typeof uid === 'string' ? uid : undefined,
    difficulty: typeof difficulty === 'number' ? difficulty : undefined,
    source: table,
  }
}

// ---------------------------------------------------------------------------
// Route -> preset MDT
// ---------------------------------------------------------------------------

function pullsToLua(pulls: Pull[]): LuaTable {
  const out: LuaTable = new Map()
  pulls.forEach((pull, i) => {
    const entry: LuaTable = new Map()
    // Group the clones by mob, the way MDT does.
    const byEnemy = new Map<number, number[]>()
    for (const ref of pull.clones) {
      const list = byEnemy.get(ref.enemyIdx)
      if (list) list.push(ref.cloneIdx)
      else byEnemy.set(ref.enemyIdx, [ref.cloneIdx])
    }
    for (const enemyIdx of [...byEnemy.keys()].sort((a, b) => a - b)) {
      const clones: LuaTable = new Map()
      byEnemy
        .get(enemyIdx)!
        .sort((a, b) => a - b)
        .forEach((cloneIdx, k) => clones.set(k + 1, cloneIdx))
      entry.set(enemyIdx, clones)
    }
    entry.set('color', pull.color)
    out.set(i + 1, entry)
  })
  return out
}

/**
 * Rebuilds a preset table ready to serialise. If the route came from an import, we start
 * from the original table to preserve drawings, notes and offsets.
 */
export function routeToLua(route: Route): LuaTable {
  const table: LuaTable = route.source ? new Map(route.source) : new Map()

  const sourceValue = asTable(route.source?.get('value'))
  const value: LuaTable = sourceValue ? new Map(sourceValue) : new Map()

  value.set('currentDungeonIdx', route.mdtIndex)
  value.set('currentSublevel', value.get('currentSublevel') ?? 1)
  value.set('currentPull', 1)
  value.set('pulls', pullsToLua(route.pulls))
  if (!value.has('enemyAssignments')) value.set('enemyAssignments', new Map())

  table.set('text', route.name)
  table.set('value', value)
  // The objects are no longer passed through: they are rebuilt, entry by entry, from where each
  // one came from. `objectsToLua` re-emits an entry this app did not edit byte for byte, which is
  // what keeps a preset we merely read indistinguishable from the one we were handed — see the
  // design document referenced on `Route.objects` above.
  //
  // The key itself is only written when there is something to write: when the source already
  // carried an `objects` table, or when the route now holds an object of its own (created, since
  // an object read from `source` always brings a source that already has the key). A preset that
  // never had `objects` — and a route with neither a source nor any objects — must not gain an
  // empty one it never carried.
  //
  // And an `objects` that is present but is not a table at all is not ours to rebuild: it rides
  // through in the shallow copy above, untouched. `objectsToLua` would read nothing from it and
  // hand back an empty table in its place — destroying a value for the sole reason that we could
  // not read it, which is exactly what the verbatim rule refuses to do elsewhere.
  const hasObjects = route.source?.has('objects') === true
  const unreadableObjects = hasObjects && asTable(route.source!.get('objects')) === undefined
  if (!unreadableObjects && (hasObjects || route.objects.length > 0)) {
    table.set('objects', objectsToLua(route.source, route.objects))
  }
  if (route.difficulty !== undefined) table.set('difficulty', route.difficulty)
  if (route.uid !== undefined) table.set('uid', route.uid)
  if (!table.has('colorPaletteInfo')) {
    const palette: LuaTable = new Map()
    palette.set('autoColoring', true)
    palette.set('colorPaletteIdx', 4)
    table.set('colorPaletteInfo', palette)
  }

  return table
}

// ---------------------------------------------------------------------------
// Editing helpers
// ---------------------------------------------------------------------------

/**
 * Deliberately not translated: this name is data, not chrome. It is serialised into the MDT
 * string, persisted to localStorage and replicated to Y.js peers, so localising it would make
 * two teammates see different names for the same route.
 */
export const DEFAULT_ROUTE_NAME = 'New route'

export function emptyRoute(slug: string, mdtIndex: number, name = DEFAULT_ROUTE_NAME): Route {
  return { name, slug, mdtIndex, pulls: [{ color: nextColor(0), clones: [] }], objects: [] }
}

/** Clone keys already assigned, with the pull they belong to. */
export function pullIndexByClone(route: Route): Map<string, number> {
  const map = new Map<string, number>()
  route.pulls.forEach((pull, i) => {
    for (const ref of pull.clones) map.set(cloneKey(ref.enemyIdx, ref.cloneIdx), i)
  })
  return map
}

export interface RouteStats {
  /** Cumulative forces, pull by pull. */
  cumulative: number[]
  total: number
  required: number
  percent: number
}

/** How a route's forces read against what the dungeon requires. */
export type ForcesStanding = 'short' | 'complete' | 'over'

/**
 * Past this share of the requirement, the surplus is forces pulled for nothing. A route is
 * meant to land a little above 100%, not on it — a mob that dies late still has to count.
 */
export const OVERPULL_PERCENT = 101.5

export function forcesStanding(percent: number): ForcesStanding {
  if (percent > OVERPULL_PERCENT) return 'over'
  return percent >= 100 ? 'complete' : 'short'
}

export function routeStats(route: Route, lookup: DungeonLookup): RouteStats {
  const cumulative: number[] = []
  let running = 0
  for (const pull of route.pulls) {
    for (const ref of pull.clones) {
      const entry = lookup.cloneByKey.get(cloneKey(ref.enemyIdx, ref.cloneIdx))
      if (entry) running += entry.enemy.count
    }
    cumulative.push(running)
  }
  const required = lookup.dungeon.totalCount || 1
  return {
    cumulative,
    total: running,
    required,
    percent: (running / required) * 100,
  }
}
