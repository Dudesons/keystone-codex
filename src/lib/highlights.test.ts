// ABOUTME: Tests the highlights derivation against the real content/ and the real MDT data.
// ABOUTME: Landmarks are chosen from what the codex actually contains, not from invented mobs.

import { describe, expect, it } from 'vitest'
import { getHighlights, orderBosses, type HighlightMob } from './highlights'
import { getLookup } from './data'
import { getIndicators } from './indicators'
import { getMobContent } from './content'

/**
 * Landmarks, all real:
 *
 * - Twinfang Harrower (Altar of Fangs) carries five spell entries under three names —
 *   `Duostrike`, `Paralyzing Shots`, and `Toxic Breath` — of which only `Duostrike` and
 *   `Paralyzing Shots` are `prio: 1`. It is the case that shows a row carrying every one of
 *   the mob's prio-1 spells while the filter drops the rest. It is also `threat: medium` and
 *   `role: miniboss` with a written `trap:`, which is what makes it earn a row and carry its
 *   trap there instead of in the trap list.
 * - Agitated Voidscythe (Voidscar Arena) carries `Rip and Slice` under two ids, 1311778
 *   tagged `tank` and 1233472 tagged `dodge` — the only kind of case where deduplication
 *   changes anything, and it must merge the tags rather than pick one.
 * - Unleashed Imp (Murder Row) is `threat: low`, so it earns no row, yet it carries a written
 *   `trap:` — the case that must still surface in the trap list rather than vanish with it.
 */
const ALTAR = 'altar-of-fangs'
const VOIDSCAR = 'voidscar-arena'
const MURDER_ROW = 'murder-row'
const TWINFANG = 261554
const VOIDSCYTHE = 263228
const UNLEASHED_IMP = 234849

describe('getHighlights mobs', () => {
  it('makes a row of the mob, carrying every prio-1 spell it has', () => {
    const row = getHighlights(ALTAR).mobs.find((m) => m.npcId === TWINFANG)!
    expect(row).toBeDefined()
    expect(row.name).toBe('Twinfang Harrower')
    expect(row.threat).toBe('medium')
    expect(row.spells.map((s) => s.name).sort()).toEqual(['Duostrike', 'Paralyzing Shots'])
  })

  it('fills the row with its trap, and keeps that mob out of the trap list', () => {
    const highlights = getHighlights(ALTAR)
    const row = highlights.mobs.find((m) => m.npcId === TWINFANG)!
    expect(row.trapHtml).toContain('Duostrike')
    // Inline markdown: emphasis becomes a tag, and no <p> wrapper fights the layout.
    expect(row.trapHtml).not.toContain('<p>')
    expect(highlights.traps.map((t) => t.npcId)).not.toContain(TWINFANG)
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
    // Altar of Fangs has no leftover trap left to name (every one of its non-boss traps now
    // earns a row), so the trap-list landmark comes from Murder Row instead.
    const frMurderRow = getHighlights(MURDER_ROW, 'fr')
    expect(frMurderRow.traps.map((t) => t.mobName)).toContain('Diablotin déchaîné')
  })

  it('returns empty lists for a dungeon that does not exist', () => {
    expect(getHighlights('no-such-dungeon')).toEqual({ mobs: [], traps: [], bosses: [], tips: [] })
  })
})

describe('getHighlights traps', () => {
  it('collects the written trap sentences of mobs that earned no row, as inline HTML', () => {
    const highlights = getHighlights(MURDER_ROW)
    const traps = highlights.traps
    expect(traps.length).toBeGreaterThan(0)
    const imp = traps.find((t) => t.npcId === UNLEASHED_IMP)!
    expect(imp.mobName).toBe('Unleashed Imp')
    expect(imp.html).toContain('Fifty-eight imps')
    // Inline markdown: emphasis becomes a tag, and no <p> wrapper fights the layout.
    expect(imp.html).not.toContain('<p>')
    // Unleashed Imp is `threat: low`, so it never earns a row in the first place.
    expect(highlights.mobs.map((m) => m.npcId)).not.toContain(UNLEASHED_IMP)
  })

  it('leaves out a mob that did earn a row: its trap sits there instead', () => {
    expect(getHighlights(ALTAR).traps.map((t) => t.npcId)).not.toContain(TWINFANG)
  })

  it('leaves the bosses out: their trap is on their own card', () => {
    const bossIds = new Set(
      getLookup(ALTAR)!.dungeon.enemies.filter((e) => e.isBoss).map((e) => e.id),
    )
    for (const trap of getHighlights(ALTAR).traps) expect(bossIds.has(trap.npcId)).toBe(false)
  })

  it('puts the most dangerous first', () => {
    const rank = { lethal: 0, high: 1, medium: 2, low: 3 } as Record<string, number>
    const ranks = getHighlights(MURDER_ROW).traps.map((t) => (t.threat ? rank[t.threat] : 4))
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

describe('tips', () => {
  it('lists a mob whose card carries tips', () => {
    const { tips } = getHighlights('the-blinding-vale')
    expect(tips.map((x) => x.npcId)).toContain(254_850)
  })

  it('carries the tips themselves, not a flag', () => {
    const { tips } = getHighlights('the-blinding-vale')
    const entry = tips.find((x) => x.npcId === 254_850)!
    expect(entry.tips).toEqual(getMobContent('the-blinding-vale', 254_850)!.tips)
  })

  it('names the mob in the reader’s language', () => {
    const en = getHighlights('the-blinding-vale').tips.find((x) => x.npcId === 254_850)!
    const fr = getHighlights('the-blinding-vale', 'fr').tips.find((x) => x.npcId === 254_850)!
    expect(fr.mobName).not.toBe(en.mobName)
  })

  it('builds from every mob with tips, not only the ones the shortlist keeps', () => {
    // What this proves: every mob whose content carries tips reaches the list, and none is
    // dropped or duplicated — counted independently of getHighlights, by walking enemyById and
    // getMobContent directly rather than reading getHighlights' own mobs/bosses lists.
    //
    // What this cannot prove today: 254850 (Sporeblight Belcher) is the only mob in this
    // dungeon's real content carrying tips, and it is both shortlisted (`threat: high` alone
    // satisfies earnsARow) and non-boss. So an implementation that gated the push with
    // `&& hasRow`, or one that pushed only after the `isBoss` branch (excluding bosses), would
    // produce the same count on this dataset and this test would not catch it. Closing that gap
    // needs a real card in the differentiating cell — a tipped mob that is a boss, or a tipped
    // mob the shortlist drops (unrated, or rated below `medium`/non-miniboss) — and there isn't
    // one yet.
    const slug = 'the-blinding-vale'
    const { tips } = getHighlights(slug)
    const withTips = [...getLookup(slug)!.enemyById.values()].filter(
      (e) => (getMobContent(slug, e.id)?.tips?.length ?? 0) > 0,
    )
    expect(tips.length).toBe(withTips.length)
  })
})

describe('Rank on a row', () => {
  /**
   * `'rank' in row` rather than a value: no card declares a rank yet, so every row's would be
   * `undefined` either way and an assertion on the value would pass before the field existed.
   * What this pins is that the row carries it at all. The assertion with a value in it lands
   * with the content that makes one, in the task that migrates the cards.
   */
  it('puts the rank on a row so the table can mark it in place', () => {
    const rows = getHighlights(ALTAR).mobs
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect('rank' in row, String(row.npcId)).toBe(true)
  })

  it('never lets a boss reach the mob rows, whichever source said so', () => {
    // The boss branch runs first and continues, so a rank found among the rows can only ever
    // be a miniboss. That is what lets `MobTable` mark one in place instead of filtering.
    for (const row of getHighlights(ALTAR).mobs) {
      expect(row.rank, String(row.npcId)).not.toBe('boss')
    }
  })

  it('builds the boss strip from the same derivation the codex uses', () => {
    const strip = getHighlights(ALTAR).bosses.map((b) => b.npcId).sort()
    const byRank = getLookup(ALTAR)!
      .dungeon.enemies.filter((e) => getIndicators(ALTAR, e).rank === 'boss')
      .map((e) => e.id)
      .sort()
    expect(strip.length).toBeGreaterThan(0)
    expect(strip).toEqual(byRank)
  })
})
