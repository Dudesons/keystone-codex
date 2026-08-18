// ABOUTME: Turns a dungeon's written codex into the three lists the highlights page shows.
// ABOUTME: Pure derivation — no React, no new data: writing a mob card fills the page in.

/**
 * The dungeon briefing, derived.
 *
 * Everything here already exists one mob at a time in `content/**.md`; this module is what
 * reads it as a whole. Nothing is authored for the page itself apart from the optional
 * `bosses:` order, so a mob card written tomorrow raises the page with no code change.
 *
 * A row is a **mob**, not a spell. Measured over the real content, one row per spell puts 52
 * rows in Temple of Sethraliss against 29 per mob — and the mob is also the unit a player
 * thinks in.
 */

import type { Enemy } from './types'
import { getLookup, getNpcLabel, getSpell } from './data'
import { getDungeonContent, getMobContent, inlineMarkdown, type SpellTag, type Threat } from './content'
import { DEFAULT_LOCALE, type Locale } from './i18n/locales'

/** One chip on a mob's row. Several ids can carry one name; the chip is the name. */
export interface HighlightSpell {
  ids: number[]
  name: string
  icon: string
  tags: SpellTag[]
  /** From MDT, exactly as the codex badges use it. */
  interruptible: boolean
  dispel: string[]
}

/** A row of the table, and equally a card of the boss block — the shape is the same. */
export interface HighlightMob {
  npcId: number
  name: string
  displayId?: number
  threat?: Threat
  role?: string
  /** The `trap:` sentence as inline HTML. Filled for bosses, whose card shows it. */
  trapHtml?: string
  spells: HighlightSpell[]
}

export interface HighlightTrap {
  npcId: number
  mobName: string
  threat?: Threat
  html: string
}

export interface DungeonHighlights {
  /** Non-boss mobs holding at least one `prio: 1` spell, most dangerous first. */
  mobs: HighlightMob[]
  /** Non-boss mobs holding a `trap:` sentence — a different population from `mobs`. */
  traps: HighlightTrap[]
  /** Every boss, in the declared or the `mdtIdx` order. */
  bosses: HighlightMob[]
}

const THREAT_RANK: Record<Threat, number> = { lethal: 0, high: 1, medium: 2, low: 3 }

/** An unassessed mob sorts last: "not judged yet" is not "harmless". */
const rankOf = (threat?: Threat) => (threat ? THREAT_RANK[threat] : 4)

/**
 * A mob's `prio: 1` spells, one chip per resolved name.
 *
 * Deduplication is a correctness rule, not a volume control: measured over the whole codex it
 * merges 293 rows into 290. It exists so that two ids of one spell on one mob — Rip and Slice
 * on Agitated Voidscythe, tagged `tank` under one id and `dodge` under the other — read as one
 * chip carrying both tags, instead of as two chips contradicting each other.
 */
function chipsOf(slug: string, enemy: Enemy, locale: Locale): HighlightSpell[] {
  const content = getMobContent(slug, enemy.id, locale)
  if (!content?.spells) return []

  const mdt = new Map(enemy.spells.map((s) => [s.id, s]))
  const byName = new Map<string, HighlightSpell>()

  for (const note of content.spells) {
    if (note.prio !== 1) continue
    const id = Number(note.id)
    const spell = getSpell(id, locale)
    // Same fallback as `kickList`: a spell Wowhead has not served still has to render.
    const name = spell?.name ?? `#${id}`
    const tag = note.tag && note.tag !== 'todo' ? note.tag : undefined

    const chip = byName.get(name)
    if (!chip) {
      byName.set(name, {
        ids: [id],
        name,
        icon: spell?.icon ?? '',
        tags: tag ? [tag] : [],
        interruptible: mdt.get(id)?.interruptible === true,
        dispel: [...(mdt.get(id)?.dispel ?? [])],
      })
      continue
    }

    chip.ids.push(id)
    if (tag && !chip.tags.includes(tag)) chip.tags.push(tag)
    if (mdt.get(id)?.interruptible) chip.interruptible = true
    for (const d of mdt.get(id)?.dispel ?? []) if (!chip.dispel.includes(d)) chip.dispel.push(d)
  }

  return [...byName.values()]
}

/**
 * Boss order.
 *
 * `encounterID` groups nothing usable — the three bosses of Altar of Fangs all report 2880 —
 * so `mdtIdx` is the fallback, and a dungeon that knows better says so in `_dungeon.md`.
 * Ids the declaration does not mention keep their `mdtIdx` place at the end, so a partial or
 * stale list degrades to the fallback instead of hiding a boss.
 *
 * Exported for a direct unit test, the same precedent as `inlineMarkdown`/`isRole` in
 * `content.ts` and `npcIdList`: real content only ever exercises a complete, accurate
 * declaration (King's Rest names all six of its bosses), so the omitted-boss and
 * stale-id branches below have no path to a test through `getHighlights` alone.
 */
export function orderBosses(bosses: HighlightMob[], byIdx: number[], declared?: number[]): HighlightMob[] {
  const position = new Map(byIdx.map((id, i) => [id, i]))
  if (declared) declared.forEach((id, i) => position.set(id, i - declared.length))
  return [...bosses].sort((a, b) => (position.get(a.npcId) ?? 0) - (position.get(b.npcId) ?? 0))
}

const EMPTY: DungeonHighlights = { mobs: [], traps: [], bosses: [] }

// Keyed by locale, like `indicators.ts`: the chip names, and therefore the alphabetical
// tie-break, are not the same string from one language to the next.
const cache = new Map<string, DungeonHighlights>()

export function getHighlights(slug: string, locale: Locale = DEFAULT_LOCALE): DungeonHighlights {
  const key = `${locale}/${slug}`
  const hit = cache.get(key)
  if (hit) return hit

  const lookup = getLookup(slug)
  if (!lookup) {
    cache.set(key, EMPTY)
    return EMPTY
  }

  const mobs: HighlightMob[] = []
  const traps: HighlightTrap[] = []
  const bosses: HighlightMob[] = []
  const bossOrder: number[] = []

  // `enemyById` is already unique per NPC: the same mob appears several times in
  // `dungeon.enemies` as variants, and the codex writes it one card, not one per variant.
  for (const enemy of lookup.enemyById.values()) {
    const content = getMobContent(slug, enemy.id, locale)
    const spells = chipsOf(slug, enemy, locale)
    // Wowhead localizes creature names; MDT only has English. Every other view goes through
    // getNpcLabel, so a briefing naming its mobs in English beside a French codex would be the
    // one place the two disagree. The alphabetical tie-break below sorts on this name, which is
    // why it is resolved here rather than in the components.
    const { name } = getNpcLabel(enemy, locale)

    if (enemy.isBoss) {
      bossOrder.push(enemy.id)
      bosses.push({
        npcId: enemy.id,
        name,
        displayId: enemy.displayId,
        threat: content?.threat,
        role: content?.role,
        trapHtml: inlineMarkdown(content?.trap) || undefined,
        spells,
      })
      continue
    }

    if (spells.length) {
      mobs.push({
        npcId: enemy.id,
        name,
        displayId: enemy.displayId,
        threat: content?.threat,
        role: content?.role,
        spells,
      })
    }

    if (content?.trap) {
      traps.push({
        npcId: enemy.id,
        mobName: name,
        threat: content.threat,
        html: inlineMarkdown(content.trap),
      })
    }
  }

  mobs.sort((a, b) => rankOf(a.threat) - rankOf(b.threat) || a.name.localeCompare(b.name, locale))
  traps.sort(
    (a, b) => rankOf(a.threat) - rankOf(b.threat) || a.mobName.localeCompare(b.mobName, locale),
  )

  const highlights: DungeonHighlights = {
    mobs,
    traps,
    bosses: orderBosses(bosses, bossOrder, getDungeonContent(slug, locale)?.bosses),
  }
  cache.set(key, highlights)
  return highlights
}
