// ABOUTME: Access to the MDT data extracted into src/data/generated/, all loaded up front.
// ABOUTME: Resolves dungeons, lookups, spells per language, and the asset and Wowhead URLs.

/**
 * Access to the data extracted from MDT.
 *
 * The whole set weighs about a megabyte of JSON, so everything is loaded up front: it avoids
 * loading states in the UI for a negligible cost.
 */

import type { Clone, CloneRef, Dungeon, DungeonSummary, Enemy, Pack, Spell, SpellEntry } from './types'
import { convexHull, expandPolygon, toPixels } from './geometry'
import { DEFAULT_LOCALE, type Locale } from './i18n/locales'
import dungeonIndex from '../data/generated/dungeons.json'
import spellData from '../data/generated/spells.json'

const modules = import.meta.glob<Dungeon>('../data/generated/*.json', {
  eager: true,
  import: 'default',
})

/** Dungeon files are the ones carrying an `enemies` list (excludes dungeons/spells). */
const dungeons = new Map<string, Dungeon>(
  Object.values(modules)
    .filter((m): m is Dungeon => Array.isArray((m as Dungeon)?.enemies))
    .map((d) => [d.slug, d]),
)

export const dungeonList = dungeonIndex as DungeonSummary[]
const spells = spellData as unknown as Record<string, SpellEntry>

export function getDungeon(slug: string): Dungeon | undefined {
  return dungeons.get(slug)
}

/**
 * A spell in the requested language, falling back to the default one.
 *
 * A locale can be missing a spell entirely — Wowhead does not translate everything, and a
 * fresh spell shows up in English first — so the fallback is the normal path, not an error.
 */
export function getSpell(id: number, locale: Locale = DEFAULT_LOCALE): Spell | undefined {
  const entry = spells[String(id)]
  if (!entry) return undefined
  const text = entry.text[locale] ?? entry.text[DEFAULT_LOCALE]
  if (!text) return undefined
  return { id: entry.id, icon: entry.icon, ...text }
}

/** Stable key of a clone within a dungeon. */
export const cloneKey = (enemyIdx: number, cloneIdx: number) => `${enemyIdx}:${cloneIdx}`

export const parseCloneKey = (key: string): CloneRef => {
  const [enemyIdx, cloneIdx] = key.split(':').map(Number)
  return { enemyIdx, cloneIdx }
}

export interface DungeonLookup {
  dungeon: Dungeon
  /** mdtIdx -> mob. MDT indices are sparse, so no access by position. */
  enemyByIdx: Map<number, Enemy>
  cloneByKey: Map<string, { enemy: Enemy; clone: Clone }>
  packs: Map<number, Pack>
  /** Lone clones (`g` null), each pulled on its own. */
  loners: CloneRef[]
  enemyById: Map<number, Enemy>
  /**
   * Whether MDT declares any CC at all for this dungeon.
   *
   * A mob's empty `cc` list is ambiguous on its own: it reads the same whether MDT knows the
   * mob resists everything or simply has nothing on file. The dungeon settles it — MDT fills
   * CC in per dungeon, so a pool where not one mob declares anything is an unfilled dungeon,
   * not a pool of universally immune mobs.
   */
  hasCcData: boolean
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

  const lookup: DungeonLookup = {
    dungeon,
    enemyByIdx,
    enemyById,
    cloneByKey,
    packs,
    loners,
    hasCcData: dungeon.enemies.some((e) => e.cc.length > 0),
  }
  lookupCache.set(slug, lookup)
  return lookup
}

/** Forces contributed by a set of clones. */
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

/**
 * Wowhead in the reader's language. English lives at the root of the domain and takes no
 * prefix, every other language gets one — hence the special case rather than a plain join.
 */
export const wowheadUrl = (spellId: number, locale: Locale = DEFAULT_LOCALE) =>
  `https://www.wowhead.com/${locale === 'en' ? '' : `${locale}/`}spell=${spellId}`
