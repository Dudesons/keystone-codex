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
import { luaToObjects, type MdtObject } from './objects'
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
 *
 * The default is our own Worker, `relay/`, on Cloudflare's free plan. It used to be
 * `wss://demos.yjs.dev/ws`, which is not dead — it refused an upgrade one morning and synced a
 * document that afternoon — but flaky is the same as dead for something people rely on. Vite
 * inlines this at build time, so a default in the source is what makes a fresh clone and the
 * deployed site work without anyone remembering a variable; `VITE_COLLAB_URL` overrides it for
 * a local relay and for the end-to-end harness.
 */
const COLLAB_URL = import.meta.env.VITE_COLLAB_URL || 'wss://keystone-relay.damdam-gold.workers.dev'

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

export type CollabStatus = 'off' | 'connecting' | 'connected' | 'paused'

/**
 * How often a cursor is allowed on the wire.
 *
 * A pointer fires sixty times a second. Twenty is already past what an eye resolves in a
 * moving arrow, and the other forty would be a relay's bandwidth spent on nothing.
 */
const CURSOR_INTERVAL_MS = 50

/**
 * How long an unattended session stays on the wire.
 *
 * An open socket keeps the relay's durable object loaded whether or not anyone is looking, and a
 * forgotten tab shows the others a cursor that will never move again — a quota problem and an
 * interface problem with one fix. Hidden is the short clock because a forgotten tab is almost
 * always a background tab or a locked screen; visible-but-untouched is the long one, because
 * somebody reading the map is not gone.
 */
const HIDDEN_PAUSE_MS = 5 * 60_000
const IDLE_PAUSE_MS = 15 * 60_000

/**
 * The origin every object edit passes to `doc.transact`. The `Y.UndoManager` below is scoped to
 * it, which is how the pull actions — which pass no origin at all — stay outside undo without
 * being touched: a bare `doc.transact(fn)` has a null origin, and `Y.UndoManager`'s
 * `trackedOrigins` must name this one explicitly to exclude them.
 */
export const OBJECT_EDIT = 'object-edit'

interface PullShape {
  color: string
  clones: Y.Array<string>
}

type PullMap = Y.Map<string | Y.Array<string>>

/** One object in the document. Y.js stores plain JSON, so the model's own fields go in as they are. */
type ObjectMap = Y.Map<unknown>

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

const storeObject = (object: MdtObject, id: string): ObjectMap => {
  const map: ObjectMap = new Y.Map()
  for (const [key, value] of Object.entries(object)) map.set(key, value)
  map.set('id', id)
  return map
}

/**
 * Reads the array back into the model. Stored flat rather than nested: `kind` is already the
 * discriminant, so a flat map needs no unwrapping and a new field on `MdtObject` needs no change
 * here.
 *
 * This trusts the stored shape rather than validating it: the only writer is `storeObject`, and
 * an object arriving from a peer over Y.js was written by that same code on their end. Adding a
 * schema check here would guard against a bug that would have to be in `storeObject` itself, not
 * against anything a peer or a malformed document can actually produce.
 */
const readObjects = (stored: Y.Array<ObjectMap>): MdtObject[] =>
  stored.toArray().map((map) => Object.fromEntries(map.entries()) as unknown as MdtObject)

const indexOfObject = (objects: Y.Array<ObjectMap>, id: string): number =>
  objects.toArray().findIndex((map) => map.get('id') === id)

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

  const source = decodeSource(root.get('source') as string | undefined)

  // Absent until the first object edit: while it is, `objects` stays derived from `source`
  // exactly as before this key existed at all, so a session that never draws never writes it.
  const stored = root.get('objects') as Y.Array<ObjectMap> | undefined
  const objects = stored ? readObjects(stored) : source ? luaToObjects(source) : []

  return {
    name: (root.get('name') as string) || DEFAULT_ROUTE_NAME,
    slug,
    mdtIndex,
    pulls: pulls.length ? pulls : [{ color: nextColor(0), clones: [] }],
    source,
    objects,
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
  /** Places an object. Adopts the preset's objects into the document first, if it has not happened yet. */
  addObject(object: MdtObject): void
  /** Replaces one object by identity. */
  updateObject(id: string, object: MdtObject): void
  removeObject(id: string): void
  /** Takes back this session's own last object edit. Does nothing to a peer's or a pull's. */
  undo(): void
  /** Reapplies this session's own last undone object edit. */
  redo(): void
}

export interface CollabState {
  /**
   * `paused` is a decision, not a failure: the socket was closed because nobody was there.
   * The room and the stash are kept, so `resumeRoom` puts the session back and `leaveRoom`
   * still gives the local route back.
   */
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
    objects: [],
  }))

  /**
   * `n` in every id this hook instance mints, `${doc.clientID}:${n}`. A ref rather than a
   * module-level counter: it must survive `doc` being swapped out (a guest joining a room gets a
   * fresh `Y.Doc`, with its own `clientID`), but a plain module variable would be shared by every
   * mounted `useRouteDoc` — including two peers in the same tab, as the collaboration tests set
   * up over `BroadcastChannel` — and nothing requires that. Scoping it here means two sessions
   * mint from independent counters, and uniqueness across them still comes from `clientID`.
   */
  const objectSeqRef = useRef(0)

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
    // `provider.destroy()` clears its own timers but leaves its `Awareness` running: that
    // object keeps a ~3s heartbeat interval of its own until destroyed separately.
    open.provider.awareness.destroy()
    sessionRef.current = null
  }, [])

  useEffect(() => () => closeSession(), [closeSession])

  /**
   * Read by the provider's own listeners, which would otherwise overwrite `paused` with what the
   * socket says: closing one emits a last awareness change, and `wsconnected` is false.
   */
  const pausedRef = useRef(false)

  const pauseSession = useCallback(() => {
    const open = sessionRef.current
    if (!open || pausedRef.current) return
    pausedRef.current = true
    // Disconnect, not destroy: the document, the room and the stash all survive a pause, and
    // `connect()` is what makes the way back one click rather than a rejoin.
    open.provider.disconnect()
    setCollab((c) => ({ ...c, status: 'paused', peers: [], synced: false }))
  }, [])

  const resumeRoom = useCallback(() => {
    const open = sessionRef.current
    if (!open || !pausedRef.current) return
    pausedRef.current = false
    /**
     * When this session paused, the relay — and, transitively, every other peer — marked its
     * presence removed via `removeAwarenessStates`, which only advances a clock for the
     * awareness instance's *own* id, never for a foreign one being removed
     * (`y-protocols/awareness.js`). So everyone still remembers the exact clock this session
     * held before it left, and `y-websocket` resends the local awareness state unchanged the
     * moment a new socket opens — at that same, already-seen clock. Re-announcing at it would be
     * silently discarded everywhere, exactly like a stale duplicate. Setting the local state
     * again here, even to itself, is what advances that clock: the identical renewal
     * `Awareness`'s own ~15s interval performs unprompted. Doing it before `connect()` means the
     * resumed session is seen again at once instead of waiting on that timer.
     */
    const awareness = open.provider.awareness
    if (awareness.getLocalState() !== null) awareness.setLocalState(awareness.getLocalState())
    setCollab((c) => ({ ...c, status: 'connecting', synced: false }))
    open.provider.connect()
  }, [])

  // The clock only runs while a session does, and only until it pauses itself.
  const live = collab.status === 'connecting' || collab.status === 'connected'
  useEffect(() => {
    if (!live) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const arm = () => {
      if (timer != null) clearTimeout(timer)
      timer = setTimeout(
        pauseSession,
        document.visibilityState === 'hidden' ? HIDDEN_PAUSE_MS : IDLE_PAUSE_MS,
      )
    }

    // A hidden tab gets the short clock from the moment it hides, not from the next event it
    // will never receive.
    const signals = ['pointermove', 'pointerdown', 'keydown', 'visibilitychange']
    signals.forEach((name) => document.addEventListener(name, arm))
    arm()

    return () => {
      if (timer != null) clearTimeout(timer)
      signals.forEach((name) => document.removeEventListener(name, arm))
    }
  }, [live, pauseSession])

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

  /**
   * `${clientID}:${n}`: deterministic, unique across peers because the client id is, and
   * testable without stubbing a random source. Reads `doc.clientID` fresh on every call, so it
   * always names whichever document this hook currently holds.
   */
  const nextObjectId = useCallback(() => `${doc.clientID}:${objectSeqRef.current++}`, [doc])

  /**
   * Runs `fn` against the document's object array, creating it on the first call by adopting
   * everything the preset carried. Adoption is deliberately lazy: a session that never edits an
   * object leaves the document exactly as it was before this key existed, and `readRoute` goes
   * on deriving the objects from `source`.
   */
  const withObjects = useCallback(
    (fn: (objects: Y.Array<ObjectMap>) => void) => {
      const root = doc.getMap('route')
      doc.transact(() => {
        let stored = root.get('objects') as Y.Array<ObjectMap> | undefined
        if (!stored) {
          stored = new Y.Array<ObjectMap>()
          root.set('objects', stored)
          const source = decodeSource(root.get('source') as string | undefined)
          if (source) stored.push(luaToObjects(source).map((o) => storeObject(o, nextObjectId())))
        }
        fn(stored)
      }, OBJECT_EDIT)
    },
    [doc, nextObjectId],
  )

  /**
   * Undo covers this session's own object edits and nothing else.
   *
   * Scoped to `root`, not to the object array: the array does not exist until the first edit, so
   * there would be nothing to scope to here, and the transaction that creates it must itself be
   * undoable — undoing the very first edit has to remove the adoption along with it, which falls
   * out for free once the manager watches the document root rather than a key that might not
   * exist yet. Isolation therefore comes from the origin, not the scope: `trackedOrigins` names
   * `OBJECT_EDIT` explicitly, because the default, `new Set([null])`, would also capture every
   * pull action and every peer's incoming change, none of which pass an origin at all.
   */
  const undoManager = useMemo(
    () => new Y.UndoManager(doc.getMap('route'), { trackedOrigins: new Set([OBJECT_EDIT]) }),
    [doc],
  )

  const [undoState, setUndoState] = useState({ canUndo: false, canRedo: false })
  useEffect(() => {
    const sync = () =>
      setUndoState({
        canUndo: undoManager.undoStack.length > 0,
        canRedo: undoManager.redoStack.length > 0,
      })
    undoManager.on('stack-item-added', sync)
    undoManager.on('stack-item-popped', sync)
    sync()
    return () => {
      undoManager.off('stack-item-added', sync)
      undoManager.off('stack-item-popped', sync)
      // The manager holds its own listener on the doc; leaving it running past this hook's
      // interest in `undoManager` is the same class of leak `closeSession` exists to avoid for
      // the provider and its awareness instance.
      undoManager.destroy()
    }
  }, [undoManager])

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
          // An adopted array is only ever a reading of the *previous* `source`. Left in place,
          // it would outlive the preset it was adopted from: an entry whose `from` happened to
          // collide with one of the new preset's own keys would be claimed and silently
          // synthesised over that preset's own object. Deleting it here, in the same
          // transaction, means a peer can never observe a route whose `source` and `objects`
          // disagree about which preset they came from — `objects` goes back to being derived
          // from the new `source`, exactly as it would for a document that had never adopted at
          // all.
          root.delete('objects')
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
          // Same reasoning as `importRoute`: an adopted array is a reading of the source that no
          // longer exists after this. Left behind, every adopted object would vanish from export
          // anyway (there is no `source` left for it to claim a key in), but silently — this
          // makes the model agree with that outcome instead of disagreeing with it.
          root.delete('objects')
        }),

      addObject: (object) => withObjects((objects) => objects.push([storeObject(object, nextObjectId())])),

      updateObject: (id, object) =>
        withObjects((objects) => {
          const index = indexOfObject(objects, id)
          if (index < 0) return
          // Y.Array has no replace: delete, then reinsert at the same index, as `movePull` does.
          // The same wart applies here — a peer's concurrent edit to this object is lost, not
          // merged — and matching the existing pattern is right for now rather than inventing a
          // different one for this one caller.
          objects.delete(index, 1)
          objects.insert(index, [storeObject(object, id)])
        }),

      removeObject: (id) =>
        withObjects((objects) => {
          const index = indexOfObject(objects, id)
          if (index >= 0) objects.delete(index, 1)
        }),

      undo: () => undoManager.undo(),
      redo: () => undoManager.redo(),
    }),
    [doc, withPulls, withObjects, nextObjectId, undoManager],
  )

  const joinRoom = useCallback(
    (room: string, mode: 'host' | 'guest') => {
      closeSession()
      pausedRef.current = false

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
          // A pause outranks both: it is why the socket is closed.
          status: pausedRef.current ? 'paused' : provider.wsconnected ? 'connected' : 'connecting',
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
    pausedRef.current = false
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

  return {
    route,
    actions,
    collab,
    joinRoom,
    leaveRoom,
    resumeRoom,
    setIdentity,
    setCursor,
    /** Whether there is anything of this session's own to undo, for a button's disabled state. */
    canUndo: undoState.canUndo,
    canRedo: undoState.canRedo,
  }
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
