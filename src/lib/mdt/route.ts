// ABOUTME: The route model, and the bridge to and from MDT preset tables.
// ABOUTME: Keeps the original Lua table so drawings and notes survive a round trip.

/**
 * The route model, and the bridge to MDT presets.
 *
 * An MDT preset carries far more than pulls: drawings, notes, rift offsets, assignments. We
 * cannot edit any of that, so we keep the original Lua table and only rewrite `value.pulls`
 * — re-exporting an imported route hands it back to the game without losing what we never
 * touched.
 */

import type { CloneRef } from '../types'
import { cloneKey, dungeonList, type DungeonLookup } from '../data'
import type { LuaTable, LuaValue } from './cbor'
import { MdtUserError } from './errors'

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
  return { name, slug, mdtIndex, pulls: [{ color: nextColor(0), clones: [] }] }
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
