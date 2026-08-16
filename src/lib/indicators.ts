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
import { getMobContent, type Threat } from './content'
import { getSpell } from './data'
import { DEFAULT_LOCALE, type Locale } from './i18n/locales'

export interface MobIndicators {
  threat?: Threat
  /** At least one spell to interrupt. */
  kick: boolean
  kickSpells: number[]
  /** Dispel types present on its spells (magic, curse, enrage…). */
  dispel: string[]
  /** Big hit on the tank — declared via `tag: tank` in the frontmatter. */
  tankBuster: boolean
  /** Focus first: boss, miniboss, or high threat. */
  priority: boolean
  hasTrap: boolean
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
  const dispel = new Set<string>()

  for (const spell of enemy.spells) {
    const note = notes.get(spell.id)
    // MDT marks interruptibility explicitly; a manual annotation wins over it.
    if (spell.interruptible || note?.tag === 'kick') kickSpells.push(spell.id)
    for (const d of spell.dispel ?? []) dispel.add(d)
    // Sits alongside MDT's own dispel types (magic, curse, enrage), which are English data:
    // this marker stays a plain value rather than a translation key, for consistency.
    if (note?.tag === 'dispel') dispel.add('manual')
  }

  const tankBuster = [...notes.values()].some((n) => n.tag === 'tank')
  const threat = content?.threat
  const priority =
    enemy.isBoss === true ||
    content?.role === 'miniboss' ||
    threat === 'lethal' ||
    threat === 'high'

  const indicators: MobIndicators = {
    threat,
    kick: kickSpells.length > 0,
    kickSpells,
    dispel: [...dispel],
    tankBuster,
    priority,
    hasTrap: Boolean(content?.trap),
    ring: enemy.isBoss ? BOSS_RING : threat ? THREAT_RING[threat] : NEUTRAL_RING,
  }

  cache.set(key, indicators)
  return indicators
}

/**
 * Spells to interrupt, sorted by declared priority then by name — for the pull briefing.
 *
 * `locale` picks the spell names and drives the alphabetical tie-break, which is not the same
 * order from one language to the next.
 */
export function kickList(
  slug: string,
  enemy: Enemy,
  locale: Locale = DEFAULT_LOCALE,
): { id: number; name: string; prio?: number }[] {
  const content = getMobContent(slug, enemy.id, locale)
  const notes = new Map((content?.spells ?? []).map((s) => [Number(s.id), s]))
  return getIndicators(slug, enemy, locale)
    .kickSpells.map((id) => ({
      id,
      name: getSpell(id, locale)?.name ?? `#${id}`,
      prio: notes.get(id)?.prio,
    }))
    .sort((a, b) => (a.prio ?? 99) - (b.prio ?? 99) || a.name.localeCompare(b.name, locale))
}
