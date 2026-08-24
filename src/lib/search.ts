// ABOUTME: The index behind the search palette: every mob, its names, its ids and its spells.
// ABOUTME: One entry per mob; a spell match resolves to the mobs that cast it.

/**
 * Searching the codex.
 *
 * Every result is a mob, because a mob already has an address — `/d/<slug>/codex/mob/<npcId>` —
 * and a spell has none. A spell match therefore resolves to the mobs that cast it, which is also
 * the question behind searching for one: where do I meet this.
 *
 * The index is built from data the app already holds in memory, so it costs one pass and no
 * network. It is cached per locale, like `getLookup` and `getIndicators`, because a mob's name
 * and its spells' names both change with the language.
 */

import { dungeonList, getLookup, getNpcLabel, getSpell } from './data'
import { getIndicators } from './indicators'
import { DEFAULT_LOCALE, type Locale } from './i18n/locales'
import type { Rank, Threat } from './content'
import type { Enemy } from './types'

/** Rows shown at once. The total is reported alongside, so a cap never reads as "that is all". */
export const SEARCH_LIMIT = 20

export interface SearchHit {
  slug: string
  dungeonName: string
  npcId: number
  name: string
  displayId?: number
  threat?: Threat
  rank?: Rank
  /** The spell that matched, set only when the mob's own name did not. */
  viaSpell?: string
}

export interface SearchResults {
  /** At most `SEARCH_LIMIT` of them. */
  hits: SearchHit[]
  total: number
}

/**
 * Folds a string to what a reader can be expected to type: no case, no accents, no punctuation,
 * no spaces. `Nal'orakk`, `nal orakk` and `nalorakk` all fold to the same thing, which is the
 * point — a name is read in a guide and typed from memory.
 */
export const foldForSearch = (text: string): string =>
  text
    .normalize('NFD')
    // Written as escapes rather than as the literal combining marks, which are invisible in an
    // editor and survive a copy only by luck.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

interface IndexedSpell {
  id: number
  name: string
  folded: string
}

interface Entry {
  slug: string
  dungeonName: string
  enemy: Enemy
  label: string
  /** The localized name and the English one, folded. Often identical, sometimes not. */
  folded: string[]
  spells: IndexedSpell[]
  threat?: Threat
  rank?: Rank
}

const indexCache = new Map<Locale, Entry[]>()

function buildIndex(locale: Locale): Entry[] {
  const entries: Entry[] = []

  for (const summary of dungeonList) {
    const lookup = getLookup(summary.slug)
    if (!lookup) continue

    // `enemyById` holds one row per npc id. `dungeon.enemies` repeats a mob that MDT lists
    // twice, and a mob is one card, so it would be one hit shown twice.
    for (const enemy of lookup.enemyById.values()) {
      const label = getNpcLabel(enemy, locale).name
      const { threat, rank } = getIndicators(summary.slug, enemy, locale)

      const spells: IndexedSpell[] = []
      for (const ref of enemy.spells) {
        // MDT references spells Wowhead has no entry for; an unnamed spell is still searchable
        // by its id, which is why the id is kept whatever the name turns out to be.
        const name = getSpell(ref.id, locale)?.name ?? ''
        spells.push({ id: ref.id, name, folded: foldForSearch(name) })
      }

      entries.push({
        slug: summary.slug,
        dungeonName: summary.englishName,
        enemy,
        label,
        folded: [...new Set([foldForSearch(label), foldForSearch(enemy.name)])].filter(Boolean),
        spells,
        threat,
        rank,
      })
    }
  }

  return entries
}

function getIndex(locale: Locale): Entry[] {
  const cached = indexCache.get(locale)
  if (cached) return cached
  const built = buildIndex(locale)
  indexCache.set(locale, built)
  return built
}

/**
 * Ranking tiers, best first. Determinism is what lets a test pin an order at all, so the sort
 * falls through to the mob's own name rather than leaving ties to iteration order.
 */
const EXACT = 0
const PREFIX = 1
const CONTAINS = 2
const VIA_SPELL = 3

interface Scored {
  entry: Entry
  tier: number
  viaSpell?: string
}

/** A mob's own name against the folded query. Returns nothing when no name matches. */
function nameTier(entry: Entry, folded: string): number | undefined {
  let best: number | undefined
  for (const name of entry.folded) {
    const tier =
      name === folded
        ? EXACT
        : name.startsWith(folded)
          ? PREFIX
          : name.includes(folded)
            ? CONTAINS
            : undefined
    if (tier !== undefined && (best === undefined || tier < best)) best = tier
  }
  return best
}

function scoreByName(entries: Entry[], folded: string): Scored[] {
  const scored: Scored[] = []
  for (const entry of entries) {
    const tier = nameTier(entry, folded)
    if (tier !== undefined) {
      scored.push({ entry, tier })
      continue
    }
    const spell = entry.spells.find((s) => s.folded && s.folded.includes(folded))
    if (spell) scored.push({ entry, tier: VIA_SPELL, viaSpell: spell.name })
  }
  return scored
}

/** An id is pasted, not explored, so it matches exactly or not at all. */
function scoreById(entries: Entry[], id: number): Scored[] {
  const scored: Scored[] = []
  for (const entry of entries) {
    if (entry.enemy.id === id) {
      scored.push({ entry, tier: EXACT })
      continue
    }
    const spell = entry.spells.find((s) => s.id === id)
    // A spell with no Wowhead entry still matches its id; the row falls back to the id itself
    // rather than claiming an empty name.
    if (spell) scored.push({ entry, tier: VIA_SPELL, viaSpell: spell.name || String(spell.id) })
  }
  return scored
}

const toHit = ({ entry, viaSpell }: Scored): SearchHit => ({
  slug: entry.slug,
  dungeonName: entry.dungeonName,
  npcId: entry.enemy.id,
  name: entry.label,
  displayId: entry.enemy.displayId,
  threat: entry.threat,
  rank: entry.rank,
  viaSpell,
})

export function search(
  query: string,
  locale: Locale = DEFAULT_LOCALE,
  currentSlug?: string,
): SearchResults {
  const trimmed = query.trim()
  if (!trimmed) return { hits: [], total: 0 }

  const entries = getIndex(locale)
  let scored: Scored[]

  if (/^\d+$/.test(trimmed)) {
    scored = scoreById(entries, Number(trimmed))
  } else {
    const folded = foldForSearch(trimmed)
    // An all-punctuation query folds to nothing, and `''.startsWith('')` is true — so without
    // this the whole corpus comes back. Checked before scoring, not after.
    if (!folded) return { hits: [], total: 0 }
    scored = scoreByName(entries, folded)
  }

  scored.sort(
    (a, b) =>
      a.tier - b.tier ||
      Number(b.entry.slug === currentSlug) - Number(a.entry.slug === currentSlug) ||
      a.entry.label.localeCompare(b.entry.label) ||
      a.entry.enemy.id - b.entry.enemy.id,
  )

  return { hits: scored.slice(0, SEARCH_LIMIT).map(toHit), total: scored.length }
}
