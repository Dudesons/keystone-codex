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
import { WebrtcProvider } from 'y-webrtc'
import type { CloneRef } from '../types'
import { cloneKey } from '../data'
import { decodeMdtString, encodeMdtString } from './string'
import { DEFAULT_ROUTE_NAME, luaToRoute, nextColor, routeToLua, type Pull, type Route } from './route'
import type { LuaTable } from './cbor'

const SIGNALING = [import.meta.env.VITE_SIGNALING_URL || 'wss://y-webrtc-eu.fly.dev']


const storageKey = (slug: string) => `midnight-codex:route:${slug}`

export type CollabStatus = 'off' | 'connecting' | 'connected'

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
  /** Number of participants, yourself included. */
  peers: number
  identity: string
}

/**
 * To be mounted under a dungeon key (`<DungeonView key={slug}>`): mob indices do not mean
 * the same thing from one dungeon to the next, so changing dungeon must start from a fresh
 * document. The Y.Doc is never destroyed — with no provider attached it is only memory, and
 * destroying it on unmount would backfire against StrictMode's double mount.
 */
export function useRouteDoc(slug: string, mdtIndex: number) {
  const [doc] = useState(() => {
    const fresh = new Y.Doc()
    const saved = localStorage.getItem(storageKey(slug))
    if (saved) {
      try {
        seed(fresh, luaToRoute(decodeMdtString(saved).table), saved)
      } catch {
        localStorage.removeItem(storageKey(slug))
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

  const providerRef = useRef<WebrtcProvider | null>(null)
  const [collab, setCollab] = useState<CollabState>(() => ({
    status: 'off',
    room: null,
    peers: 0,
    identity: identityName(),
  }))

  useEffect(
    () => () => {
      providerRef.current?.destroy()
      providerRef.current = null
    },
    [],
  )

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
      providerRef.current?.destroy()

      // On joining, the local document is emptied first: otherwise the pulls from both
      // sides would merge and pile up. The host, by contrast, brings its route to the room.
      if (mode === 'guest') actions.reset()

      const provider = new WebrtcProvider(`midnight-codex:${slug}:${room}`, doc, {
        signaling: SIGNALING,
      })
      providerRef.current = provider
      provider.awareness.setLocalStateField('user', { name: collab.identity })

      const update = () =>
        setCollab((c) => ({
          ...c,
          status: provider.connected ? 'connected' : 'connecting',
          peers: provider.awareness.getStates().size,
        }))

      provider.awareness.on('change', update)
      provider.on('status', update)
      setCollab((c) => ({ ...c, status: 'connecting', room }))
      update()
    },
    [doc, slug, actions, collab.identity],
  )

  const leaveRoom = useCallback(() => {
    providerRef.current?.destroy()
    providerRef.current = null
    setCollab((c) => ({ ...c, status: 'off', room: null, peers: 0 }))
  }, [])

  return { route, actions, collab, joinRoom, leaveRoom }
}

/** A stable, readable name, remembered across sessions. */
function identityName(): string {
  const key = 'midnight-codex:identity'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const name = `Joueur-${Math.floor(1000 + Math.random() * 9000)}`
  localStorage.setItem(key, name)
  return name
}

/** A short room code, easy to read out on Discord. */
export function randomRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}
