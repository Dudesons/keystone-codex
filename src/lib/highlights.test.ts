// ABOUTME: Tests the highlights derivation against the real content/ and the real MDT data.
// ABOUTME: Landmarks are chosen from what the codex actually contains, not from invented mobs.

import { describe, expect, it } from 'vitest'
import { getHighlights, orderBosses, type HighlightMob } from './highlights'
import { getLookup } from './data'

/**
 * Two landmarks, both real:
 *
 * - Twinfang Harrower (Altar of Fangs) carries five spell entries under three names —
 *   `Duostrike`, `Paralyzing Shots`, and `Toxic Breath` — of which only `Duostrike` and
 *   `Paralyzing Shots` are `prio: 1`. It is the case that shows a row carrying every one of
 *   the mob's prio-1 spells while the filter drops the rest.
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

  it('keeps only the mobs a group has to plan around', () => {
    // The shortlist: lethal, high, medium, or a miniboss. Everything else is out, including a
    // mob nobody has rated — the codex fills in gradually, and an unrated mob comes back the
    // day someone writes its threat.
    for (const mob of getHighlights(VOIDSCAR).mobs) {
      const kept =
        mob.threat === 'lethal' ||
        mob.threat === 'high' ||
        mob.threat === 'medium' ||
        mob.role === 'miniboss'
      expect(kept, `${mob.name} (threat ${mob.threat}, role ${mob.role})`).toBe(true)
    }
  })

  it('drops a mob rated harmless even though it has a prio-1 spell', () => {
    // Blistercreep is `threat: low` and carries one, so it proves the cut fires rather than
    // merely never having anything to cut.
    const all = getLookup(VOIDSCAR)!.enemyById
    expect(all.has(243736)).toBe(true)
    expect(getHighlights(VOIDSCAR).mobs.map((m) => m.npcId)).not.toContain(243736)
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

  it('names the mobs in the reader’s language, as every other view does', () => {
    // MDT only knows English names; Wowhead supplies the rest, and `getNpcLabel` is what the
    // codex, the map and the route panel all call. A briefing naming its mobs in English beside
    // a French codex would be the one place the app disagreed with itself.
    const en = getHighlights(ALTAR, 'en').mobs.find((m) => m.npcId === TWINFANG)!
    const fr = getHighlights(ALTAR, 'fr').mobs.find((m) => m.npcId === TWINFANG)!
    expect(en.name).toBe('Twinfang Harrower')
    expect(fr.name).toBe('Persécuteur crochet-double')
  })

  it('localizes the boss names and the mob names in the trap list too', () => {
    const fr = getHighlights(ALTAR, 'fr')
    expect(fr.bosses.map((b) => b.name)).toContain("L'Ophidien ondulant")
    expect(fr.traps.map((t) => t.mobName)).toContain('Persécuteur crochet-double')
  })

  it('returns empty lists for a dungeon that does not exist', () => {
    expect(getHighlights('no-such-dungeon')).toEqual({ mobs: [], traps: [], bosses: [] })
  })
})

describe('getHighlights traps', () => {
  it('collects the written trap sentences, rendered as inline HTML', () => {
    const traps = getHighlights(ALTAR).traps
    expect(traps.length).toBeGreaterThan(0)
    const twinfang = traps.find((t) => t.npcId === TWINFANG)!
    expect(twinfang.mobName).toBe('Twinfang Harrower')
    expect(twinfang.html).toContain('Duostrike')
    // Inline markdown: emphasis becomes a tag, and no <p> wrapper fights the layout.
    expect(twinfang.html).not.toContain('<p>')
  })

  it('leaves the bosses out: their trap is on their own card', () => {
    const bossIds = new Set(
      getLookup(ALTAR)!.dungeon.enemies.filter((e) => e.isBoss).map((e) => e.id),
    )
    for (const trap of getHighlights(ALTAR).traps) expect(bossIds.has(trap.npcId)).toBe(false)
  })

  it('puts the most dangerous first', () => {
    const rank = { lethal: 0, high: 1, medium: 2, low: 3 } as Record<string, number>
    const ranks = getHighlights(ALTAR).traps.map((t) => (t.threat ? rank[t.threat] : 4))
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks)
  })
})

describe('getHighlights bosses', () => {
  it('follows mdtIdx where no order is declared', () => {
    expect(getHighlights(ALTAR).bosses.map((b) => b.name)).toEqual([
      "Rav'i",
      'The Writhing Coil',
      "Zul'jan",
    ])
  })

  it('follows the declared order where there is one', () => {
    // King's Rest declares it because mdtIdx puts King Dazar, its last boss, third.
    expect(getHighlights('kings-rest').bosses.map((b) => b.npcId)).toEqual([
      135322, 134993, 269808, 269810, 269811, 136160,
    ])
  })

  it('gives each boss its trap and its own prio-1 spells', () => {
    const ravi = getHighlights(ALTAR).bosses.find((b) => b.npcId === 259445)!
    expect(ravi.spells.length).toBeGreaterThan(0)
    expect(ravi.displayId).toBeTypeOf('number')
  })
})

/**
 * `orderBosses` exercised directly on plain data, the same precedent as `inlineMarkdown` and
 * `isRole` in `content.test.ts` and `npcIdList`: no real `_dungeon.md` declares an incomplete
 * or a stale boss list, so the branches that guard against exactly those two cases have no
 * path to a test through `getHighlights` and real content alone.
 */
describe('orderBosses', () => {
  const mob = (npcId: number): HighlightMob => ({ npcId, name: `#${npcId}`, spells: [] })

  it('falls back to mdtIdx order when nothing is declared', () => {
    const byIdx = [10, 20, 30]
    const bosses = [mob(30), mob(10), mob(20)]
    expect(orderBosses(bosses, byIdx).map((b) => b.npcId)).toEqual([10, 20, 30])
  })

  it('keeps an omitted boss in its mdtIdx place, after the declared ones', () => {
    const byIdx = [10, 20, 30]
    const bosses = [mob(10), mob(20), mob(30)]
    // Declares 30 then 10, leaving 20 out entirely — a partial list, not a complete one.
    const ordered = orderBosses(bosses, byIdx, [30, 10])
    expect(ordered.map((b) => b.npcId)).toEqual([30, 10, 20])
  })

  it('ignores a declared id absent from the dungeon: no crash, no phantom entry', () => {
    const byIdx = [10, 20, 30]
    const bosses = [mob(10), mob(20), mob(30)]
    // 999 is a stale id from a season change — no boss of this dungeon carries it.
    const ordered = orderBosses(bosses, byIdx, [999, 20, 10])
    expect(ordered).toHaveLength(3)
    expect(ordered.map((b) => b.npcId)).toEqual([20, 10, 30])
  })
})
