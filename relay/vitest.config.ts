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
        // Cloudflare's Vitest integration documents WebSockets with Durable Objects as
        // unsupported under per-file storage isolation (it crashes the runner trying to tear
        // down a Durable Object's storage while a socket is still open). `singleWorker` and
        // `isolatedStorage: false` together are the documented workaround: one worker, storage
        // shared across tests. Do not "tidy" these away — the relay's tests open real sockets.
        singleWorker: true,
        isolatedStorage: false,
      },
    },
  },
})
