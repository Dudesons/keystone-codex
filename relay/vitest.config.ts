// ABOUTME: The relay's Vitest project: its tests run inside workerd, not in node or jsdom.
// ABOUTME: The pool is a Vite plugin since 0.13.0; before that it was a `test.poolOptions` block.

import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml' },
      // Cloudflare's Vitest integration documents WebSockets with Durable Objects as
      // unsupported under per-file storage isolation (it crashes the runner trying to tear
      // down a Durable Object's storage while a socket is still open). `singleWorker` and
      // `isolatedStorage: false` together are the documented workaround: one worker, storage
      // shared across tests. Do not "tidy" these away — the relay's tests open real sockets.
      singleWorker: true,
      isolatedStorage: false,
    }),
  ],
  test: {
    name: 'relay',
    include: ['test/**/*.test.ts'],
  },
})
