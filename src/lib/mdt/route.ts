/**
 * Modèle de route, et passerelle avec les presets MDT.
 *
 * Un preset MDT porte bien plus que des pulls : dessins, notes, offsets de faille,
 * assignations. On ne sait pas éditer tout ça, donc on conserve la table Lua d'origine et on
 * ne réécrit que `value.pulls` — ré-exporter une route importée la rend au jeu sans perdre
 * ce qu'on n'a pas touché.
 */

import type { CloneRef } from '../types'
import { cloneKey, dungeonList, type DungeonLookup } from '../data'
import type { LuaTable, LuaValue } from './cbor'

/** Palette par défaut de MDT (colorPaletteIdx 4), reprise pour que les pulls se ressemblent. */
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
  /** Slug du donjon, résolu depuis `currentDungeonIdx`. */
  slug: string
  mdtIndex: number
  pulls: Pull[]
  difficulty?: number
  uid?: string
  /** Table d'origine, préservée pour ne rien perdre au ré-export. */
  source?: LuaTable
}

const asTable = (v: LuaValue | undefined): LuaTable | undefined => (v instanceof Map ? v : undefined)

const slugForMdtIndex = (idx: number) => dungeonList.find((d) => d.mdtIndex === idx)?.slug

export function nextColor(index: number): string {
  return PULL_COLORS[index % PULL_COLORS.length]
}

/** `#ff3eff` <-> `ff3eff` : MDT stocke sans dièse, le SVG en a besoin. */
export const toCssColor = (c: string) => (c.startsWith('#') ? c : `#${c.replace(/^#/, '')}`)

// ---------------------------------------------------------------------------
// Preset MDT -> Route
// ---------------------------------------------------------------------------

export function luaToRoute(table: LuaTable): Route {
  const value = asTable(table.get('value'))
  if (!value) throw new Error("Preset MDT invalide : champ 'value' absent")

  const mdtIndex = Number(value.get('currentDungeonIdx'))
  const slug = slugForMdtIndex(mdtIndex)
  if (!slug) {
    throw new Error(
      `Ce donjon (index MDT ${mdtIndex}) n'est pas dans le pool de la saison 2 — route non importable ici.`,
    )
  }

  const rawPulls = asTable(value.get('pulls'))
  const pulls: Pull[] = []

  if (rawPulls) {
    // Les pulls sont indexés 1..n ; on parcourt dans l'ordre numérique.
    const indices = [...rawPulls.keys()].filter((k): k is number => typeof k === 'number').sort((a, b) => a - b)
    for (const i of indices) {
      const pull = asTable(rawPulls.get(i))
      if (!pull) continue

      const clones: CloneRef[] = []
      for (const [key, entry] of pull) {
        // Une clé entière est un index de mob ; "color" et consorts sont des métadonnées.
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
    name: typeof name === 'string' ? name : 'Route importée',
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
    // Regroupe les clones par mob, comme le fait MDT.
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
 * Reconstruit une table de preset prête à sérialiser. Si la route vient d'un import, on part
 * de la table d'origine pour préserver dessins, notes et offsets.
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
// Utilitaires d'édition
// ---------------------------------------------------------------------------

export function emptyRoute(slug: string, mdtIndex: number, name = 'Nouvelle route'): Route {
  return { name, slug, mdtIndex, pulls: [{ color: nextColor(0), clones: [] }] }
}

/** Clés de clones déjà affectées, avec le pull correspondant. */
export function pullIndexByClone(route: Route): Map<string, number> {
  const map = new Map<string, number>()
  route.pulls.forEach((pull, i) => {
    for (const ref of pull.clones) map.set(cloneKey(ref.enemyIdx, ref.cloneIdx), i)
  })
  return map
}

export interface RouteStats {
  /** Forces cumulées, pull par pull. */
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
