// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { cloneKey, getLookup } from '../data'
import { decodeMdtString, encodeMdtString } from './string'
import { emptyRoute, luaToRoute, nextColor, routeToLua, type Route } from './route'
import { randomRoomCode, useRouteDoc } from './useRouteDoc'

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!
const MDT_INDEX = lookup.dungeon.mdtIndex
const storageKey = `midnight-codex:route:${SLUG}`

const packs = [...lookup.packs.values()]
const packA = packs[0].members
const packB = packs[1].members

const mount = () => renderHook(() => useRouteDoc(SLUG, MDT_INDEX))

/** A genuine MDT string, produced by the repo's own codec from a real route. */
function mdtString(pulls: Route['pulls'], name = 'Imported route'): string {
  return encodeMdtString(routeToLua({ ...emptyRoute(SLUG, MDT_INDEX, name), pulls }))
}

beforeEach(() => {
  localStorage.clear()
})

describe('Initial state', () => {
  it('starts on a fresh route with a single empty pull', () => {
    const { result } = mount()
    expect(result.current.route.name).toBe('New route')
    expect(result.current.route.slug).toBe(SLUG)
    expect(result.current.route.pulls).toHaveLength(1)
    expect(result.current.route.pulls[0].clones).toEqual([])
  })

  it('opens no collaborative session until asked', () => {
    const { result } = mount()
    expect(result.current.collab.status).toBe('off')
    expect(result.current.collab.room).toBeNull()
    expect(result.current.collab.identity).toMatch(/^Joueur-\d{4}$/)
  })
})

describe('Editing pulls', () => {
  it('adds a pull and gives it the next colour in the palette', () => {
    const { result } = mount()
    act(() => result.current.actions.addPull())
    expect(result.current.route.pulls).toHaveLength(2)
    expect(result.current.route.pulls[1].color).toBe(nextColor(1))
  })

  it('renames the route', () => {
    const { result } = mount()
    act(() => result.current.actions.setName('Week 12'))
    expect(result.current.route.name).toBe('Week 12')
  })

  it("changes a pull's colour", () => {
    const { result } = mount()
    act(() => result.current.actions.setPullColor(0, 'abcdef'))
    expect(result.current.route.pulls[0].color).toBe('abcdef')
  })

  it('removes a pull', () => {
    const { result } = mount()
    act(() => result.current.actions.addPull())
    act(() => result.current.actions.addPull())
    act(() => result.current.actions.removePull(1))
    expect(result.current.route.pulls).toHaveLength(2)
  })

  it('always keeps at least one pull: a route with none makes no sense', () => {
    const { result } = mount()
    act(() => result.current.actions.removePull(0))
    expect(result.current.route.pulls).toHaveLength(1)
    expect(result.current.route.pulls[0].clones).toEqual([])
  })

  it('ignores a removal at an out-of-bounds index', () => {
    const { result } = mount()
    act(() => result.current.actions.removePull(42))
    expect(result.current.route.pulls).toHaveLength(1)
  })

  it('moves a pull, keeping its clones and its colour', () => {
    const { result } = mount()
    act(() => result.current.actions.addPull())
    act(() => result.current.actions.toggleClones(0, packA))
    act(() => result.current.actions.setPullColor(0, 'abcdef'))

    act(() => result.current.actions.movePull(0, 1))

    const [first, second] = result.current.route.pulls
    expect(first.clones).toEqual([])
    expect(second.color).toBe('abcdef')
    expect(second.clones).toHaveLength(packA.length)
  })

  it('ignores a move that would fall off the list', () => {
    const { result } = mount()
    act(() => result.current.actions.addPull())
    act(() => result.current.actions.movePull(0, -1))
    act(() => result.current.actions.movePull(1, 1))
    expect(result.current.route.pulls).toHaveLength(2)
  })
})

describe('Assigning clones', () => {
  it('adds a pack to the targeted pull', () => {
    const { result } = mount()
    act(() => result.current.actions.toggleClones(0, packA))
    expect(result.current.route.pulls[0].clones).toHaveLength(packA.length)
  })

  it('removes the pack when all its clones are already there — the click is a toggle', () => {
    const { result } = mount()
    act(() => result.current.actions.toggleClones(0, packA))
    act(() => result.current.actions.toggleClones(0, packA))
    expect(result.current.route.pulls[0].clones).toEqual([])
  })

  it('moves a clone from one pull to another: it never belongs to two', () => {
    const { result } = mount()
    act(() => result.current.actions.addPull())
    act(() => result.current.actions.toggleClones(0, packA))
    act(() => result.current.actions.toggleClones(1, packA))

    expect(result.current.route.pulls[0].clones).toEqual([])
    expect(result.current.route.pulls[1].clones).toHaveLength(packA.length)
  })

  it('leaves the other packs where they are', () => {
    const { result } = mount()
    act(() => result.current.actions.addPull())
    act(() => result.current.actions.toggleClones(0, packA))
    act(() => result.current.actions.toggleClones(1, packB))
    act(() => result.current.actions.toggleClones(1, packB))

    expect(result.current.route.pulls[0].clones).toHaveLength(packA.length)
    expect(result.current.route.pulls[1].clones).toEqual([])
  })

  it("preserves the clones' MDT indices", () => {
    const { result } = mount()
    act(() => result.current.actions.toggleClones(0, packA))
    const got = result.current.route.pulls[0].clones.map((c) => cloneKey(c.enemyIdx, c.cloneIdx))
    expect(got.sort()).toEqual(packA.map((c) => cloneKey(c.enemyIdx, c.cloneIdx)).sort())
  })
})

describe('Import and reset', () => {
  it('imports an MDT string and replaces the current route', () => {
    const { result } = mount()
    act(() => result.current.actions.addPull())

    const mdt = mdtString([{ color: nextColor(0), clones: packA }], 'Thursday route')
    act(() => {
      result.current.actions.importRoute(mdt)
    })

    expect(result.current.route.name).toBe('Thursday route')
    expect(result.current.route.pulls).toHaveLength(1)
    expect(result.current.route.pulls[0].clones).toHaveLength(packA.length)
  })

  it('keeps the source preset, so nothing is lost on re-export', () => {
    const { result } = mount()
    act(() => {
      result.current.actions.importRoute(mdtString([{ color: nextColor(0), clones: packA }]))
    })
    expect(result.current.route.source).toBeDefined()
  })

  it('rejects a string that is not MDT without breaking the route', () => {
    const { result } = mount()
    expect(() => result.current.actions.importRoute('not an MDT string')).toThrow()
    expect(result.current.route.pulls).toHaveLength(1)
  })

  it('resets the route and forgets the imported preset', () => {
    const { result } = mount()
    act(() => {
      result.current.actions.importRoute(mdtString([{ color: nextColor(0), clones: packA }], 'X'))
    })
    act(() => result.current.actions.reset())

    expect(result.current.route.name).toBe('New route')
    expect(result.current.route.pulls).toHaveLength(1)
    expect(result.current.route.pulls[0].clones).toEqual([])
    expect(result.current.route.source).toBeUndefined()
  })
})

describe('Local persistence', () => {
  it('writes the route as a re-importable MDT string', () => {
    const { result } = mount()
    act(() => result.current.actions.toggleClones(0, packA))

    const saved = localStorage.getItem(storageKey)
    expect(saved).toBeTruthy()
    expect(saved!.startsWith('!~MDT2~')).toBe(true)

    const reread = luaToRoute(decodeMdtString(saved!).table)
    expect(reread.slug).toBe(SLUG)
    expect(reread.pulls[0].clones).toHaveLength(packA.length)
  })

  it('restores the saved route on the next mount', () => {
    const { result, unmount } = mount()
    act(() => result.current.actions.setName('Route of the week'))
    act(() => result.current.actions.toggleClones(0, packA))
    unmount()

    const { result: resumed } = mount()
    expect(resumed.current.route.name).toBe('Route of the week')
    expect(resumed.current.route.pulls[0].clones).toHaveLength(packA.length)
  })

  it('starts over and purges storage when the save is unreadable', () => {
    localStorage.setItem(storageKey, 'corrupted content')
    const { result } = mount()
    expect(result.current.route.pulls).toHaveLength(1)
    expect(result.current.route.pulls[0].clones).toEqual([])
    expect(localStorage.getItem(storageKey)).not.toBe('corrupted content')
  })
})

describe('randomRoomCode', () => {
  it('produces six characters', () => {
    expect(randomRoomCode()).toHaveLength(6)
  })

  it('avoids characters that are ambiguous to read out (I, O, 0, 1)', () => {
    for (let i = 0; i < 200; i++) {
      expect(randomRoomCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
    }
  })
})
