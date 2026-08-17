// ABOUTME: Tests the highlights derivation against the real content/ and the real MDT data.
// ABOUTME: Landmarks are chosen from what the codex actually contains, not from invented mobs.

import { describe, expect, it } from 'vitest'
import { getHighlights } from './highlights'
import { getLookup } from './data'

/**
 * Two landmarks, both real:
 *
 * - Twinfang Harrower (Altar of Fangs) carries five `Paralyzing Shots` ids, of which exactly
 *   one is `prio: 1` — the case that shows the filter runs before deduplication.
 * - Agitated Voidscythe (Voidscar Arena) carries `Rip and Slice` under two ids, 1311778
 *   tagged `tank` and 1233472 tagged `dodge` — the only kind of case where deduplication
 *   changes anything, and it must merge the tags rather than pick one.
 */
const ALTAR = 'altar-of-fangs'
const VOIDSCAR = 'voidscar-arena'
const TWINFANG = 261554
const VOIDSCYTHE = 263228

describe('getHighlights mobs', () => {
  it('makes a row of the mob, carrying every prio-1 spell it has', () => {
    const row = getHighlights(ALTAR).mobs.find((m) => m.npcId === TWINFANG)!
    expect(row).toBeDefined()
    expect(row.name).toBe('Twinfang Harrower')
    expect(row.threat).toBe('medium')
    expect(row.spells.map((s) => s.name).sort()).toEqual(['Duostrike', 'Paralyzing Shots'])
  })

  it('merges the ids that share a name into one chip, keeping both tags', () => {
    const row = getHighlights(VOIDSCAR).mobs.find((m) => m.npcId === VOIDSCYTHE)!
    const chip = row.spells.find((s) => s.name === 'Rip and Slice')!
    expect(chip.ids.sort()).toEqual([1233472, 1311778])
    expect([...chip.tags].sort()).toEqual(['dodge', 'tank'])
  })

  it('leaves the bosses out: they have their own block', () => {
    const bossIds = new Set(
      getLookup(ALTAR)!.dungeon.enemies.filter((e) => e.isBoss).map((e) => e.id),
    )
    expect(bossIds.size).toBeGreaterThan(0)
    for (const mob of getHighlights(ALTAR).mobs) expect(bossIds.has(mob.npcId)).toBe(false)
  })

  it('omits a mob with no prio-1 spell rather than showing an empty row', () => {
    for (const mob of getHighlights(ALTAR).mobs) expect(mob.spells.length).toBeGreaterThan(0)
  })

  it('puts the most dangerous first', () => {
    const rank = { lethal: 0, high: 1, medium: 2, low: 3 } as Record<string, number>
    const ranks = getHighlights(VOIDSCAR).mobs.map((m) => (m.threat ? rank[m.threat] : 4))
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks)
  })

  it('carries what MDT knows about the spell alongside the written tag', () => {
    const chips = getHighlights(VOIDSCAR).mobs.flatMap((m) => m.spells)
    expect(chips.some((s) => s.interruptible)).toBe(true)
    expect(chips.some((s) => s.dispel.length > 0)).toBe(true)
  })

  it('names the spells in the reader’s language', () => {
    const en = getHighlights(VOIDSCAR, 'en').mobs.find((m) => m.npcId === VOIDSCYTHE)!
    const fr = getHighlights(VOIDSCAR, 'fr').mobs.find((m) => m.npcId === VOIDSCYTHE)!
    expect(en.spells.map((s) => s.name)).toContain('Rip and Slice')
    expect(fr.spells.map((s) => s.name)).toContain('Déchirure et taillade')
  })

  it('returns empty lists for a dungeon that does not exist', () => {
    expect(getHighlights('no-such-dungeon')).toEqual({ mobs: [], traps: [], bosses: [] })
  })
})
