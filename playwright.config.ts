// ABOUTME: The end-to-end harness: a real relay, the real build on its deployed path shape.
// ABOUTME: Chromium only, serial, and no server it does not start itself.

import { defineConfig, devices } from '@playwright/test'
import { APP, RELAY } from './e2e/urls'

export default defineConfig({
  testDir: 'e2e',
  // Two tests sharing a room name would share one Durable Object instance. Each test generates its
  // own code, so parallelism is reachable — but four tests do not need it, and serial keeps the
  // relay's output readable when one of them fails.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // For genuine socket timing, not as a way to make a race pass. A scenario that needs its retry
  // regularly is a bug report.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: APP,
    // `localhost`, not `127.0.0.1`: the preview server binds IPv6 only.
    trace: 'on-first-retry',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Local by default — no API token, no Cloudflare account. The worker's plain-GET branch
      // answers 200 before any upgrade handling, which is exactly what a readiness probe needs.
      command: 'npx wrangler dev --config relay/wrangler.toml --port 8787',
      url: RELAY,
      // Never reused: a listener already on this port belongs to some other checkout or shell,
      // not to this worktree's `relay/src/index.js`. A suite that bound to it anyway would test
      // a stranger's code and call it passing.
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // `VITE_COLLAB_URL` is substituted at build time, so the relay has to be chosen here. That
      // one string is the only difference between this bundle and the deployed one.
      command: 'npm run build && npm run preview:e2e',
      url: APP,
      // Never reused: the build is inside this command. Reusing a server already on the port
      // would skip that build entirely and serve whatever `dist/` happens to be sitting there —
      // silently defeating every scenario that deliberately breaks a source file and expects the
      // suite to see it fail.
      reuseExistingServer: false,
      timeout: 180_000,
      env: { VITE_COLLAB_URL: 'ws://localhost:8787' },
    },
  ],
})
