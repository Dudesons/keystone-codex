// ABOUTME: A mob's indicators: what shows as pips on the map and badges in the codex.
// ABOUTME: Combines what MDT already knows with what the written entry declares.

/**
 * A mob's indicators: what shows up as pips on the map and in the codex.
 *
 * Two sources combine. MDT already knows which spells are **interruptible** (75 spells, 62
 * mobs) and which carry a **dispel type** (108 spells): those two badges are therefore
 * correct on first open, without writing anything. Tank buster and priority target have no
 * usable source — they come from the frontmatter, and their absence means "not assessed
 * yet", not "harmless".
 */

import type { Enemy } from './types'
import { getMobContent, type Rank, type Threat } from './content'
import { getSpell } from './data'
import { DEFAULT_LOCALE, type Locale } from './i18n/locales'

export interface MobIndicators {
  threat?: Threat
  /** At least one spell to interrupt. */
  kick: boolean
  kickSpells: number[]
  /**
   * Spells tagged `frontal`: a cone to leave rather than a patch of floor to walk out of.
   * Declared by hand, like the tank buster — MDT has no field for it.
   */
  frontalSpells: number[]
  /** Dispel types present on its spells (magic, curse, enrage…). */
  dispel: string[]
  /** Big hit on the tank — declared via `tag: tank` in the frontmatter. */
  tankBuster: boolean
  /** Focus first: boss, miniboss, or high threat. */
  priority: boolean
  hasTrap: boolean
  /** The card carries at least one tip. Locale-sensitive: a translation replaces the list whole. */
  hasTips: boolean
  /** At least one tip carries no `packs:` — it is about the mob, so every clone shows it. */
  generalTips: boolean
  /** Every pack named by a scoped tip. A clone in one of these shows the badge. */
  tipPacks: number[]
  /**
   * Boss, miniboss, or neither. The card decides; MDT's `isBoss` is the default it overrides.
   * This is the only place that derivation happens — nothing downstream reads `enemy.isBoss`.
   */
  rank?: Rank
  /** Colour of the blip's ring on the map. */
  ring: string
}

const THREAT_RING: Record<Threat, string> = {
  low: '#5b8f6a',
  medium: '#c9992f',
  high: '#d97036',
  lethal: '#cf3f52',
}

const NEUTRAL_RING = 'rgba(180,190,210,0.75)'
const BOSS_RING = '#e0b552'

const cache = new Map<string, MobIndicators>()

/**
 * `locale` is part of the key because the indicators are derived from the card: a trap or a
 * threat written in one language and not yet in the other genuinely yields different pips.
 */
export function getIndicators(
  slug: string,
  enemy: Enemy,
  locale: Locale = DEFAULT_LOCALE,
): MobIndicators {
  const key = `${locale}/${slug}/${enemy.id}`
  const hit = cache.get(key)
  if (hit) return hit

  const content = getMobContent(slug, enemy.id, locale)
  const notes = new Map((content?.spells ?? []).map((s) => [Number(s.id), s]))

  const kickSpells: number[] = []
  const frontalSpells: number[] = []
  const dispel = new Set<string>()

  for (const spell of enemy.spells) {
    const note = notes.get(spell.id)
    // MDT marks interruptibility explicitly; a manual annotation wins over it.
    if (spell.interruptible || note?.tag === 'kick') kickSpells.push(spell.id)
    if (note?.tag === 'frontal') frontalSpells.push(spell.id)
    for (const d of spell.dispel ?? []) dispel.add(d)
    // Sits alongside MDT's own dispel types (magic, curse, enrage), which are English data:
    // this marker stays a plain value rather than a translation key, for consistency.
    if (note?.tag === 'dispel') dispel.add('manual')
  }

  const tankBuster = [...notes.values()].some((n) => n.tag === 'tank')
  const threat = content?.threat
  const rank: Rank | undefined = content?.rank ?? (enemy.isBoss ? 'boss' : undefined)
  // `content.role === 'miniboss'` is the pre-migration spelling and is removed in the task that
  // retires it from `ROLES`. Both are true of the same mobs in between.
  const priority =
    rank !== undefined ||
    content?.role === 'miniboss' ||
    threat === 'lethal' ||
    threat === 'high'

  const indicators: MobIndicators = {
    threat,
    rank,
    kick: kickSpells.length > 0,
    kickSpells,
    frontalSpells,
    dispel: [...dispel],
    tankBuster,
    priority,
    hasTrap: Boolean(content?.trap),
    hasTips: Boolean(content?.tips?.length),
    generalTips: (content?.tips ?? []).some((tip) => !tip.packs?.length),
    tipPacks: [...new Set((content?.tips ?? []).flatMap((tip) => tip.packs ?? []))],
    ring: rank === 'boss' ? BOSS_RING : threat ? THREAT_RING[threat] : NEUTRAL_RING,
  }

  cache.set(key, indicators)
  return indicators
}

/** One line of a pull briefing: a named spell, and the priority the entry declared for it. */
export interface BriefingSpell {
  id: number
  name: string
  prio?: number
}

/**
 * Names a set of spell ids and sorts them by declared priority then by name.
 *
 * `locale` picks the spell names and drives the alphabetical tie-break, which is not the same
 * order from one language to the next.
 */
function briefingList(
  ids: number[],
  slug: string,
  enemy: Enemy,
  locale: Locale,
): BriefingSpell[] {
  const content = getMobContent(slug, enemy.id, locale)
  const notes = new Map((content?.spells ?? []).map((s) => [Number(s.id), s]))
  return ids
    .map((id) => ({
      id,
      name: getSpell(id, locale)?.name ?? `#${id}`,
      prio: notes.get(id)?.prio,
    }))
    .sort((a, b) => (a.prio ?? 99) - (b.prio ?? 99) || a.name.localeCompare(b.name, locale))
}

/** Spells to interrupt — for the pull briefing. */
export function kickList(slug: string, enemy: Enemy, locale: Locale = DEFAULT_LOCALE): BriefingSpell[] {
  return briefingList(getIndicators(slug, enemy, locale).kickSpells, slug, enemy, locale)
}

/**
 * The pulls something is written about, across a whole dungeon.
 *
 * A tip naming `packs:` is about the pull, not about the mob whose card happens to hold the
 * sentence — so the map marks the pull. The question is asked of the dungeon rather than of each
 * pack's members on purpose: a mob standing in 44 can carry a tip about taking 44 and 45
 * together, and both are pulls the reader should be told about.
 */
export function tippedPacks(
  slug: string,
  enemies: Enemy[],
  locale: Locale = DEFAULT_LOCALE,
): Set<number> {
  const packs = new Set<number>()
  for (const enemy of enemies) {
    for (const g of getIndicators(slug, enemy, locale).tipPacks) packs.add(g)
  }
  return packs
}

/** Frontal cones to step out of — for the pull briefing. */
export function frontalList(
  slug: string,
  enemy: Enemy,
  locale: Locale = DEFAULT_LOCALE,
): BriefingSpell[] {
  return briefingList(getIndicators(slug, enemy, locale).frontalSpells, slug, enemy, locale)
}
