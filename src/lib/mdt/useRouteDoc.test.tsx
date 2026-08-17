// ABOUTME: Tests the Y.js route document: pulls, clones, import, reset and persistence.
// ABOUTME: Uses a real Y.Doc, with no network provider attached.

// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as encoding from 'lib0/encoding'
import * as syncProtocol from 'y-protocols/sync'
import { Awareness } from 'y-protocols/awareness'
import { messageSync } from 'y-websocket'
import * as Y from 'yjs'
import { cloneKey, getLookup } from '../data'
import type { Peer } from '../collab/presence'
import { decodeMdtString, encodeMdtString } from './string'
import { emptyRoute, luaToRoute, nextColor, routeToLua, type Route } from './route'
import { randomRoomCode, roomName, useRouteDoc } from './useRouteDoc'

/**
 * A socket that never opens on its own.
 *
 * jsdom would dial the real relay, which no test may depend on. Replacing the socket leaves
 * the whole session lifecycle — join, leave, rejoin — running for real, and that lifecycle is
 * exactly where the bugs were. Every instance is recorded: a test that needs the relay to
 * answer can reach into the socket the provider actually created and drive its
 * `onopen`/`onmessage` by hand, so the response is processed by the library's own message
 * handling rather than by setting `provider.synced` directly.
 *
 * The provider also reaches other tabs of the same origin through `BroadcastChannel`, and does
 * not appear to leave that channel synchronously on `destroy()`. Two `describe` blocks that
 * join the same room code therefore risk a stale peer from one bleeding into the other, even
 * with `unmount()` called — so keep room codes unique across `describe` blocks in this file.
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
  static instances: SilentSocket[] = []
  readyState = 0
  binaryType = 'blob'
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: { data: Uint8Array }) => void) | null = null
  constructor(readonly url: string) {
    SilentSocket.instances.push(this)
  }
  send() {}
  close() {
    this.readyState = this.CLOSED
    this.onclose?.()
  }
}

/**
 * The frame a relay sends back once it has caught a client up: the outer `messageSync`
 * envelope `y-websocket` reads first, wrapping the `y-protocols/sync` reply that flips
 * `provider.synced` to `true`. Built with the same primitives the provider itself uses, from
 * an unrelated empty document — its content is irrelevant, only its message type is under test.
 */
function relaySyncStep2(): Uint8Array {
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, messageSync)
  syncProtocol.writeSyncStep2(encoder, new Y.Doc())
  return encoding.toUint8Array(encoder)
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

/**
 * `readPeers` sorts by client id, which is random, so "self" is never reliably the first
 * entry once a room holds more than one participant — only tests that stay solo can get away
 * with `peers[0]`.
 */
const self = (peers: Peer[]) => peers.find((p) => p.isSelf)!

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

  it('records whether the session was opened or joined, and forgets it on leaving', () => {
    // Nothing else in `collab` says whether a document already is the room's or is still
    // waiting on one — the distinction the "fetching the room's route" notice depends on.
    const { result, unmount } = mount()
    expect(result.current.collab.mode).toBeNull()

    act(() => result.current.joinRoom('ABCDEF', 'host'))
    expect(result.current.collab.mode).toBe('host')

    act(() => result.current.leaveRoom())
    expect(result.current.collab.mode).toBeNull()

    act(() => result.current.joinRoom('ABCDEF', 'guest'))
    expect(result.current.collab.mode).toBe('guest')
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

  it('destroys the awareness instance when a session ends, not just the socket', () => {
    // `WebsocketProvider.destroy()` clears its own timers but not its `Awareness`'s — that
    // object runs a ~3s heartbeat interval of its own (`y-protocols/awareness.js`) that
    // outlives the provider unless something destroys it too.
    const destroySpy = vi.spyOn(Awareness.prototype, 'destroy')
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('ABCDEF', 'host'))
    act(() => result.current.leaveRoom())

    expect(destroySpy).toHaveBeenCalled()
    destroySpy.mockRestore()
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

describe('The stashed local route', () => {
  const stashKey = `midnight-codex:route:${SLUG}:stashed`

  /** A saved local route, in the only form the app persists: an MDT string. */
  const saveLocalRoute = () => {
    const route = emptyRoute(SLUG, MDT_INDEX)
    route.name = 'My own route'
    localStorage.setItem(storageKey, encodeMdtString(routeToLua(route)))
  }

  it('sets the local route aside when joining someone else’s room', () => {
    saveLocalRoute()
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('GGGGGG', 'guest'))
    expect(localStorage.getItem(stashKey)).not.toBeNull()
    unmount()
  })

  it('gives it back on leaving', () => {
    saveLocalRoute()
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('GGGGGG', 'guest'))
    act(() => result.current.leaveRoom())
    expect(result.current.route.name).toBe('My own route')
    expect(localStorage.getItem(stashKey)).toBeNull()
    unmount()
  })

  it('gives it back at startup when a tab was closed mid-session', () => {
    saveLocalRoute()
    const stashed = localStorage.getItem(storageKey)!
    localStorage.setItem(stashKey, stashed)
    localStorage.setItem(storageKey, encodeMdtString(routeToLua(emptyRoute(SLUG, MDT_INDEX))))

    const { result } = mount()
    expect(result.current.route.name).toBe('My own route')
    expect(localStorage.getItem(stashKey)).toBeNull()
  })

  it('does not overwrite the stash when hopping from one room to another', () => {
    saveLocalRoute()
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('GGGGGG', 'guest'))
    const afterFirstJoin = localStorage.getItem(stashKey)
    act(() => result.current.joinRoom('HHHHHH', 'guest'))
    expect(localStorage.getItem(stashKey)).toBe(afterFirstJoin)
    unmount()
  })

  it('stashes nothing for a host, whose document is the room', () => {
    saveLocalRoute()
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('GGGGGG', 'host'))
    expect(localStorage.getItem(stashKey)).toBeNull()
    unmount()
  })

  it('does not let an undecodable stash destroy the route already on file', () => {
    saveLocalRoute()
    localStorage.setItem(stashKey, 'corrupted content')

    const { result } = mount()
    // The stash is validated before it is committed: a corrupt one must not overwrite the
    // route already sitting under the ordinary key, and must not survive to the next mount.
    expect(result.current.route.name).toBe('My own route')
    expect(localStorage.getItem(stashKey)).toBeNull()
  })

  it('does not throw when leaving with an undecodable stash, and still clears it', () => {
    const { result, unmount } = mount()
    localStorage.setItem(stashKey, 'corrupted content')

    expect(() => act(() => result.current.leaveRoom())).not.toThrow()
    expect(localStorage.getItem(stashKey)).toBeNull()
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
    expect(self(result.current.collab.peers).isSelf).toBe(true)
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

describe('Sync and cursors', () => {
  it('does not claim to be synced before the room has answered', () => {
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('ZZZZZZ', 'guest'))
    expect(result.current.collab.synced).toBe(false)
    unmount()
  })

  it('marks the session synced once the relay answers with the room state', () => {
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('ZZZZZZ', 'guest'))
    expect(result.current.collab.synced).toBe(false)

    // Drive the socket the provider actually created, the way a relay would: open the
    // connection, then answer with a sync step 2 frame. `provider.synced` only flips through
    // this exact message being decoded — see `y-websocket/src/y-websocket.js:44` — so there is
    // no shortcut that does not also exercise that decoding.
    //
    // The open and the answer are driven in separate `act()` calls on purpose: coalesced into
    // one, React would only read `provider.synced` once, at the end of the batch — by which
    // time the answer has already landed — and the assertion would pass whether or not the
    // provider's `sync` event is even wired up. Committing the "open, not yet synced" state
    // first is what forces the later flip to come from that event.
    const socket = SilentSocket.instances.at(-1)!
    act(() => {
      socket.readyState = SilentSocket.OPEN
      socket.onopen?.()
    })
    expect(result.current.collab.status).toBe('connected')
    expect(result.current.collab.synced).toBe(false)

    act(() => socket.onmessage?.({ data: relaySyncStep2() }))
    expect(result.current.collab.synced).toBe(true)
    unmount()
  })

  it('reports no cursor before anyone has moved', () => {
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('ZZZZZZ', 'host'))
    expect(self(result.current.collab.peers).cursor).toBeUndefined()
    unmount()
  })

  it('shares the first move at once', () => {
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('ZZZZZZ', 'host'))
    act(() => result.current.setCursor({ x: 100, y: 200 }))
    expect(self(result.current.collab.peers).cursor).toEqual({ x: 100, y: 200 })
    unmount()
  })

  it('holds back a flood of moves, then sends the last one', () => {
    vi.useFakeTimers()
    try {
      const { result, unmount } = mount()
      act(() => result.current.joinRoom('ZZZZZZ', 'host'))
      act(() => result.current.setCursor({ x: 1, y: 1 }))
      for (let i = 2; i <= 40; i++) act(() => result.current.setCursor({ x: i, y: i }))

      expect(self(result.current.collab.peers).cursor).toEqual({ x: 1, y: 1 })
      act(() => void vi.advanceTimersByTime(60))
      expect(self(result.current.collab.peers).cursor).toEqual({ x: 40, y: 40 })
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('drops the cursor at once when the pointer leaves the map', () => {
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('ZZZZZZ', 'host'))
    act(() => result.current.setCursor({ x: 100, y: 200 }))
    act(() => result.current.setCursor(null))
    expect(self(result.current.collab.peers).cursor).toBeUndefined()
    unmount()
  })

  it('leaves no timer running when unmounted with no session ever open', () => {
    vi.useFakeTimers()
    try {
      const { result, unmount } = mount()
      // The first call always writes at once (nothing to throttle against yet); the second
      // lands inside the throttle window and is what schedules the trailing timer — with no
      // session open at all, let alone one for `closeSession` to have torn down.
      act(() => result.current.setCursor({ x: 1, y: 1 }))
      act(() => result.current.setCursor({ x: 2, y: 2 }))
      unmount()
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
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

/** jsdom reports a visibility, but does not let a page change it. */
const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('An idle session pauses itself', () => {
  afterEach(() => {
    setVisibility('visible')
    vi.useRealTimers()
  })

  it('pauses five minutes after the tab is hidden', () => {
    vi.useFakeTimers()
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('PAUSE1', 'host'))
    expect(result.current.collab.status).not.toBe('paused')

    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(5 * 60_000))
    expect(result.current.collab.status).toBe('paused')
    unmount()
  })

  it('does not pause a hidden tab before those five minutes are up', () => {
    vi.useFakeTimers()
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('PAUSE2', 'host'))
    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(4 * 60_000))
    expect(result.current.collab.status).not.toBe('paused')
    unmount()
  })

  it('pauses a visible tab nobody has touched for fifteen minutes', () => {
    vi.useFakeTimers()
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('PAUSE3', 'host'))
    act(() => void vi.advanceTimersByTime(15 * 60_000))
    expect(result.current.collab.status).toBe('paused')
    unmount()
  })

  it('starts the clock over on any sign of life', () => {
    vi.useFakeTimers()
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('PAUSE4', 'host'))
    act(() => void vi.advanceTimersByTime(14 * 60_000))
    act(() => void document.dispatchEvent(new Event('pointermove')))
    act(() => void vi.advanceTimersByTime(14 * 60_000))
    expect(result.current.collab.status).not.toBe('paused')
    unmount()
  })

  it('comes back on request, on a new socket', () => {
    vi.useFakeTimers()
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('PAUSE5', 'host'))
    const opened = SilentSocket.instances.length
    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(5 * 60_000))
    expect(result.current.collab.status).toBe('paused')

    act(() => result.current.resumeRoom())
    expect(result.current.collab.status).not.toBe('paused')
    expect(result.current.collab.room).toBe('PAUSE5')
    expect(SilentSocket.instances.length).toBeGreaterThan(opened)
    unmount()
  })

  it('keeps the room and the document, because a pause is not a departure', () => {
    vi.useFakeTimers()
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('PAUSE6', 'host'))
    act(() => result.current.actions.setName('Week 12'))
    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(5 * 60_000))
    expect(result.current.collab.room).toBe('PAUSE6')
    expect(result.current.route.name).toBe('Week 12')
    unmount()
  })

  it('leaves a session that was never opened alone', () => {
    vi.useFakeTimers()
    const { result, unmount } = mount()
    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(30 * 60_000))
    expect(result.current.collab.status).toBe('off')
    unmount()
  })

  it('does not let a stale update overwrite a settled pause', () => {
    // `provider.disconnect()` sets `wsconnected` false and fires `status` synchronously, before
    // `pauseSession`'s own `setCollab` runs — so that trailing write, not the guard alone, is
    // what usually wins. This drives an `update()` well after the pause has settled, with no
    // corrective write behind it, to prove the guard in `update` is what holds the line.
    vi.useFakeTimers()
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('PAUSE7', 'host'))
    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(5 * 60_000))
    expect(result.current.collab.status).toBe('paused')

    act(() => result.current.setIdentity('Rwl'))
    expect(result.current.collab.status).toBe('paused')
    unmount()
  })

  it('gives the local route back when leaving a paused guest session', () => {
    // Mirrors the setup `describe('The stashed local route', …)` uses for its own leave test:
    // a local route on file before a guest joins someone else's room, which stashes it. Decision
    // 5 promises that a pause does not change this — "a pause is not a departure" — but every
    // other pause test here joins as `'host'`, where there is no stash at all to give back.
    vi.useFakeTimers()
    const route = emptyRoute(SLUG, MDT_INDEX)
    route.name = 'My own route'
    localStorage.setItem(storageKey, encodeMdtString(routeToLua(route)))

    const { result, unmount } = mount()
    act(() => result.current.joinRoom('PAUSE8', 'guest'))
    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(5 * 60_000))
    expect(result.current.collab.status).toBe('paused')

    act(() => result.current.leaveRoom())
    expect(result.current.route.name).toBe('My own route')
    unmount()
  })

  it('re-arms its own idle timer on resume, so a second idle stretch pauses again', () => {
    vi.useFakeTimers()
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('PAUSE9', 'host'))
    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(5 * 60_000))
    expect(result.current.collab.status).toBe('paused')

    act(() => result.current.resumeRoom())
    expect(result.current.collab.status).not.toBe('paused')

    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(5 * 60_000))
    expect(result.current.collab.status).toBe('paused')
    unmount()
  })

  it('re-announces its own presence on resume, so it is seen at once rather than after the renewal timer', () => {
    // `removeAwarenessStates` only advances a clock for the awareness instance's own id, so
    // every peer that saw this session pause still remembers the exact clock it held when it
    // left. Resending that unchanged state on reconnect would be discarded everywhere as a
    // stale duplicate — `resumeRoom` has to call `setLocalState` again to bump it, the same
    // renewal `Awareness`'s own ~15s interval performs unprompted. There is no clock exposed
    // through `collab`, so this pins the mechanism the way the file already does elsewhere
    // (`destroys the awareness instance…`): spying on the `Awareness` method that is the only
    // thing capable of advancing it.
    vi.useFakeTimers()
    const { result, unmount } = mount()
    act(() => result.current.joinRoom('PAUSE10', 'host'))
    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(5 * 60_000))
    expect(result.current.collab.status).toBe('paused')

    const setLocalStateSpy = vi.spyOn(Awareness.prototype, 'setLocalState')
    act(() => result.current.resumeRoom())
    expect(setLocalStateSpy).toHaveBeenCalled()
    setLocalStateSpy.mockRestore()
    unmount()
  })
})
