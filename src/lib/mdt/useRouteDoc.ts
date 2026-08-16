/**
 * État de la route, porté par un document Y.js.
 *
 * Le Y.Doc est la source de vérité **en permanence**, même hors session collaborative : il n'y
 * a donc qu'un seul chemin de code, et brancher le réseau ne consiste qu'à attacher un
 * provider. Les mutations passent par des opérations d'intention (« ajoute ce pack au pull 3 »)
 * plutôt que par un remplacement global, ce qui permet à deux personnes d'éditer des pulls
 * différents sans s'écraser.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import type { CloneRef } from '../types'
import { cloneKey } from '../data'
import { decodeMdtString, encodeMdtString } from './string'
import { luaToRoute, nextColor, routeToLua, type Pull, type Route } from './route'
import type { LuaTable } from './cbor'

const SIGNALING = [import.meta.env.VITE_SIGNALING_URL || 'wss://y-webrtc-eu.fly.dev']

const storageKey = (slug: string) => `midnight-codex:route:${slug}`

export type CollabStatus = 'off' | 'connecting' | 'connected'

interface PullShape {
  color: string
  clones: Y.Array<string>
}

type PullMap = Y.Map<string | Y.Array<string>>

/** Le preset importé est conservé sous forme de string, seul format sérialisable dans le doc. */
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
    name: (root.get('name') as string) || 'Nouvelle route',
    slug,
    mdtIndex,
    pulls: pulls.length ? pulls : [{ color: nextColor(0), clones: [] }],
    source: decodeSource(root.get('source') as string | undefined),
  }
}

/** Remplit un document vide à partir d'une route existante. */
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
  /** Ajoute les clones au pull, ou les retire s'ils y sont déjà tous. */
  toggleClones(pullIndex: number, refs: CloneRef[]): void
  importRoute(mdtString: string): Route
  reset(): void
}

export interface CollabState {
  status: CollabStatus
  room: string | null
  /** Nombre de participants, soi inclus. */
  peers: number
  identity: string
}

/**
 * À monter sous une clé de donjon (`<DungeonView key={slug}>`) : les index de mobs n'ont pas
 * le même sens d'un donjon à l'autre, donc changer de donjon doit repartir d'un document neuf.
 * On ne détruit jamais le Y.Doc — sans provider attaché ce n'est que de la mémoire, et le
 * détruire au démontage se retournerait contre le double montage de StrictMode.
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
    name: 'Nouvelle route',
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

  // Le doc pilote l'état React, jamais l'inverse.
  useEffect(() => {
    const root = doc.getMap('route')
    const sync = () => setRoute(readRoute(root, slug, mdtIndex))
    sync()
    const observer = () => sync()
    root.observeDeep(observer)
    return () => root.unobserveDeep(observer)
  }, [doc, slug, mdtIndex])

  // Sauvegarde locale, en string MDT : ce format porte déjà tout, y compris ce qu'on ne
  // sait pas éditer et qu'on restitue au ré-export.
  useEffect(() => {
    const handler = () => {
      try {
        const current = readRoute(doc.getMap('route'), slug, mdtIndex)
        localStorage.setItem(storageKey(slug), encodeMdtString(routeToLua(current)))
      } catch {
        // Quota dépassé ou navigation privée : ne doit jamais interrompre l'édition.
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
          // Y.Array n'a pas de déplacement : on retire puis on réinsère une copie.
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

          // Un clone n'appartient qu'à un seul pull : on le retire partout d'abord.
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
          root.set('name', 'Nouvelle route')
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

      // En rejoignant, on vide d'abord le document local : sinon les pulls des deux côtés
      // fusionneraient et se cumuleraient. L'hôte, lui, apporte sa route au salon.
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

/** Nom stable et lisible, mémorisé entre les sessions. */
function identityName(): string {
  const key = 'midnight-codex:identity'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const name = `Joueur-${Math.floor(1000 + Math.random() * 9000)}`
  localStorage.setItem(key, name)
  return name
}

/** Code de salon court, facile à dicter sur Discord. */
export function randomRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}
