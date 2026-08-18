// ABOUTME: Tests the reading of Yjs awareness states into a list of participants.
// ABOUTME: Pure functions, so no provider, no socket and no DOM.

import { describe, expect, it } from 'vitest'
import { peerColor, readPeers } from './presence'

describe('peerColor', () => {
  it('gives the same client the same colour every time', () => {
    expect(peerColor(4821)).toBe(peerColor(4821))
  })

  it('separates two clients', () => {
    expect(peerColor(1)).not.toBe(peerColor(2))
  })

  it('stays a valid CSS colour for a huge client id', () => {
    expect(peerColor(4294967295)).toMatch(/^hsl\(\d{1,3} \d{1,3}% \d{1,3}%\)$/)
  })
})

describe('readPeers', () => {
  const states = () =>
    new Map<number, unknown>([
      [1, { user: { name: 'Alice' }, cursor: { x: 10, y: 20 } }],
      [2, { user: { name: 'Bob' } }],
    ])

  it('keeps yourself in the list, flagged', () => {
    const peers = readPeers(states(), 1)
    expect(peers.map((p) => p.name)).toEqual(['Alice', 'Bob'])
    expect(peers.map((p) => p.isSelf)).toEqual([true, false])
  })

  it('reads a cursor when there is one', () => {
    expect(readPeers(states(), 1)[0].cursor).toEqual({ x: 10, y: 20 })
  })

  it('leaves the cursor out when the peer has not moved yet', () => {
    expect(readPeers(states(), 1)[1].cursor).toBeUndefined()
  })

  it('survives a peer that has announced nothing at all', () => {
    const peers = readPeers(new Map<number, unknown>([[7, {}]]), 1)
    expect(peers).toHaveLength(1)
    expect(peers[0].name).toBe('')
    expect(peers[0].cursor).toBeUndefined()
  })

  it('ignores a cursor that is not a pair of numbers', () => {
    const peers = readPeers(new Map<number, unknown>([[7, { cursor: { x: 'far' } }]]), 1)
    expect(peers[0].cursor).toBeUndefined()
  })

  it('reads a drawing when there is one', () => {
    const points = [{ x: 1, y: 1 }, { x: 2, y: 2 }]
    const peers = readPeers(new Map<number, unknown>([[7, { drawing: points }]]), 1)
    expect(peers[0].drawing).toEqual(points)
  })

  it('leaves the drawing out when the peer is not mid-gesture', () => {
    const peers = readPeers(new Map<number, unknown>([[7, {}]]), 1)
    expect(peers[0].drawing).toBeUndefined()
  })

  it('ignores a drawing that is not an array', () => {
    const peers = readPeers(new Map<number, unknown>([[7, { drawing: { x: 1, y: 1 } }]]), 1)
    expect(peers[0].drawing).toBeUndefined()
  })

  it('ignores a drawing with a point that is not a pair of numbers', () => {
    const peers = readPeers(
      new Map<number, unknown>([[7, { drawing: [{ x: 1, y: 1 }, { x: 'far' }] }]]),
      1,
    )
    expect(peers[0].drawing).toBeUndefined()
  })

  it('orders by client id, so cursors do not swap places between renders', () => {
    const shuffled = new Map<number, unknown>([
      [9, { user: { name: 'C' } }],
      [3, { user: { name: 'A' } }],
      [5, { user: { name: 'B' } }],
    ])
    expect(readPeers(shuffled, 3).map((p) => p.name)).toEqual(['A', 'B', 'C'])
  })
})
