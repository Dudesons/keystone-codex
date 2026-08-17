// ABOUTME: Tests the relay Worker and its Room durable object, inside workerd.
// ABOUTME: No network: the pool runs the real runtime in-process.

import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

describe('The relay Worker', () => {
  it('answers a plain request, so a browser opening the URL is not left guessing', async () => {
    const response = await SELF.fetch('https://relay.test/')
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('keystone relay')
  })
})
