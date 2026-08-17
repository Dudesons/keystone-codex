// ABOUTME: The relay's Vitest project: its tests run inside workerd, not in node or jsdom.
// ABOUTME: Pinned pool version — from 0.13.0 it requires Vitest 4 and this repo runs 3.2.7.

import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersProject({
  test: {
    name: 'relay',
    include: ['test/**/*.test.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
})
