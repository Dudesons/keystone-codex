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
 * L'import/export de preset MDT est couvert par `codec.test.ts`. Ce fichier ne teste que le
 * modèle de route : couleurs, pulls, forces cumulées.
 */
const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!
const MDT_INDEX = lookup.dungeon.mdtIndex

describe('Couleurs de pull', () => {
  it('reprend la palette par défaut de MDT', () => {
    expect(PULL_COLORS.length).toBeGreaterThan(0)
    expect(nextColor(0)).toBe(PULL_COLORS[0])
  })

  it('boucle sur la palette au-delà du dernier pull', () => {
    expect(nextColor(PULL_COLORS.length)).toBe(PULL_COLORS[0])
    expect(nextColor(PULL_COLORS.length + 3)).toBe(PULL_COLORS[3])
  })

  it('ajoute le dièse que MDT ne stocke pas, sans le doubler', () => {
    expect(toCssColor('ff3eff')).toBe('#ff3eff')
    expect(toCssColor('#ff3eff')).toBe('#ff3eff')
  })
})

describe('emptyRoute', () => {
  it('démarre sur un pull unique et vide', () => {
    const route = emptyRoute(SLUG, MDT_INDEX)
    expect(route.slug).toBe(SLUG)
    expect(route.mdtIndex).toBe(MDT_INDEX)
    expect(route.pulls).toHaveLength(1)
    expect(route.pulls[0].clones).toEqual([])
    expect(route.pulls[0].color).toBe(nextColor(0))
  })

  it('accepte un nom explicite', () => {
    expect(emptyRoute(SLUG, MDT_INDEX, 'Semaine 3').name).toBe('Semaine 3')
  })

  it('n\'a pas de preset d\'origine : rien à préserver au ré-export', () => {
    expect(emptyRoute(SLUG, MDT_INDEX).source).toBeUndefined()
  })
})

describe('pullIndexByClone', () => {
  it('associe chaque clone au numéro de pull qui le contient', () => {
    const route: Route = {
      name: 'Test',
      slug: SLUG,
      mdtIndex: MDT_INDEX,
      pulls: [
        { color: nextColor(0), clones: [{ enemyIdx: 1, cloneIdx: 1 }] },
        { color: nextColor(1), clones: [{ enemyIdx: 2, cloneIdx: 3 }, { enemyIdx: 2, cloneIdx: 4 }] },
      ],
    }
    const map = pullIndexByClone(route)
    expect(map.get(cloneKey(1, 1))).toBe(0)
    expect(map.get(cloneKey(2, 3))).toBe(1)
    expect(map.get(cloneKey(2, 4))).toBe(1)
  })

  it('ignore les clones qu\'aucun pull ne ramasse', () => {
    const route = emptyRoute(SLUG, MDT_INDEX)
    expect(pullIndexByClone(route).size).toBe(0)
  })
})

describe('routeStats', () => {
  const packs = [...lookup.packs.values()]

  const routeAvecPacks = (n: number): Route => ({
    name: 'Test',
    slug: SLUG,
    mdtIndex: MDT_INDEX,
    pulls: packs.slice(0, n).map((pack, i) => ({ color: nextColor(i), clones: pack.members })),
  })

  it('cumule les forces pull après pull', () => {
    const route = routeAvecPacks(3)
    const stats = routeStats(route, lookup)
    expect(stats.cumulative).toHaveLength(3)
    expect(stats.cumulative[0]).toBe(packs[0].count)
    expect(stats.cumulative[1]).toBe(packs[0].count + packs[1].count)
    expect(stats.cumulative[2]).toBe(stats.total)
  })

  it('donne une suite croissante', () => {
    const { cumulative } = routeStats(routeAvecPacks(5), lookup)
    for (let i = 1; i < cumulative.length; i++) {
      expect(cumulative[i]).toBeGreaterThanOrEqual(cumulative[i - 1])
    }
  })

  it('rapporte les forces au total exigé par le donjon', () => {
    const stats = routeStats(routeAvecPacks(2), lookup)
    expect(stats.required).toBe(lookup.dungeon.totalCount)
    expect(stats.percent).toBeCloseTo((stats.total / stats.required) * 100, 9)
  })

  it('reste à zéro sur une route vide', () => {
    const stats = routeStats(emptyRoute(SLUG, MDT_INDEX), lookup)
    expect(stats.total).toBe(0)
    expect(stats.percent).toBe(0)
    expect(stats.cumulative).toEqual([0])
  })

  it('ignore les clones que le donjon ne connaît pas', () => {
    const route: Route = {
      name: 'Test',
      slug: SLUG,
      mdtIndex: MDT_INDEX,
      pulls: [{ color: nextColor(0), clones: [{ enemyIdx: 9999, cloneIdx: 9999 }] }],
    }
    expect(routeStats(route, lookup).total).toBe(0)
  })

  it('atteint 100 % en ramassant tout le donjon', () => {
    const route: Route = {
      name: 'Test',
      slug: SLUG,
      mdtIndex: MDT_INDEX,
      pulls: [{ color: nextColor(0), clones: [...lookup.cloneByKey.keys()].map((k) => {
        const [enemyIdx, cloneIdx] = k.split(':').map(Number)
        return { enemyIdx, cloneIdx }
      }) }],
    }
    expect(routeStats(route, lookup).percent).toBeGreaterThanOrEqual(100)
  })
})
