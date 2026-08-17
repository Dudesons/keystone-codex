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
