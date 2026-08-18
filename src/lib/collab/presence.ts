// ABOUTME: Turns Yjs awareness states into the participants of a session.
// ABOUTME: Pure, because a colour or a coordinate can be wrong without anything looking broken.

import type { Point } from '../geometry'

export interface Peer {
  clientId: number
  /** Empty until the peer has announced a name. */
  name: string
  color: string
  /** In map coordinates. Absent until the peer moves over the map. */
  cursor?: Point
  /** The stroke this peer is drawing right now, in map pixels. Absent between gestures. */
  drawing?: Point[]
  /** You. Kept in the list so a count of it means "participants, yourself included". */
  isSelf: boolean
}

/**
 * A colour per participant, derived rather than agreed.
 *
 * Stepping the hue by the golden angle keeps neighbouring client ids far apart on the wheel,
 * and deriving it from the id alone means nobody has to negotiate: two browsers reach the
 * same colour for the same person without exchanging a word about it.
 */
const GOLDEN_ANGLE = 137.508

export function peerColor(clientId: number): string {
  const hue = Math.abs(Math.round(clientId * GOLDEN_ANGLE)) % 360
  return `hsl(${hue} 70% 62%)`
}

function readPoint(raw: unknown): Point | undefined {
  const p = raw as { x?: unknown; y?: unknown } | null
  if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return undefined
  return { x: p.x, y: p.y }
}

/** Tolerant the same way `readPoint` is: anything that is not a plain array of points is absent. */
function readPoints(raw: unknown): Point[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const points = raw.map(readPoint)
  return points.every((p): p is Point => p != null) ? points : undefined
}

/**
 * Reads the awareness map, tolerating whatever is missing.
 *
 * A peer that has just arrived has neither a name nor a cursor, and that must never break the
 * render — the same rule as a mob with no entry still appearing on the map. Ordering by client
 * id keeps cursors from swapping places in the DOM between two updates.
 */
export function readPeers(states: Map<number, unknown>, self: number): Peer[] {
  const peers: Peer[] = []
  states.forEach((raw, clientId) => {
    const state = (raw ?? {}) as { user?: { name?: unknown }; cursor?: unknown; drawing?: unknown }
    peers.push({
      clientId,
      name: typeof state.user?.name === 'string' ? state.user.name : '',
      color: peerColor(clientId),
      cursor: readPoint(state.cursor),
      drawing: readPoints(state.drawing),
      isSelf: clientId === self,
    })
  })
  return peers.sort((a, b) => a.clientId - b.clientId)
}
