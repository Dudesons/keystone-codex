// ABOUTME: Tests the indicators derived from MDT data and written entries, and the kick list.
// ABOUTME: Runs against the real pool, so a mob whose data changes shape fails here.

import { describe, expect, it } from 'vitest'
import type { Enemy } from './types'
import { dungeonList, getDungeon, getLookup } from './data'
import { getMobContent } from './content'
import { frontalList, getIndicators, kickList, tippedPacks } from './indicators'

/**
 * `getIndicators` memoizes under the key `<locale>/<slug>/<enemy.id>`, with no invalidation.
 * Every case therefore uses an `id` of its own, otherwise the tests contaminate each other.
 */
const SLUG = 'test-dungeon' // no file under content/: only the MDT path is exercised

const NEUTRAL_RING = 'rgba(180,190,210,0.75)'
const BOSS_RING = '#e0b552'

const enemy = (over: Partial<Enemy> & { id: number }): Enemy => ({
  mdtIdx: 1,
  name: 'Test mob',
  count: 1,
  health: 100_000,
  level: 80,
  scale: 1,
  cc: [],
  spells: [],
  clones: [],
  ...over,
})

describe('getIndicators — mob with no written entry', () => {
  it('flags "to kick" as soon as MDT declares an interruptible spell', () => {
    const i = getIndicators(SLUG, enemy({
      id: 900_001,
      spells: [{ id: 11 }, { id: 12, interruptible: true }],
    }))
    expect(i.kick).toBe(true)
    expect(i.kickSpells).toEqual([12])
  })

  it('flags nothing when no spell is interruptible', () => {
    const i = getIndicators(SLUG, enemy({ id: 900_002, spells: [{ id: 21 }, { id: 22 }] }))
    expect(i.kick).toBe(false)
    expect(i.kickSpells).toEqual([])
  })

  it("collects MDT's dispel types without duplicates", () => {
    const i = getIndicators(SLUG, enemy({
      id: 900_003,
      spells: [
        { id: 31, dispel: ['magic'] },
        { id: 32, dispel: ['magic', 'enrage'] },
      ],
    }))
    expect(i.dispel.sort()).toEqual(['enrage', 'magic'])
  })

  it('leaves the threat undefined and paints the neutral ring — "not judged yet", not "harmless"', () => {
    const i = getIndicators(SLUG, enemy({ id: 900_004 }))
    expect(i.threat).toBeUndefined()
    expect(i.ring).toBe(NEUTRAL_RING)
    expect(i.priority).toBe(false)
  })

  it('infers neither tank buster nor trap: MDT has no source for either', () => {
    const i = getIndicators(SLUG, enemy({
      id: 900_005,
      spells: [{ id: 51, interruptible: true }],
    }))
    expect(i.tankBuster).toBe(false)
    expect(i.hasTrap).toBe(false)
  })

  it('treats a boss as priority and gives it the golden ring', () => {
    const i = getIndicators(SLUG, enemy({ id: 900_006, isBoss: true }))
    expect(i.priority).toBe(true)
    expect(i.ring).toBe(BOSS_RING)
    // The boss stays threat-less until someone has judged it.
    expect(i.threat).toBeUndefined()
  })
})

describe('getIndicators — memoization', () => {
  it('hands back the same instance for an already-computed mob', () => {
    const e = enemy({ id: 900_010, spells: [{ id: 101, interruptible: true }] })
    expect(getIndicators(SLUG, e)).toBe(getIndicators(SLUG, e))
  })

  it('keeps dungeons apart: the cache key carries the slug', () => {
    const e = enemy({ id: 900_011, spells: [{ id: 111, interruptible: true }] })
    expect(getIndicators(SLUG, e)).not.toBe(getIndicators('other-test-dungeon', e))
  })
})

describe('kickList', () => {
  it('keeps only the spells to kick', () => {
    const list = kickList(SLUG, enemy({
      id: 900_020,
      spells: [{ id: 201 }, { id: 202, interruptible: true }, { id: 203 }],
    }))
    expect(list.map((s) => s.id)).toEqual([202])
  })

  it('names spells missing from spells.json by their identifier', () => {
    const list = kickList(SLUG, enemy({
      id: 900_021,
      spells: [{ id: 999_001, interruptible: true }],
    }))
    expect(list[0].name).toBe('#999001')
  })

  it('sorts by name in the absence of a declared priority', () => {
    const list = kickList(SLUG, enemy({
      id: 900_022,
      spells: [
        { id: 999_030, interruptible: true },
        { id: 999_010, interruptible: true },
        { id: 999_020, interruptible: true },
      ],
    }))
    expect(list.map((s) => s.name)).toEqual(['#999010', '#999020', '#999030'])
    expect(list.every((s) => s.prio === undefined)).toBe(true)
  })
})

describe('getIndicators — mob with a written entry', () => {
  // Ritual Chieftain: the only entry in the repo carrying threat, trap and annotated spells.
  const REAL_SLUG = 'altar-of-fangs'
  const HIGH_RING = '#d97036'
  const chieftain = getLookup(REAL_SLUG)!.enemyById.get(270_306)!
  const i = getIndicators(REAL_SLUG, chieftain)

  it('takes the threat from the entry and derives the ring', () => {
    expect(chieftain).toBeDefined()
    expect(i.threat).toBe('high')
    expect(i.ring).toBe(HIGH_RING)
  })

  it('makes a mob judged "high" a priority without it being a boss', () => {
    expect(chieftain.isBoss).toBeUndefined()
    expect(i.priority).toBe(true)
  })

  it('raises the tank buster from `tag: tank`, which MDT cannot supply', () => {
    expect(i.tankBuster).toBe(true)
  })

  it('reports the written trap', () => {
    expect(i.hasTrap).toBe(true)
  })

  it('adds spells annotated `tag: kick` to the list to interrupt', () => {
    expect(i.kickSpells).toContain(1306517)
  })

  it('sorts the briefing by declared priority', () => {
    const list = kickList(REAL_SLUG, chieftain)
    expect(list.length).toBeGreaterThan(0)
    const prios = list.map((s) => s.prio ?? 99)
    for (let k = 1; k < prios.length; k++) expect(prios[k]).toBeGreaterThanOrEqual(prios[k - 1])
    expect(list[0].prio).toBe(1)
  })
})

/**
 * `frontal` is the one tag MDT has no field for and the prose had to carry instead: Toxic
 * Surge's note opened on the word "Frontal" before the tag existed. Ula'tek's Chosen is
 * trash rather than a boss, which is what makes it the reference case — the briefing this
 * feeds is read while routing.
 */
describe('getIndicators — frontals', () => {
  const REAL_SLUG = 'altar-of-fangs'
  const byId = getLookup(REAL_SLUG)!.enemyById
  const chosen = byId.get(263_109)!
  const TOXIC_SURGE = 1_306_852

  it('raises the frontal from `tag: frontal`, which MDT cannot supply', () => {
    expect(getIndicators(REAL_SLUG, chosen).frontalSpells).toEqual([TOXIC_SURGE])
  })

  it('leaves the list empty for a mob with no frontal written', () => {
    // The Chieftain carries `tag: dodge`, which is a different instruction.
    expect(getIndicators(REAL_SLUG, byId.get(270_306)!).frontalSpells).toEqual([])
  })

  it('names the frontals, for the pull briefing to print', () => {
    expect(frontalList(REAL_SLUG, chosen).map((s) => s.name)).toEqual(['Toxic Surge'])
  })

  it('keeps a frontal out of the list to interrupt', () => {
    expect(kickList(REAL_SLUG, chosen).map((s) => s.id)).not.toContain(TOXIC_SURGE)
  })
})

describe('Real pool data', () => {
  const enemies = dungeonList.flatMap((d) => getDungeon(d.slug)?.enemies ?? [])

  it('loads the season pool', () => {
    expect(dungeonList.length).toBeGreaterThan(0)
    expect(enemies.length).toBeGreaterThan(0)
  })

  it('derives the "to kick" badges from MDT, with no entry written at all', () => {
    const interruptibles = enemies.filter((e) => e.spells.some((s) => s.interruptible))
    expect(interruptibles.length).toBeGreaterThan(0)

    for (const e of interruptibles) {
      const slug = dungeonList.find((d) => getDungeon(d.slug)?.enemies.includes(e))!.slug
      expect(getIndicators(slug, e).kick).toBe(true)
    }
  })

  it('derives the dispel types from MDT', () => {
    const dispellable = enemies.filter((e) => e.spells.some((s) => s.dispel?.length))
    expect(dispellable.length).toBeGreaterThan(0)
  })

  const slugOf = (enemy: Enemy) =>
    dungeonList.find((d) => getDungeon(d.slug)?.enemies.includes(enemy))!.slug

  it('gives the golden ring to every mob whose rank is boss', () => {
    const bosses = enemies.filter((e) => getIndicators(slugOf(e), e).rank === 'boss')
    expect(bosses.length).toBeGreaterThan(0)
    for (const boss of bosses) {
      expect(getIndicators(slugOf(boss), boss).ring).toBe(BOSS_RING)
    }
  })

  /**
   * Gold means boss. A mob MDT flags whose card demotes it is not one, so it must not wear the
   * ring — that is the whole point of the field, and this is the pool's only such mob today.
   */
  it('takes the golden ring off a mob its card demotes', () => {
    const echo = enemies.find((e) => e.id === 247_301)!
    expect(echo.isBoss).toBe(true)
    expect(getIndicators(slugOf(echo), echo).rank).toBe('miniboss')
    expect(getIndicators(slugOf(echo), echo).ring).not.toBe(BOSS_RING)
  })
})

describe('hasTips', () => {
  // Sporeblight Belcher: a written card with a `tips:` entry in both the base file and its
  // French translation, which is what makes it useful for the per-locale case below too.
  const TIP_SLUG = 'the-blinding-vale'
  const TIP_ID = 254_850

  it('is true for a mob whose card carries tips', () => {
    const enemy = getLookup(TIP_SLUG)!.enemyById.get(TIP_ID)!
    expect(getIndicators(TIP_SLUG, enemy).hasTips).toBe(true)
  })

  it('is false for a mob whose card carries none', () => {
    const enemy = getLookup(TIP_SLUG)!.enemyById.get(TIP_ID)!
    const byId = getLookup(TIP_SLUG)!.enemyById
    const other = [...byId.values()].find(
      (e) => e.id !== TIP_ID && !getMobContent(TIP_SLUG, e.id)?.tips?.length,
    )!
    expect(other).toBeDefined()
    expect(getIndicators(TIP_SLUG, other).hasTips).toBe(false)
    expect(getIndicators(TIP_SLUG, enemy).hasTips).toBe(true)
  })

  it('answers per locale, because a translation replaces the list', () => {
    const enemy = getLookup(TIP_SLUG)!.enemyById.get(TIP_ID)!
    // Both locales carry tips on this card. The point is that the cache key varies:
    // asking in French must not return the English answer by accident.
    expect(getIndicators(TIP_SLUG, enemy, 'fr').hasTips).toBe(true)
  })

  // __fixtures__/888003: no `tips:` in the base file, one only in its French sibling. Unlike
  // the card above, whose two locales agree, this is the case that would actually fail if
  // `getIndicators`'s cache key ever dropped `locale` — the two languages disagree here, so a
  // key collision would make one of them read the other's cached answer.
  it('is false in the base language and true only once translated', () => {
    const mob = enemy({ id: 888_003 })
    expect(getIndicators('__fixtures__', mob).hasTips).toBe(false)
    expect(getIndicators('__fixtures__', mob, 'fr').hasTips).toBe(true)
  })
})

describe('tip scope', () => {
  it('reports a general tip and collects every scoped pack', () => {
    const ind = getIndicators('__fixtures__', enemy({ id: 888_020 }))
    expect(ind.generalTips).toBe(true)
    expect([...ind.tipPacks].sort((a, b) => a - b)).toEqual([44, 45])
  })

  it('still reports hasTips, which means any tip at all', () => {
    expect(getIndicators('__fixtures__', enemy({ id: 888_020 })).hasTips).toBe(true)
  })

  it('reports neither for a mob with no tips', () => {
    const ind = getIndicators('__fixtures__', enemy({ id: 270_306 }))
    expect(ind.generalTips).toBe(false)
    expect(ind.tipPacks).toEqual([])
  })
})

describe('the pulls a tip is about', () => {
  it('collects every pack a scoped tip names', () => {
    const packs = tippedPacks('__fixtures__', [enemy({ id: 888_020 })])
    expect([...packs].sort((a, b) => a - b)).toEqual([44, 45])
  })

  /**
   * 888020 stands in no pack at all, and still names two. That is the combined-pull case: a mob
   * standing only in 44 can carry a tip about taking 44 and 45 together, and both pulls should
   * be marked. Asking "does a tipped mob stand here" would mark only one of them.
   */
  it('names a pack even where no tipped mob stands', () => {
    expect(tippedPacks('__fixtures__', [enemy({ id: 888_020 })]).has(45)).toBe(true)
  })

  it('leaves a general tip out, because that one is about the mob and stays on its blips', () => {
    // __fixtures__/263109 carries tips with no `packs:`.
    expect(tippedPacks('__fixtures__', [enemy({ id: 263_109 })]).size).toBe(0)
  })

  it('is empty for mobs with nothing written about them', () => {
    expect(tippedPacks('__fixtures__', [enemy({ id: 270_306 })]).size).toBe(0)
  })

  it('answers per locale, because a translation replaces the tips list whole', () => {
    expect(tippedPacks('the-blinding-vale', getLookup('the-blinding-vale')!.dungeon.enemies)).toEqual(
      tippedPacks('the-blinding-vale', getLookup('the-blinding-vale')!.dungeon.enemies, 'fr'),
    )
  })
})

describe('rank', () => {
  const ALTAR = 'altar-of-fangs'

  it('inherits MDT for a card that says nothing', () => {
    const boss = getLookup(ALTAR)!.dungeon.enemies.find((e) => e.isBoss)!
    expect(getIndicators(ALTAR, boss).rank).toBe('boss')
  })

  it('is undefined for an unflagged mob whose card says nothing', () => {
    const trash = getLookup(ALTAR)!.dungeon.enemies.find((e) => !e.isBoss)!
    expect(getIndicators(ALTAR, trash).rank).toBeUndefined()
  })

  it('takes the card over MDT', () => {
    expect(getIndicators('__fixtures__', enemy({ id: 888_010, isBoss: true })).rank).toBe('miniboss')
  })

  /**
   * The same mob as above: MDT flags it a boss, the card demotes it to miniboss. That is the
   * whole point of the field, so the ring has to follow the card — gold is for a boss, and this
   * is not one any more. It keeps the priority mark, because a miniboss is still worth marking.
   */
  it('gives a demoted mob the priority mark but not the gold ring', () => {
    const ind = getIndicators('__fixtures__', enemy({ id: 888_010, isBoss: true }))
    expect(ind.priority).toBe(true)
    // The ring is the threat rating; the card is `threat: high`.
    expect(ind.ring).toBe('#d97036')
  })
})
