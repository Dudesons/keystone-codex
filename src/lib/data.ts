/**
 * Accès aux données extraites de MDT.
 *
 * L'ensemble pèse ~500 Ko de JSON, donc tout est chargé d'emblée : ça évite les états de
 * chargement dans l'UI pour un coût négligeable.
 */

import type { Clone, CloneRef, Dungeon, DungeonSummary, Enemy, Pack, Spell } from './types'
import { convexHull, expandPolygon, toPixels } from './geometry'
import dungeonIndex from '../data/generated/dungeons.json'
import spellData from '../data/generated/spells.json'

const modules = import.meta.glob<Dungeon>('../data/generated/*.json', {
  eager: true,
  import: 'default',
})

/** Les fichiers de donjon sont ceux qui portent une liste `enemies` (exclut dungeons/spells). */
const dungeons = new Map<string, Dungeon>(
  Object.values(modules)
    .filter((m): m is Dungeon => Array.isArray((m as Dungeon)?.enemies))
    .map((d) => [d.slug, d]),
)

export const dungeonList = dungeonIndex as DungeonSummary[]
const spells = spellData as unknown as Record<string, Spell>

export function getDungeon(slug: string): Dungeon | undefined {
  return dungeons.get(slug)
}

export function getSpell(id: number): Spell | undefined {
  return spells[String(id)]
}

/** Clé stable d'un clone dans un donjon. */
export const cloneKey = (enemyIdx: number, cloneIdx: number) => `${enemyIdx}:${cloneIdx}`

export const parseCloneKey = (key: string): CloneRef => {
  const [enemyIdx, cloneIdx] = key.split(':').map(Number)
  return { enemyIdx, cloneIdx }
}

export interface DungeonLookup {
  dungeon: Dungeon
  /** mdtIdx -> mob. Les index MDT sont sparses, donc pas d'accès par position. */
  enemyByIdx: Map<number, Enemy>
  cloneByKey: Map<string, { enemy: Enemy; clone: Clone }>
  packs: Map<number, Pack>
  /** Clones isolés (`g` nul), chacun se pull seul. */
  loners: CloneRef[]
  enemyById: Map<number, Enemy>
}

const lookupCache = new Map<string, DungeonLookup>()

export function getLookup(slug: string): DungeonLookup | undefined {
  const cached = lookupCache.get(slug)
  if (cached) return cached

  const dungeon = dungeons.get(slug)
  if (!dungeon) return undefined

  const enemyByIdx = new Map<number, Enemy>()
  const enemyById = new Map<number, Enemy>()
  const cloneByKey = new Map<string, { enemy: Enemy; clone: Clone }>()
  const packMembers = new Map<number, CloneRef[]>()
  const loners: CloneRef[] = []

  for (const enemy of dungeon.enemies) {
    enemyByIdx.set(enemy.mdtIdx, enemy)
    if (!enemyById.has(enemy.id)) enemyById.set(enemy.id, enemy)
    for (const clone of enemy.clones) {
      cloneByKey.set(cloneKey(enemy.mdtIdx, clone.mdtIdx), { enemy, clone })
      const ref = { enemyIdx: enemy.mdtIdx, cloneIdx: clone.mdtIdx }
      if (clone.g == null) loners.push(ref)
      else {
        const list = packMembers.get(clone.g)
        if (list) list.push(ref)
        else packMembers.set(clone.g, [ref])
      }
    }
  }

  const packs = new Map<number, Pack>()
  for (const [g, members] of packMembers) {
    const points = members.map((m) => {
      const entry = cloneByKey.get(cloneKey(m.enemyIdx, m.cloneIdx))!
      return toPixels(entry.clone.x, entry.clone.y)
    })
    const count = members.reduce(
      (n, m) => n + (cloneByKey.get(cloneKey(m.enemyIdx, m.cloneIdx))!.enemy.count ?? 0),
      0,
    )
    packs.set(g, {
      g,
      members,
      count,
      center: {
        x: points.reduce((s, p) => s + p.x, 0) / points.length,
        y: points.reduce((s, p) => s + p.y, 0) / points.length,
      },
      hull: expandPolygon(convexHull(points), 26),
    })
  }

  const lookup: DungeonLookup = { dungeon, enemyByIdx, enemyById, cloneByKey, packs, loners }
  lookupCache.set(slug, lookup)
  return lookup
}

/** Forces apportées par un ensemble de clones. */
export function countForces(lookup: DungeonLookup, refs: Iterable<CloneRef>): number {
  let total = 0
  for (const ref of refs) {
    const entry = lookup.cloneByKey.get(cloneKey(ref.enemyIdx, ref.cloneIdx))
    if (entry) total += entry.enemy.count
  }
  return total
}

export const iconUrl = (icon: string) => `${import.meta.env.BASE_URL}icons/${icon}.jpg`
export const portraitUrl = (displayId: number) =>
  `${import.meta.env.BASE_URL}portraits/${displayId}.webp`
export const mapUrl = (slug: string) => `${import.meta.env.BASE_URL}maps/${slug}.webp`
