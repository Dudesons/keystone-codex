// ABOUTME: Route state, held by a Y.js document that is the source of truth at all times.
// ABOUTME: Mutations are intent operations, so two people can edit different pulls at once.

/**
 * Route state, held by a Y.js document.
 *
 * The Y.Doc is the source of truth **at all times**, even outside a collaborative session:
 * there is therefore only one code path, and plugging in the network is nothing more than
 * attaching a provider. Mutations go through intent operations ("add this pack to pull 3")
 * rather than a wholesale replacement, which lets two people edit different pulls without
 * overwriting each other.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import type { CloneRef } from '../types'
import { cloneKey } from '../data'
import type { Point } from '../geometry'
import { decodeMdtString, encodeMdtString } from './string'
import { DEFAULT_ROUTE_NAME, luaToRoute, nextColor, routeToLua, type Pull, type Route } from './route'
import type { LuaTable } from './cbor'
import { readPeers, type Peer } from '../collab/presence'

/**
 * Where a session meets.
 *
 * WebRTC came first here, because it asked nothing of us but a handshake. Every public
 * y-webrtc signaling server that handshake relied on has since gone dark, and with no
 * signaling two browsers never find each other at all — which left the feature working only
 * between tabs of one browser, over `BroadcastChannel`. A relay is one host to keep alive
 * rather than a rendezvous nobody runs any more, and it reaches through the NAT and the
 * corporate firewall that WebRTC needs a TURN server to cross.
 */
const COLLAB_URL = import.meta.env.VITE_COLLAB_URL || 'wss://demos.yjs.dev/ws'

const storageKey = (slug: string) => `midnight-codex:route:${slug}`

/**
 * Where the local route waits while you are in someone else's room.
 *
 * The invariant: a stash exists exactly when a local route is waiting, and **every** way out
 * of a session puts it back — leaving, and also closing the tab, which is why the initial
 * document consults it too.
 */
const stashKey = (slug: string) => `${storageKey(slug)}:stashed`

/** Namespaced by dungeon: the same code in two dungeons is two different rooms. */
export const roomName = (slug: string, code: string) => `midnight-codex:${slug}:${code}`

export type CollabStatus = 'off' | 'connecting' | 'connected'

/**
 * How often a cursor is allowed on the wire.
 *
 * A pointer fires sixty times a second. Twenty is already past what an eye resolves in a
 * moving arrow, and the other forty would be a relay's bandwidth spent on nothing.
 */
const CURSOR_INTERVAL_MS = 50

interface PullShape {
  color: string
  clones: Y.Array<string>
}

type PullMap = Y.Map<string | Y.Array<string>>

/** The imported preset is kept as a string, the only form serialisable inside the doc. */
const sourceCache = new Map<string, LuaTable | undefined>()

function decodeSource(raw: string | undefined): LuaTable | undefined {
  if (!raw) return undefined
  if (sourceCache.has(raw)) return sourceCache.get(raw)
  let table: LuaTable | undefined
  try {
    table = decodeMdtString(raw).table
  } catch {
    table = undefined
  }
  sourceCache.set(raw, table)
  return table
}

const refKey = (ref: CloneRef) => cloneKey(ref.enemyIdx, ref.cloneIdx)

const parseRef = (key: string): CloneRef => {
  const [enemyIdx, cloneIdx] = key.split(':').map(Number)
  return { enemyIdx, cloneIdx }
}

function makePull(color: string, clones: string[] = []): PullMap {
  const map = new Y.Map() as PullMap
  map.set('color', color)
  map.set('clones', Y.Array.from(clones))
  return map
}

function readRoute(root: Y.Map<unknown>, slug: string, mdtIndex: number): Route {
  const pullsArr = root.get('pulls') as Y.Array<PullMap> | undefined
  const pulls: Pull[] = []

  pullsArr?.forEach((pull, i) => {
    const clones = pull.get('clones') as PullShape['clones'] | undefined
    pulls.push({
      color: (pull.get('color') as string) || nextColor(i),
      clones: clones ? clones.toArray().map(parseRef) : [],
    })
  })

  return {
    name: (root.get('name') as string) || DEFAULT_ROUTE_NAME,
    slug,
    mdtIndex,
    pulls: pulls.length ? pulls : [{ color: nextColor(0), clones: [] }],
    source: decodeSource(root.get('source') as string | undefined),
  }
}

/** Fills an empty document from an existing route. */
function seed(doc: Y.Doc, route: Route, sourceString?: string) {
  const root = doc.getMap('route')
  doc.transact(() => {
    root.set('name', route.name)
    if (sourceString) root.set('source', sourceString)
    const pulls = new Y.Array<PullMap>()
    root.set('pulls', pulls)
    pulls.push(route.pulls.map((p) => makePull(p.color, p.clones.map(refKey))))
  })
}

export interface RouteActions {
  setName(name: string): void
  addPull(): void
  removePull(index: number): void
  movePull(index: number, delta: number): void
  setPullColor(index: number, color: string): void
  /** Adds the clones to the pull, or removes them if they are all already in it. */
  toggleClones(pullIndex: number, refs: CloneRef[]): void
  importRoute(mdtString: string): Route
  reset(): void
}

export interface CollabState {
  status: CollabStatus
  room: string | null
  /** Participants, yourself included. */
  peers: Peer[]
  identity: string | null
  /** Whether the provider has received the room's state at least once, not merely opened a socket. */
  synced: boolean
  /**
   * Whether this session opened the room or joined someone else's; `null` outside a session.
   *
   * A host's document already is the room's, so it never waits on anyone to fill it in — the
   * distinction the "fetching the room's route" notice needs, since a route with no clones
   * yet is otherwise indistinguishable from one that simply hasn't arrived.
   */
  mode: 'host' | 'guest' | null
}

/**
 * To be mounted under a dungeon key (`<DungeonView key={slug}>`): mob indices do not mean
 * the same thing from one dungeon to the next, so changing dungeon must start from a fresh
 * document. The Y.Doc is never destroyed — with no provider attached it is only memory, and
 * destroying it on unmount would backfire against StrictMode's double mount.
 */
export function useRouteDoc(slug: string, mdtIndex: number) {
  const [doc, setDoc] = useState(() => {
    const fresh = new Y.Doc()

    // A stash left behind means a session was interrupted rather than left. Closing a tab
    // counts as leaving, so the route goes back before anything else reads storage. It is
    // validated before it is committed, the same order `leaveRoom` uses: an undecodable
    // stash is not a route waiting, and must not overwrite whatever the ordinary key holds.
    // Either way it is cleared, so it cannot come back on a later mount.
    const stashed = localStorage.getItem(stashKey(slug))
    let restoredFromStash = false
    if (stashed) {
      try {
        seed(fresh, luaToRoute(decodeMdtString(stashed).table), stashed)
        localStorage.setItem(storageKey(slug), stashed)
        restoredFromStash = true
      } catch {
        // Corrupt: nothing to restore, and the route already on file must survive it.
      }
      localStorage.removeItem(stashKey(slug))
    }

    if (!restoredFromStash) {
      const saved = localStorage.getItem(storageKey(slug))
      if (saved) {
        try {
          seed(fresh, luaToRoute(decodeMdtString(saved).table), saved)
        } catch {
          localStorage.removeItem(storageKey(slug))
        }
      }
    }
    return fresh
  })

  const [route, setRoute] = useState<Route>(() => ({
    name: DEFAULT_ROUTE_NAME,
    slug,
    mdtIndex,
    pulls: [{ color: nextColor(0), clones: [] }],
  }))

  /** The open session, with the means to unsubscribe from it before tearing it down. */
  const sessionRef = useRef<{ provider: WebsocketProvider; detach: () => void } | null>(null)
  const [collab, setCollab] = useState<CollabState>(() => ({
    status: 'off',
    room: null,
    peers: [],
    identity: storedIdentity(),
    synced: false,
    mode: null,
  }))

  /** Throttles cursor writes: at most one every `CURSOR_INTERVAL_MS`, always the latest. */
  const cursorRef = useRef<{ last: number; pending: Point | null; timer: ReturnType<typeof setTimeout> | null }>({
    last: 0,
    pending: null,
    timer: null,
  })

  const closeSession = useCallback(() => {
    // A throttled write outlives neither the session it was queued for nor, if none was ever
    // open, the component itself: `setCursor` schedules this timer regardless of `sessionRef`,
    // so its cleanup cannot sit behind a guard on `sessionRef` being set.
    if (cursorRef.current.timer != null) {
      clearTimeout(cursorRef.current.timer)
      cursorRef.current.timer = null
    }
    cursorRef.current.pending = null

    const open = sessionRef.current
    if (!open) return
    // Unsubscribe before destroying. Tearing a provider down emits one last awareness change,
    // and a listener still attached would put the session straight back on screen — with no
    // room and no provider behind it, which is a session you can neither leave nor rejoin.
    open.detach()
    open.provider.destroy()
    sessionRef.current = null
  }, [])

  useEffect(() => () => closeSession(), [closeSession])

  // The doc drives React state, never the other way round.
  useEffect(() => {
    const root = doc.getMap('route')
    const sync = () => setRoute(readRoute(root, slug, mdtIndex))
    sync()
    const observer = () => sync()
    root.observeDeep(observer)
    return () => root.unobserveDeep(observer)
  }, [doc, slug, mdtIndex])

  // Local save, as an MDT string: that format already carries everything, including what
  // we cannot edit and hand back on re-export.
  useEffect(() => {
    const handler = () => {
      try {
        const current = readRoute(doc.getMap('route'), slug, mdtIndex)
        localStorage.setItem(storageKey(slug), encodeMdtString(routeToLua(current)))
      } catch {
        // Quota exceeded or private browsing: must never interrupt editing.
      }
    }
    doc.on('update', handler)
    return () => doc.off('update', handler)
  }, [doc, slug, mdtIndex])

  const withPulls = useCallback(
    (fn: (pulls: Y.Array<PullMap>, root: Y.Map<unknown>) => void) => {
      const root = doc.getMap('route')
      doc.transact(() => {
        let pulls = root.get('pulls') as Y.Array<PullMap> | undefined
        if (!pulls) {
          pulls = new Y.Array<PullMap>()
          root.set('pulls', pulls)
        }
        if (pulls.length === 0) pulls.push([makePull(nextColor(0))])
        fn(pulls, root)
      })
    },
    [doc],
  )

  const actions = useMemo<RouteActions>(
    () => ({
      setName: (name) => doc.transact(() => doc.getMap('route').set('name', name)),

      addPull: () => withPulls((pulls) => pulls.push([makePull(nextColor(pulls.length))])),

      removePull: (index) =>
        withPulls((pulls) => {
          if (index >= 0 && index < pulls.length) pulls.delete(index, 1)
          if (pulls.length === 0) pulls.push([makePull(nextColor(0))])
        }),

      movePull: (index, delta) =>
        withPulls((pulls) => {
          const target = index + delta
          if (target < 0 || target >= pulls.length) return
          const moved = pulls.get(index)
          const clones = (moved.get('clones') as Y.Array<string>).toArray()
          const color = moved.get('color') as string
          // Y.Array has no move operation: remove, then reinsert a copy.
          pulls.delete(index, 1)
          pulls.insert(target, [makePull(color, clones)])
        }),

      setPullColor: (index, color) =>
        withPulls((pulls) => {
          if (index >= 0 && index < pulls.length) pulls.get(index).set('color', color)
        }),

      toggleClones: (pullIndex, refs) =>
        withPulls((pulls) => {
          const keys = refs.map(refKey)
          const keySet = new Set(keys)
          const target = pulls.get(Math.min(pullIndex, pulls.length - 1))
          const targetClones = target.get('clones') as Y.Array<string>
          const alreadyThere = keys.every((k) => targetClones.toArray().includes(k))

          // A clone belongs to exactly one pull: remove it everywhere first.
          pulls.forEach((pull) => {
            const arr = pull.get('clones') as Y.Array<string>
            for (let i = arr.length - 1; i >= 0; i--) {
              if (keySet.has(arr.get(i))) arr.delete(i, 1)
            }
          })

          if (!alreadyThere) targetClones.push(keys)
        }),

      importRoute: (mdtString) => {
        const decoded = decodeMdtString(mdtString)
        const imported = luaToRoute(decoded.table)
        const root = doc.getMap('route')
        doc.transact(() => {
          root.set('name', imported.name)
          root.set('source', mdtString)
          const pulls = new Y.Array<PullMap>()
          root.set('pulls', pulls)
          pulls.push(imported.pulls.map((p) => makePull(p.color, p.clones.map(refKey))))
        })
        return imported
      },

      reset: () =>
        doc.transact(() => {
          const root = doc.getMap('route')
          root.set('name', DEFAULT_ROUTE_NAME)
          root.delete('source')
          const pulls = new Y.Array<PullMap>()
          root.set('pulls', pulls)
          pulls.push([makePull(nextColor(0))])
        }),
    }),
    [doc, withPulls],
  )

  const joinRoom = useCallback(
    (room: string, mode: 'host' | 'guest') => {
      closeSession()

      // Only on the way in from local editing: hopping from one room to another must not
      // bury the route you started with under the one you are leaving. A host stashes
      // nothing — its document is the room.
      if (mode === 'guest' && collab.status === 'off') {
        const local = localStorage.getItem(storageKey(slug))
        if (local) localStorage.setItem(stashKey(slug), local)
      }

      // A guest adopts the room's document; it does not push its own into it. Two documents
      // that have each set `pulls` leave that one key to be arbitrated on merge, and the
      // loser's entire route is dropped — from the host's side, the route everyone came for.
      // Handing the provider an empty document leaves the merge nothing to arbitrate. The
      // host, by contrast, brings its route to the room, which is the point of opening one.
      const target = mode === 'guest' ? new Y.Doc() : doc
      setDoc(target)

      const provider = new WebsocketProvider(COLLAB_URL, roomName(slug, room), target)
      if (collab.identity) provider.awareness.setLocalStateField('user', { name: collab.identity })

      const update = () =>
        setCollab((c) => ({
          ...c,
          // The socket, not an intention. The previous reading was true as soon as a room
          // existed, so a session whose relay never answered still called itself connected.
          status: provider.wsconnected ? 'connected' : 'connecting',
          synced: provider.synced,
          peers: readPeers(provider.awareness.getStates(), provider.awareness.clientID),
        }))

      provider.awareness.on('change', update)
      provider.on('status', update)
      provider.on('sync', update)
      sessionRef.current = {
        provider,
        detach: () => {
          provider.awareness.off('change', update)
          provider.off('status', update)
          provider.off('sync', update)
        },
      }

      setCollab((c) => ({ ...c, status: 'connecting', room, synced: false, mode }))
      update()
    },
    [doc, slug, collab.identity, collab.status, closeSession],
  )

  const leaveRoom = useCallback(() => {
    closeSession()
    const stashed = localStorage.getItem(stashKey(slug))
    if (stashed) {
      const restored = new Y.Doc()
      try {
        seed(restored, luaToRoute(decodeMdtString(stashed).table), stashed)
        setDoc(restored)
        localStorage.setItem(storageKey(slug), stashed)
      } catch {
        // An unreadable stash must not trap anyone inside a session they want to leave.
      }
      localStorage.removeItem(stashKey(slug))
    }
    setCollab((c) => ({ ...c, status: 'off', room: null, peers: [], synced: false, mode: null }))
  }, [closeSession, slug])

  const setCursor = useCallback((point: Point | null) => {
    const state = cursorRef.current
    const write = (value: Point | null) => {
      // Read the provider at the moment of writing, never through a closure: a throttled write
      // can land after the session it belonged to was torn down.
      sessionRef.current?.provider.awareness.setLocalStateField('cursor', value)
    }

    // Leaving the map is not throttled. A cursor that lingers where its owner no longer is says
    // something false, and says it for as long as nobody moves.
    if (point === null) {
      state.pending = null
      write(null)
      return
    }

    const wait = CURSOR_INTERVAL_MS - (Date.now() - state.last)
    if (wait <= 0) {
      state.last = Date.now()
      write(point)
      return
    }

    state.pending = point
    if (state.timer == null) {
      state.timer = setTimeout(() => {
        state.timer = null
        state.last = Date.now()
        if (state.pending) write(state.pending)
        state.pending = null
      }, wait)
    }
  }, [])

  const setIdentity = useCallback((name: string) => {
    const trimmed = name.trim()
    localStorage.setItem(IDENTITY_KEY, trimmed)
    setCollab((c) => ({ ...c, identity: trimmed }))
    sessionRef.current?.provider.awareness.setLocalStateField('user', { name: trimmed })
  }, [])

  return { route, actions, collab, joinRoom, leaveRoom, setIdentity, setCursor }
}

const IDENTITY_KEY = 'midnight-codex:identity'

/**
 * The name you chose, or nothing yet.
 *
 * Not translated, for the same reason as `DEFAULT_ROUTE_NAME`: this name is replicated to
 * Y.js peers, so two teammates on different locales must see the same string for the same
 * person. Returning nothing on a first visit is what makes choosing one mean something —
 * offering an invented name would have everybody accept it without reading.
 */
function storedIdentity(): string | null {
  return localStorage.getItem(IDENTITY_KEY)
}

/** A short room code, easy to read out on Discord. */
export function randomRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}
