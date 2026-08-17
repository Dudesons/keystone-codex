// ABOUTME: Tests the relay Worker and its Room durable object, inside workerd.
// ABOUTME: No network: the pool runs the real runtime in-process.

import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { connect, until } from './client'

describe('The relay Worker', () => {
  it('answers a plain request, so a browser opening the URL is not left guessing', async () => {
    const response = await SELF.fetch('https://relay.test/')
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('keystone relay')
  })
})

describe('A room', () => {
  it('carries one client’s edit to another', async () => {
    const a = await connect('carries-an-edit')
    const b = await connect('carries-an-edit')
    try {
      a.doc.getMap('route').set('name', 'Pull 7')
      await until(() => b.doc.getMap('route').get('name') === 'Pull 7', 'the edit to reach B')
      expect(b.doc.getMap('route').get('name')).toBe('Pull 7')
    } finally {
      a.close()
      b.close()
    }
  })

  it('keeps two rooms apart, so the same code in two dungeons is two rooms', async () => {
    const a = await connect('midnight-codex:altar-of-fangs:ABCDEF')
    const b = await connect('midnight-codex:other-dungeon:ABCDEF')
    try {
      a.doc.getMap('route').set('name', 'Pull 7')
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(b.doc.getMap('route').get('name')).toBeUndefined()
    } finally {
      a.close()
      b.close()
    }
  })
})

describe('Presence in a room', () => {
  it('carries a name and a cursor to everyone else', async () => {
    const a = await connect('presence-crosses')
    const b = await connect('presence-crosses')
    try {
      a.awareness.setLocalStateField('user', { name: 'RwlRwl', cursor: { x: 12, y: 34 } })
      const seen = () =>
        [...b.awareness.getStates().values()].filter((s) => s.user?.name === 'RwlRwl')
      await until(() => seen().length === 1, 'A’s presence to reach B')
      expect(seen()[0].user.cursor).toEqual({ x: 12, y: 34 })
    } finally {
      a.close()
      b.close()
    }
  })

  it('takes a cursor away with the socket that owned it, leaving no ghost', async () => {
    const a = await connect('presence-departs')
    const b = await connect('presence-departs')
    try {
      a.awareness.setLocalStateField('user', { name: 'RwlRwl' })
      await until(() => b.awareness.getStates().size === 2, 'B to see both participants')

      a.close()
      await until(() => b.awareness.getStates().size === 1, 'A’s presence to be withdrawn')
      expect([...b.awareness.getStates().values()].some((s) => s.user?.name === 'RwlRwl')).toBe(
        false,
      )
    } finally {
      b.close()
    }
  })

  it('sees a client again once it reconnects, name intact', async () => {
    const a = await connect('presence-returns')
    const b = await connect('presence-returns')
    try {
      a.awareness.setLocalStateField('user', { name: 'RwlRwl' })
      const seen = () =>
        [...b.awareness.getStates().values()].filter((s) => s.user?.name === 'RwlRwl')
      await until(() => seen().length === 1, 'A’s presence to reach B')

      a.close()
      await until(() => seen().length === 0, 'A’s presence to be withdrawn')

      await a.reconnect()
      await until(() => seen().length === 1, 'A’s presence to reach B again after reconnecting')
      expect(seen()[0].user.name).toBe('RwlRwl')
    } finally {
      a.close()
      b.close()
    }
  })

  it('withdraws only the departing socket’s presence, leaving the others untouched', async () => {
    const a = await connect('presence-departure-is-scoped')
    const b = await connect('presence-departure-is-scoped')
    const c = await connect('presence-departure-is-scoped')
    try {
      a.awareness.setLocalStateField('user', { name: 'A' })
      b.awareness.setLocalStateField('user', { name: 'B' })
      c.awareness.setLocalStateField('user', { name: 'C' })
      const names = () =>
        [...c.awareness.getStates().values()].map((s) => s.user?.name).filter(Boolean)
      await until(() => names().length === 3, 'all three participants to be visible to C')

      a.close()
      await until(() => names().length === 2, 'A’s presence to be withdrawn from C')
      expect(names().sort()).toEqual(['B', 'C'])
    } finally {
      b.close()
      c.close()
    }
  })
})

describe('Who the relay answers', () => {
  const upgrade = (origin?: string) =>
    SELF.fetch('https://relay.test/some-room', {
      headers: origin ? { Upgrade: 'websocket', Origin: origin } : { Upgrade: 'websocket' },
    })

  it('accepts the deployed site', async () => {
    expect((await upgrade('https://dudesons.github.io')).status).toBe(101)
  })

  it('accepts a development server, both spellings of localhost', async () => {
    expect((await upgrade('http://localhost:5173')).status).toBe(101)
    expect((await upgrade('http://127.0.0.1:4173')).status).toBe(101)
  })

  it('refuses another website, so our quota stays ours', async () => {
    expect((await upgrade('https://elsewhere.example')).status).toBe(403)
  })

  it('refuses a request with no origin at all', async () => {
    expect((await upgrade()).status).toBe(403)
  })
})
