import { describe, expect, it } from 'vitest'
import type { Enemy } from './types'
import { dungeonList, getDungeon, getLookup } from './data'
import { getIndicators, kickList } from './indicators'

/**
 * `getIndicators` memoizes under the key `<slug>/<enemy.id>`, with no invalidation. Every
 * case therefore uses an `id` of its own, otherwise the tests contaminate each other.
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

  it('gives the golden ring to every boss in the pool', () => {
    const bosses = enemies.filter((e) => e.isBoss)
    expect(bosses.length).toBeGreaterThan(0)
    for (const boss of bosses) {
      const slug = dungeonList.find((d) => getDungeon(d.slug)?.enemies.includes(boss))!.slug
      expect(getIndicators(slug, boss).ring).toBe(BOSS_RING)
    }
  })
})
