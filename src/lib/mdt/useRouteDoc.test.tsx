// ABOUTME: Tests the Y.js route document: pulls, clones, import, reset and persistence.
// ABOUTME: Uses a real Y.Doc, with no network provider attached.

// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cloneKey, getLookup } from '../data'
import { decodeMdtString, encodeMdtString } from './string'
import { emptyRoute, luaToRoute, nextColor, routeToLua, type Route } from './route'
import { randomRoomCode, roomName, useRouteDoc } from './useRouteDoc'

/**
 * A socket that never opens.
 *
 * jsdom would dial the real relay, which no test may depend on. Replacing the socket leaves
 * the whole session lifecycle — join, leave, rejoin — running for real, and that lifecycle is
 * exactly where the bugs were.
 */
class SilentSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3
  readyState = 0
  binaryType = 'blob'
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: unknown) => void) | null = null
  constructor(readonly url: string) {}
  send() {}
  close() {
    this.readyState = this.CLOSED
    this.onclose?.()
  }
}

beforeAll(() => {
  globalThis.WebSocket = SilentSocket as unknown as typeof WebSocket
})

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!
const MDT_INDEX = lookup.dungeon.mdtIndex
const storageKey = `midnight-codex:route:${SLUG}`

const packs = [...lookup.packs.values()]
const packA = packs[0].members
const packB = packs[1].members

const mount = () => renderHook(() => useRouteDoc(SLUG, MDT_INDEX))

const keysOf = (clones: { enemyIdx: number; cloneIdx: number }[]) =>
  clones.map((c) => cloneKey(c.enemyIdx, c.cloneIdx)).sort()

const firstPullKeys = (route: Route) => keysOf(route.pulls[0].clones)

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

describe('Sessions', () => {
  it('announces the room it opened, before the relay has answered', () => {
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('ABCDEF', 'host'))

    expect(result.current.collab.room).toBe('ABCDEF')
    // Not 'connected': that word is about the socket. Reading it off the mere existence of a
    // session made every session look live, including one whose relay never answered.
    expect(result.current.collab.status).toBe('connecting')
    unmount()
  })

  it('takes its route into the room it opens', () => {
    const { result, unmount } = mount()
    act(() => result.current.actions.toggleClones(0, packA))
    act(() => result.current.joinRoom('ABCDEF', 'host'))

    expect(result.current.route.pulls[0].clones).toHaveLength(packA.length)
    unmount()
  })

  it('leaves its own route behind when joining someone else’s session', () => {
    const { result, unmount } = mount()
    act(() => result.current.actions.toggleClones(0, packA))
    act(() => result.current.joinRoom('ABCDEF', 'guest'))

    // A guest starts from an empty document and waits for the room's. Bringing its own would
    // leave two documents having each set `pulls`, and a merge arbitrates that single key one
    // way or the other — dropping, half the time, the host's whole route.
    expect(result.current.route.pulls).toHaveLength(1)
    expect(result.current.route.pulls[0].clones).toEqual([])
    unmount()
  })

  /**
   * Two sessions in one context reach each other over `BroadcastChannel`, which the provider
   * uses beside the socket. So the meeting of a host and a guest is testable for real, with
   * no relay: the same path two tabs of one browser take.
   */
  it('does not drop the host route when a guest arrives carrying one of its own', async () => {
    const host = mount()
    act(() => host.result.current.actions.toggleClones(0, packA))
    act(() => host.result.current.joinRoom('ABCDEF', 'host'))

    // The guest mounts on the same storage, so it opens on a route of its own and then adds
    // to it — the ordinary case, and the one that used to cost the host everything.
    const guest = mount()
    act(() => guest.result.current.actions.toggleClones(0, packB))
    act(() => guest.result.current.joinRoom('ABCDEF', 'guest'))

    await waitFor(() => expect(firstPullKeys(guest.result.current.route)).toEqual(keysOf(packA)))
    expect(firstPullKeys(host.result.current.route)).toEqual(keysOf(packA))

    host.unmount()
    guest.unmount()
  })

  it('leaves a session for good', () => {
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('ABCDEF', 'host'))
    act(() => result.current.leaveRoom())

    expect(result.current.collab.status).toBe('off')
    expect(result.current.collab.room).toBeNull()
    expect(result.current.collab.peers).toEqual([])
    unmount()
  })

  it('rejoins the room it just left', () => {
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('ABCDEF', 'host'))
    act(() => result.current.leaveRoom())
    act(() => result.current.joinRoom('ABCDEF', 'host'))

    expect(result.current.collab.room).toBe('ABCDEF')
    unmount()
  })

  it('keeps its route when it leaves', () => {
    const { result, unmount } = mount()
    act(() => result.current.actions.toggleClones(0, packA))
    act(() => result.current.joinRoom('ABCDEF', 'host'))
    act(() => result.current.leaveRoom())

    expect(result.current.route.pulls[0].clones).toHaveLength(packA.length)
    unmount()
  })
})

describe('Identity', () => {
  it('starts with no name, so one has to be chosen', () => {
    localStorage.removeItem('midnight-codex:identity')
    const { result } = mount()
    expect(result.current.collab.identity).toBeNull()
  })

  it('remembers a chosen name across mounts', () => {
    const first = mount()
    act(() => first.result.current.setIdentity('Rwl'))
    first.unmount()
    expect(mount().result.current.collab.identity).toBe('Rwl')
  })

  it('keeps a name already stored rather than renaming anyone', () => {
    localStorage.setItem('midnight-codex:identity', 'Player-8429')
    expect(mount().result.current.collab.identity).toBe('Player-8429')
  })

  it('counts yourself among the participants of a room you just opened', () => {
    const { result, unmount } = mount()
    act(() => result.current.setIdentity('Rwl'))
    act(() => result.current.joinRoom('AAAAAA', 'host'))
    expect(result.current.collab.peers.map((p) => p.name)).toEqual(['Rwl'])
    expect(result.current.collab.peers[0].isSelf).toBe(true)
    unmount()
  })

  it('announces a rename to the room without reconnecting', () => {
    const { result, unmount } = mount()
    act(() => result.current.setIdentity('Rwl'))
    act(() => result.current.joinRoom('AAAAAA', 'host'))
    act(() => result.current.setIdentity('RwlRwl'))
    expect(result.current.collab.peers.map((p) => p.name)).toEqual(['RwlRwl'])
    unmount()
  })
})

describe('roomName', () => {
  it('namespaces the code by dungeon, so one code is two rooms in two dungeons', () => {
    expect(roomName('altar-of-fangs', 'ABCDEF')).not.toBe(roomName('kings-rest', 'ABCDEF'))
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
