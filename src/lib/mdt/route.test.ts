// ABOUTME: Tests the route model and its conversion to and from MDT preset tables.
// ABOUTME: Pins that fields we cannot edit survive an import and re-export untouched.

import { describe, expect, it } from 'vitest'
import { cloneKey, getLookup } from '../data'
import {
  PULL_COLORS,
  emptyRoute,
  nextColor,
  pullIndexByClone,
  routeStats,
  toCssColor,
  type Route,
} from './route'

/**
 * Importing and exporting MDT presets is covered by `codec.test.ts`. This file only tests the
 * route model: colours, pulls, cumulative forces.
 */
const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!
const MDT_INDEX = lookup.dungeon.mdtIndex

describe('Pull colours', () => {
  it("reuses MDT's default palette", () => {
    expect(PULL_COLORS.length).toBeGreaterThan(0)
    expect(nextColor(0)).toBe(PULL_COLORS[0])
  })

  it('wraps around the palette past the last pull', () => {
    expect(nextColor(PULL_COLORS.length)).toBe(PULL_COLORS[0])
    expect(nextColor(PULL_COLORS.length + 3)).toBe(PULL_COLORS[3])
  })

  it('adds the hash MDT does not store, without doubling it', () => {
    expect(toCssColor('ff3eff')).toBe('#ff3eff')
    expect(toCssColor('#ff3eff')).toBe('#ff3eff')
  })
})

describe('emptyRoute', () => {
  it('starts on a single empty pull', () => {
    const route = emptyRoute(SLUG, MDT_INDEX)
    expect(route.slug).toBe(SLUG)
    expect(route.mdtIndex).toBe(MDT_INDEX)
    expect(route.pulls).toHaveLength(1)
    expect(route.pulls[0].clones).toEqual([])
    expect(route.pulls[0].color).toBe(nextColor(0))
  })

  it('accepts an explicit name', () => {
    expect(emptyRoute(SLUG, MDT_INDEX, 'Week 3').name).toBe('Week 3')
  })

  it('carries no source preset: there is nothing to preserve on re-export', () => {
    expect(emptyRoute(SLUG, MDT_INDEX).source).toBeUndefined()
  })
})

describe('pullIndexByClone', () => {
  it('maps every clone to the pull holding it', () => {
    const route: Route = {
      name: 'Test',
      slug: SLUG,
      mdtIndex: MDT_INDEX,
      pulls: [
        { color: nextColor(0), clones: [{ enemyIdx: 1, cloneIdx: 1 }] },
        { color: nextColor(1), clones: [{ enemyIdx: 2, cloneIdx: 3 }, { enemyIdx: 2, cloneIdx: 4 }] },
      ],
      objects: [],
    }
    const map = pullIndexByClone(route)
    expect(map.get(cloneKey(1, 1))).toBe(0)
    expect(map.get(cloneKey(2, 3))).toBe(1)
    expect(map.get(cloneKey(2, 4))).toBe(1)
  })

  it('ignores clones no pull has picked up', () => {
    const route = emptyRoute(SLUG, MDT_INDEX)
    expect(pullIndexByClone(route).size).toBe(0)
  })
})

describe('routeStats', () => {
  const packs = [...lookup.packs.values()]

  const routeWithPacks = (n: number): Route => ({
    name: 'Test',
    slug: SLUG,
    mdtIndex: MDT_INDEX,
    pulls: packs.slice(0, n).map((pack, i) => ({ color: nextColor(i), clones: pack.members })),
    objects: [],
  })

  it('accumulates forces pull after pull', () => {
    const route = routeWithPacks(3)
    const stats = routeStats(route, lookup)
    expect(stats.cumulative).toHaveLength(3)
    expect(stats.cumulative[0]).toBe(packs[0].count)
    expect(stats.cumulative[1]).toBe(packs[0].count + packs[1].count)
    expect(stats.cumulative[2]).toBe(stats.total)
  })

  it('produces a non-decreasing sequence', () => {
    const { cumulative } = routeStats(routeWithPacks(5), lookup)
    for (let i = 1; i < cumulative.length; i++) {
      expect(cumulative[i]).toBeGreaterThanOrEqual(cumulative[i - 1])
    }
  })

  it('relates the forces to the total the dungeon requires', () => {
    const stats = routeStats(routeWithPacks(2), lookup)
    expect(stats.required).toBe(lookup.dungeon.totalCount)
    expect(stats.percent).toBeCloseTo((stats.total / stats.required) * 100, 9)
  })

  it('stays at zero on an empty route', () => {
    const stats = routeStats(emptyRoute(SLUG, MDT_INDEX), lookup)
    expect(stats.total).toBe(0)
    expect(stats.percent).toBe(0)
    expect(stats.cumulative).toEqual([0])
  })

  it('ignores clones the dungeon does not know', () => {
    const route: Route = {
      name: 'Test',
      slug: SLUG,
      mdtIndex: MDT_INDEX,
      pulls: [{ color: nextColor(0), clones: [{ enemyIdx: 9999, cloneIdx: 9999 }] }],
      objects: [],
    }
    expect(routeStats(route, lookup).total).toBe(0)
  })

  it('reaches 100% when the whole dungeon is picked up', () => {
    const route: Route = {
      name: 'Test',
      slug: SLUG,
      mdtIndex: MDT_INDEX,
      pulls: [{ color: nextColor(0), clones: [...lookup.cloneByKey.keys()].map((k) => {
        const [enemyIdx, cloneIdx] = k.split(':').map(Number)
        return { enemyIdx, cloneIdx }
      }) }],
      objects: [],
    }
    expect(routeStats(route, lookup).percent).toBeGreaterThanOrEqual(100)
  })
})
