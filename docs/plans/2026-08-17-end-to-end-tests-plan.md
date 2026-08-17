# End-to-end tests — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** four Playwright scenarios covering what jsdom structurally cannot — the built bundle, on a
sub-path, in a real browser, against a real relay over a real socket.

**Architecture:** Playwright owns two servers: a local `wrangler dev` running the real relay, and
`vite preview` serving the real production build under `/keystone-codex/`. The suite drives two
browser contexts against them. Nothing is mocked; the only thing that differs from the deployed site
is the compile-time `VITE_COLLAB_URL`.

**Tech Stack:** `@playwright/test` 1.62.1 (chromium only), wrangler 4.123.0, Vite 6.4.3, Vitest 3.2.7.

**Spec:** [docs/plans/2026-08-17-end-to-end-tests-design.md](2026-08-17-end-to-end-tests-design.md)

## Global Constraints

- **`npm test` stays Vitest-only** and must keep passing on a machine with no browsers installed.
  End-to-end runs through `npm run test:e2e`.
- **The `app` Vitest project must exclude `e2e/**`.** Vitest's default `include` is
  `**/*.{test,spec}.?(c|m)[jt]s?(x)`, which collects `*.spec.ts`.
- **The base URL is `http://localhost:4173/keystone-codex/`** — `localhost`, never `127.0.0.1`: the
  preview server binds IPv6 only.
- **No fixed sleeps.** No `waitForTimeout`. Playwright auto-waiting and `expect.poll` only.
- **Deployment stays manual.** No workflow gains a `push` or `schedule` trigger that deploys.
- **Never `--no-verify`**, `--no-hooks`, `--no-pre-commit-hook`.
- **Another session holds ~260 dirty files.** Stage explicit paths only. Never `git add -A`,
  `git add .`, `git add src/`, `git commit -a`, `git stash`, `git checkout`, `git reset`,
  `git restore`.
- **Environment:** `node`/`npm` are not on the Bash tool's PATH — prefix with
  `export PATH="/c/Program Files/nodejs:$PATH"`. `rm` is denied by the permission layer; overwrite
  with the Write tool or use `node -e "fs.unlinkSync(...)"`. `gh` is not installed.
- **Every scenario must be proven to fail.** Break its guarantee with a one-line change, watch it go
  red, revert. A green end-to-end test nobody has seen fail is decoration.

## Deviation from the design, and why

The design says the Chromium download is "cached between runs". This plan **does not add a browser
cache**. `npx playwright install --with-deps chromium` takes roughly 30–40 s on a GitHub runner, and
an `actions/cache` entry keyed wrongly silently caches nothing while looking like it works — a worse
failure than the 40 s it saves. If CI time ever becomes the complaint, the cache is a six-line
addition with its own before/after measurement. Cost stated honestly rather than assumed away.

## File Structure

| Path | Responsibility |
| --- | --- |
| `playwright.config.ts` | the two servers, the base URL, chromium, serial execution |
| `e2e/urls.ts` | the two addresses, in one place — the config and the fixtures both need them |
| `e2e/fixtures.ts` | a unique room code per test, a second browser context, and the two ways into a session |
| `e2e/session.spec.ts` | all four scenarios; split only when it stops reading comfortably |
| `src/components/map/DungeonMap.tsx` | one `data-clone` attribute, so a map landmark is addressable |
| `.github/workflows/e2e.yml` | the reusable end-to-end job |
| `.github/workflows/ci.yml`, `deploy.yml` | call it |
| `package.json`, `vite.config.ts`, `tsconfig.json`, `.gitignore` | wiring |
| `CLAUDE.md`, `README.md` | the testing tables record **None** for end-to-end today |

---

### Task 1: the harness, proven by a smoke test

Nothing here tests the application. It exists to make the next five tasks possible, and to settle
the design's one unverified assumption — that `webServer` accepts an array — before anything is
built on top of it.

**Files:**
- Create: `playwright.config.ts`, `e2e/urls.ts`, `e2e/smoke.spec.ts`
- Modify: `package.json`, `vite.config.ts:20`, `tsconfig.json:20`, `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm run test:e2e`; the base URL
  `http://localhost:4173/keystone-codex/`; the relay at `ws://localhost:8787`.

- [ ] **Step 1: install Playwright**

```bash
npm install --save-exact --save-dev @playwright/test@1.62.1
```

```bash
npx playwright install chromium
```

`--save-exact` because the relay work already learned what a floating range costs: the pool was
pinned "exactly" in prose and `^` in `package.json`. Say the version once, in one place.

- [ ] **Step 2: add the two scripts**

In `package.json`, after `"preview": "vite preview",`:

```json
    "preview:e2e": "vite preview --base=/keystone-codex/ --port 4173 --strictPort",
    "test:e2e": "playwright test",
```

The `--base` value lives in an npm script, not in the Playwright config, so npm spawns it through
`cmd.exe` on Windows. Invoked straight from Git Bash, MSYS rewrites `/keystone-codex/` into
`/Program Files/Git/keystone-codex/` — verified during design. If it ever must be run by hand from
Git Bash, prefix `MSYS2_ARG_CONV_EXCL="*"`.

- [ ] **Step 3: keep Vitest away from the Playwright specs**

`vite.config.ts:20` — extend the existing `exclude`:

```ts
          exclude: [...configDefaults.exclude, '.claude/**', 'relay/**', 'e2e/**'],
```

- [ ] **Step 4: put `e2e/` under the typechecker**

`tsconfig.json:20`:

```json
  "include": ["src", "scripts", "vite.config.ts", "e2e", "playwright.config.ts"]
```

No `types` entry is needed: `@playwright/test` is imported, not ambient. This is a single root
config with no `references`, so `tsc -b` covers it in one pass.

**This sets the shape for the approved `relay/` typechecking work.** If that work has already
landed when this task runs, follow whatever shape it chose instead of introducing a second one, and
say so in the task report.

- [ ] **Step 5: ignore the reports**

Append to `.gitignore`:

```
# Playwright
playwright-report/
test-results/
```

Nothing is needed for the relay's local state: wrangler resolves it relative to its configuration
file, so `--config relay/wrangler.toml` from the repository root writes to the already-ignored
`relay/.wrangler/`.

- [ ] **Step 6: put the two addresses in one place**

Create `e2e/urls.ts`:

```ts
// ABOUTME: Where the harness lives. Imported by the Playwright config and by the fixtures alike.
// ABOUTME: `localhost` and not `127.0.0.1`: the preview server binds IPv6 only.

/** The relay, served by a local `wrangler dev`. Its plain-GET branch answers 200. */
export const RELAY = 'http://localhost:8787'

/**
 * The app, served by `vite preview` under the deployed sub-path.
 *
 * A context created by hand with `browser.newContext()` inherits **nothing** from the config's
 * `use` block — not this base URL, not the clipboard permissions — which is why the fixtures pass
 * them explicitly and why this constant cannot simply live in the config.
 */
export const APP = 'http://localhost:4173/keystone-codex/'
```

- [ ] **Step 7: write the config**

Create `playwright.config.ts`:

```ts
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
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Local by default — no API token, no Cloudflare account. The worker's plain-GET branch
      // answers 200 before any upgrade handling, which is exactly what a readiness probe needs.
      command: 'npx wrangler dev --config relay/wrangler.toml --port 8787',
      url: RELAY,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // `VITE_COLLAB_URL` is substituted at build time, so the relay has to be chosen here. That
      // one string is the only difference between this bundle and the deployed one.
      command: 'npm run build && npm run preview:e2e',
      url: APP,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { VITE_COLLAB_URL: 'ws://localhost:8787' },
    },
  ],
})
```

- [ ] **Step 8: write the smoke test**

Create `e2e/smoke.spec.ts`:

```ts
// ABOUTME: Proves the harness itself: the production build, served on its deployed sub-path.
// ABOUTME: Asserts nothing about collaboration — the other specs do that.

import { test, expect } from '@playwright/test'

test('the built app loads on the deployed path shape', async ({ page }) => {
  const response = await page.goto('./')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/Keystone Codex/)

  // Relative asset paths are what make one build work at the root and under a sub-path alike.
  expect(page.url()).toContain('/keystone-codex/')

  // The dungeon pool arrived, so the generated data is really being served.
  await expect(page.locator('a[href*="#/d/"]').first()).toBeVisible()
})
```

- [ ] **Step 9: run it**

```bash
npm run test:e2e
```

Expected: 1 passed. **If `webServer` rejects the array**, stop and apply the design's named
fallback — move the relay into a `globalSetup` module that spawns `wrangler dev` and waits for
`http://localhost:8787` — then record the change in the task report. Do not invent a third shape.

- [ ] **Step 10: prove the harness would notice a broken build**

Temporarily change `APP` in `e2e/urls.ts` to `http://localhost:4173/wrong-base/`.

```bash
npm run test:e2e
```

Expected: the app server never becomes ready, or the smoke test fails on the URL assertion. Revert.

- [ ] **Step 11: the other two suites are untouched**

```bash
npm test
```

Expected: **631 passed, 25 files** (`app` 620 in 24 files, `relay` 11 in 1). Any other number means
`e2e/**` leaked into the `app` project.

```bash
npm run typecheck
```

Expected: exit 0, with `e2e/` and `playwright.config.ts` now inside it.

- [ ] **Step 12: commit**

```bash
git add playwright.config.ts e2e/urls.ts e2e/smoke.spec.ts package.json package-lock.json vite.config.ts tsconfig.json .gitignore
```

```bash
git commit -m "Serve the real build to a real browser, on its deployed path shape"
```

---

### Task 2: the relay answers over a real socket, with a real Origin

The canary for the origin allowlist — the one guarantee that had 631 green tests and no test at all.

**Files:**
- Create: `e2e/fixtures.ts`, `e2e/session.spec.ts`

**Interfaces:**
- Consumes: the harness from Task 1, and `APP` from `e2e/urls.ts`.
- Produces: `roomCode()`, `newParticipant(browser, viewport?)`, `openSession(page, slug, name)`,
  `acceptInvitation(page, slug, room, name)`, `firstDungeonSlug(page)` — used by every later task.
  Both ways in navigate themselves, so no caller has to remember where `firstDungeonSlug` left the
  page.

- [ ] **Step 1: write the fixtures**

Create `e2e/fixtures.ts`:

```ts
// ABOUTME: What every end-to-end scenario needs: a room nobody else is in, and a way in.
// ABOUTME: Deliberately thin — a helper that hides which button was clicked hides the test.

import { expect, type Browser, type Page, type ViewportSize } from '@playwright/test'
import { APP } from './urls'

/**
 * A second participant's browser.
 *
 * `browser.newContext()` inherits nothing from the config's `use` block, so the base URL and the
 * clipboard permissions have to be handed over here. Without the base URL, every `page.goto('./')`
 * in a hand-made context fails on a relative URL with no origin.
 */
export function newParticipant(browser: Browser, viewport?: ViewportSize) {
  return browser.newContext({
    baseURL: APP,
    permissions: ['clipboard-read', 'clipboard-write'],
    ...(viewport ? { viewport } : {}),
  })
}

/**
 * A room code unique to this test.
 *
 * Rooms are Durable Object instances keyed by name, and one `wrangler dev` serves the whole run:
 * two tests sharing a code would share a document and a presence list. The relay suite learned
 * this when shared storage made room names collide.
 */
let counter = 0
export const roomCode = () =>
  `E${(++counter).toString().padStart(2, '0')}${Math.random().toString(36).slice(2, 5).toUpperCase().padEnd(3, 'X')}`

/** The slug of the first dungeon in the pool, so no test hardcodes a season's data. */
export async function firstDungeonSlug(page: Page): Promise<string> {
  await page.goto('./')
  const href = await page.locator('a[href*="#/d/"]').first().getAttribute('href')
  const slug = href?.match(/#\/d\/([^?/]+)/)?.[1]
  expect(slug, `no dungeon link on the home page (href was ${href})`).toBeTruthy()
  return slug!
}

/**
 * Go to a dungeon, name yourself, and open a session on its route.
 *
 * It navigates itself, like `acceptInvitation` below: `firstDungeonSlug` leaves the page on the home
 * page, where the Route tab does not exist.
 *
 * `exact: true` matters on the tab: Playwright matches an accessible name as a case-insensitive
 * **substring** by default, and "Open a session with this route" contains "route" — without it the
 * locator resolves to two buttons and fails on strict mode, which reads like a missing element.
 *
 * The room code is not returned. The only caller that needs it reads it from the share link, which
 * is the value under test there anyway; scraping it out of the panel would mean pinning a Tailwind
 * class as though it were an interface.
 */
export async function openSession(page: Page, slug: string, name: string) {
  await page.goto(`./#/d/${slug}`)
  await page.getByRole('button', { name: 'Route', exact: true }).click()
  await page.getByLabel('Your name').fill(name)
  await page.getByRole('button', { name: 'Open a session with this route' }).click()
  await expect(page.getByText('SHARED SESSION')).toBeVisible()
}

/**
 * Arrive by join link and accept. The invitation switches the panel to route mode on its own, so
 * no tab has to be clicked here.
 */
export async function acceptInvitation(page: Page, slug: string, room: string, name: string) {
  await page.goto(`./#/d/${slug}?room=${room}`)
  await page.getByLabel('Your name').fill(name)
  await page.getByRole('button', { name: `Join room ${room}` }).click()
  await expect(page.getByText('SHARED SESSION')).toBeVisible()
}
```

- [ ] **Step 2: write the scenario**

Create `e2e/session.spec.ts`:

```ts
// ABOUTME: The four things only a browser can prove about a shared session.
// ABOUTME: A real socket, a real join link, real layout, and real localStorage.

import { test, expect } from '@playwright/test'
import { acceptInvitation, firstDungeonSlug, roomCode } from './fixtures'

test('the relay accepts a socket from the origin it actually serves', async ({ page }) => {
  const slug = await firstDungeonSlug(page)
  const room = roomCode()

  await acceptInvitation(page, slug, room, 'Canary')

  // "connecting…" would mean the socket never opened — a wrong entry in the relay's origin
  // allowlist looks exactly like this, and no unit test can see it: the relay's own tests choose
  // the Origin header they send.
  await expect(page.getByText('1 connected')).toBeVisible()
})
```

`1 connected`, not `0`: `readPeers` keeps you in the list, and `presence.ts` says so — "a count of
it means 'participants, yourself included'".

- [ ] **Step 3: run it**

```bash
npm run test:e2e
```

Expected: 2 passed.

- [ ] **Step 4: prove it fails when the allowlist is wrong**

In `relay/src/index.js`, temporarily change `'http://localhost:4173'` to
`'http://localhost:4174'`.

```bash
npm run test:e2e
```

Expected: this test fails — `1 connected` never appears — and the smoke test still passes, which is
the whole point of keeping this scenario separate. **Revert the relay change.** Confirm with:

```bash
git diff -- relay/src/index.js
```

Expected: no output.

- [ ] **Step 5: commit**

```bash
git add e2e/fixtures.ts e2e/session.spec.ts
```

```bash
git commit -m "Catch an origin allowlist that names the wrong host"
```

---

### Task 3: a join link survives the deployed URL shape

**Files:**
- Modify: `e2e/session.spec.ts`, `playwright.config.ts`

**Interfaces:**
- Consumes: `openSession`, `firstDungeonSlug`.
- Produces: nothing new.

- [ ] **Step 1: grant the clipboard permissions**

The share button writes through `navigator.clipboard.writeText`, and reading it back is how the test
sees what a real user would paste. In `playwright.config.ts`, inside `use`:

```ts
    permissions: ['clipboard-read', 'clipboard-write'],
```

Reading the clipboard is deliberate: building the expected link in the test would assert our own
idea of the link rather than the one the button produces.

- [ ] **Step 2: write the scenario**

Extend the import at the top of `e2e/session.spec.ts` to
`import { acceptInvitation, firstDungeonSlug, newParticipant, openSession, roomCode } from './fixtures'`,
then append:

```ts
test('a join link carries the sub-path, and opens the invitation in another browser', async ({
  page,
  browser,
}) => {
  const slug = await firstDungeonSlug(page)
  await openSession(page, slug, 'Host')

  await page.getByRole('button', { name: 'Copy the link' }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())

  // Hash route, query string and GitHub Pages sub-path composing at once. Every jsdom test supplies
  // this URL itself, so none of them can catch a link that drops the sub-path. The code's alphabet
  // is `randomRoomCode`'s: six characters, with I, O, 0 and 1 left out.
  expect(link).toMatch(
    new RegExp(`^http://localhost:4173/keystone-codex/#/d/${slug}\\?room=[A-HJ-NP-Z2-9]{6}$`),
  )
  const room = link.slice(link.indexOf('?room=') + '?room='.length)

  const guest = await newParticipant(browser)
  const guestPage = await guest.newPage()
  await guestPage.goto(link)
  await expect(guestPage.getByRole('button', { name: `Join room ${room}` })).toBeVisible()
  await guest.close()
})
```

- [ ] **Step 3: run it**

```bash
npm run test:e2e
```

Expected: 3 passed.

- [ ] **Step 4: prove it fails when the link loses the sub-path**

In `src/components/route/RoutePanel.tsx:44`, temporarily drop `location.pathname`:

```ts
  return `${location.origin}#/d/${slug}?room=${room}`
```

```bash
npm run test:e2e
```

Expected: this test fails on the link assertion. **Revert**, and confirm with
`git diff -- src/components/route/RoutePanel.tsx` — expect no output. That file is dirty from
another session, so check the diff is empty rather than assuming.

- [ ] **Step 5: commit**

```bash
git add e2e/session.spec.ts playwright.config.ts
```

```bash
git commit -m "Pin the join link to the shape the deployed site produces"
```

---

### Task 4: make a map landmark addressable

A source change, so ordinary TDD applies: the jsdom test comes first. Approved by RwlRwlRwlRwl,
mirroring the `data-peer-cursor` attribute that already exists in this same file for the same
reason.

**Files:**
- Modify: `src/components/map/DungeonMap.tsx` (the `Blip` props, its `<g>`, and the call site
  around `:247`)
- Test: `src/components/map/DungeonMap.test.tsx`

**Interfaces:**
- Consumes: `cloneKey(enemyIdx, cloneIdx)` from `src/lib/data.ts` — `` `${enemyIdx}:${cloneIdx}` ``.
- Produces: `[data-clone="<enemyIdx>:<cloneIdx>"]` on every blip's `<g>`.

- [ ] **Step 1: write the failing test**

In `src/components/map/DungeonMap.test.tsx`, beside the existing `data-peer-cursor` assertions:

```tsx
  it('labels every blip with its clone key, so a landmark can be found', () => {
    const { container } = renderEn(<DungeonMap {...baseProps} />)
    const blips = container.querySelectorAll('[data-clone]')
    expect(blips.length).toBeGreaterThan(0)
    // The key is the one the rest of the app uses for a clone: "enemyIdx:cloneIdx".
    blips.forEach((el) => expect(el.getAttribute('data-clone')).toMatch(/^\d+:\d+$/))
  })
```

Use whatever the file's existing render helper and props fixture are named — read the neighbouring
tests rather than assuming `baseProps`.

- [ ] **Step 2: run it, and watch it fail**

```bash
npm test -- --project app src/components/map/DungeonMap.test.tsx
```

Expected: FAIL — `blips.length` is 0, because no element carries the attribute yet.

- [ ] **Step 3: add the prop and the attribute**

In `DungeonMap.tsx`, add to `BlipProps`:

```ts
  cloneId: string
```

Take it in the `Blip` signature beside `slug`, and put it on the `<g>` it returns (around `:371`):

```tsx
    <g
      data-clone={cloneId}
      onMouseEnter={onEnter}
```

At the call site (around `:248`), pass the key that is already computed one line above:

```tsx
                  key={key}
                  cloneId={key}
```

- [ ] **Step 4: run it again**

```bash
npm test -- --project app src/components/map/DungeonMap.test.tsx
```

Expected: PASS.

- [ ] **Step 5: the whole suite and the types**

```bash
npm test
```

Expected: 632 passed (631 + this one).

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 6: commit**

```bash
git add src/components/map/DungeonMap.tsx src/components/map/DungeonMap.test.tsx
```

```bash
git commit -m "Name each blip with its clone key"
```

---

### Task 5: two viewports agree where a cursor points

**Files:**
- Modify: `e2e/session.spec.ts`

**Interfaces:**
- Consumes: `[data-clone]` from Task 4, `[data-peer-cursor]` from `PeerCursors.tsx`,
  `acceptInvitation`, `newParticipant`.
- Produces: nothing new. The import added in Task 3 already covers what this scenario needs.

- [ ] **Step 1: write the scenario**

Append to `e2e/session.spec.ts`:

```ts
test('two viewports of different sizes agree where a cursor points', async ({ browser }) => {
  const room = roomCode()

  // Different sizes on purpose: identical viewports would pass even if the map-space conversion
  // were skipped entirely, because the container coordinates would already match.
  const wide = await newParticipant(browser, { width: 1440, height: 900 })
  const narrow = await newParticipant(browser, { width: 1024, height: 768 })
  const a = await wide.newPage()
  const b = await narrow.newPage()

  const slug = await firstDungeonSlug(a)
  await acceptInvitation(a, slug, room, 'Mover')
  await acceptInvitation(b, slug, room, 'Watcher')

  await expect(a.getByText('2 connected')).toBeVisible()

  // Fit the whole map in both, so the landmark is on screen in each. A blip scrolled out of view
  // still has a bounding box, and hovering that box would move the mouse outside the map entirely —
  // no cursor would ever be sent, and the failure would look like a relay problem.
  await a.getByRole('button', { name: 'Fit' }).click()
  await b.getByRole('button', { name: 'Fit' }).click()

  // A landmark both pages can find: the same clone, wherever each page's layout puts it.
  const landmark = await a.locator('[data-clone]').first().getAttribute('data-clone')
  const inA = await a.locator(`[data-clone="${landmark}"]`).boundingBox()
  expect(inA).not.toBeNull()
  await a.mouse.move(inA!.x + inA!.width / 2, inA!.y + inA!.height / 2)

  const inB = await b.locator(`[data-clone="${landmark}"]`).boundingBox()
  expect(inB).not.toBeNull()
  const target = { x: inB!.x + inB!.width / 2, y: inB!.y + inB!.height / 2 }

  // The cursor is throttled on the way out, so poll rather than sleep. The arrow is translated by
  // its own top-left, and its tip sits at roughly (1,1) of a 14×20 viewBox.
  await expect
    .poll(
      async () => {
        const box = await b.locator('[data-peer-cursor]').first().boundingBox()
        if (!box) return Number.POSITIVE_INFINITY
        return Math.hypot(box.x - target.x, box.y - target.y)
      },
      { message: "the peer cursor never reached the landmark's position in the other viewport", timeout: 15_000 },
    )
    .toBeLessThan(8)

  await wide.close()
  await narrow.close()
})
```

- [ ] **Step 2: run it**

```bash
npm run test:e2e
```

Expected: 4 passed. If the tolerance of 8 px proves too tight, widen it **once**, to a value you
can justify from the arrow's geometry, and say so in the report — do not loosen it repeatedly until
it passes.

- [ ] **Step 3: prove the assertion discriminates**

The break must fail **the poll**, not the build. Feeding the cursor through untransformed
(`const at = p.cursor!`) leaves `toContainerPoint` and the `transform` parameter unused, and
`noUnusedLocals` / `noUnusedParameters` make `tsc -b` refuse to build — so the webServer command dies
before a browser ever opens. That proves the type system objects to that particular edit; it says
nothing about whether this test's assertion discriminates, which is the whole question. A useless
assertion with an 800 px tolerance would "pass" that check identically.

So displace the cursor instead, by a distance comfortably above the tolerance, leaving every binding
used. In `src/components/map/PeerCursors.tsx`, temporarily offset the rendered position:

```tsx
              style={{ transform: `translate(${at.x + 40}px, ${at.y}px)` }}
```

```bash
npm run test:e2e
```

Expected: **this test fails on the poll**, with a measured distance near 40 px — five times the
tolerance, which is what makes 8 px meaningful rather than decorative. Capture that number. **Revert**
and confirm `git diff -- src/components/map/PeerCursors.tsx` is empty.

- [ ] **Step 4: commit**

```bash
git add e2e/session.spec.ts
```

```bash
git commit -m "Check both viewports place a cursor on the same landmark"
```

---

### Task 6: leaving a session restores the local route

**Files:**
- Modify: `e2e/session.spec.ts`

**Interfaces:**
- Consumes: `acceptInvitation`, `firstDungeonSlug`. The keys under test are
  `midnight-codex:route:<slug>` and `midnight-codex:route:<slug>:stashed`
  (`useRouteDoc.ts:44` and `:53`) — the test asserts through the interface, not the keys.
- Produces: nothing new.

- [ ] **Step 1: write the scenario**

Append to `e2e/session.spec.ts`:

```ts
test('a local route is set aside on joining and given back on leaving', async ({ page }) => {
  const slug = await firstDungeonSlug(page)
  const room = roomCode()

  // A local draft, in real localStorage rather than jsdom's.
  await page.goto(`./#/d/${slug}`)
  await page.getByRole('button', { name: 'Route', exact: true }).click()
  await page.getByPlaceholder('Route name').fill('LOCAL DRAFT')
  // A fresh route already starts on one empty pull (`emptyRoute`, pinned by route.test.ts), so one
  // click makes two. Two is also what makes the last assertion mean something: a count of one would
  // match a default route just as well as a restored draft.
  await page.getByRole('button', { name: '+ Pull' }).click()
  await expect(page.getByText('PULLS · 2')).toBeVisible()

  await acceptInvitation(page, slug, room, 'Guest')

  // The room is empty, so its own fresh route replaces the draft — name cleared, one pull again.
  // Losing this is losing someone's work.
  await expect(page.getByPlaceholder('Route name')).not.toHaveValue('LOCAL DRAFT')
  await expect(page.getByText('PULLS · 1')).toBeVisible()

  await page.getByRole('button', { name: 'Leave' }).click()
  await expect(page.getByPlaceholder('Route name')).toHaveValue('LOCAL DRAFT')
  await expect(page.getByText('PULLS · 2')).toBeVisible()
})
```

The committed MDT fixture is deliberately not used here: importing it would tie the test to one
dungeon's slug and to data regenerated every season, and what is under test is the stash and its
restoration, not the codec.

- [ ] **Step 2: run it**

```bash
npm run test:e2e
```

Expected: 5 passed.

- [ ] **Step 3: prove it fails when the stash is dropped**

In `src/lib/mdt/useRouteDoc.ts`, temporarily make the stash write a no-op — find the
`localStorage.setItem(stashKey(slug), …)` call and comment it out.

```bash
npm run test:e2e
```

Expected: this test fails at the final assertion; the draft does not come back. **Revert** and
confirm `git diff -- src/lib/mdt/useRouteDoc.ts` is empty.

- [ ] **Step 4: commit**

```bash
git add e2e/session.spec.ts
```

```bash
git commit -m "Prove a local route survives a session in a real browser"
```

---

### Task 7: run it in CI, on every pull request and before every deploy

**Files:**
- Create: `.github/workflows/e2e.yml`
- Modify: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `npm run test:e2e`.
- Produces: a reusable workflow callable as `./.github/workflows/e2e.yml`.

- [ ] **Step 1: write the reusable workflow**

Create `.github/workflows/e2e.yml`:

```yaml
name: End-to-end

# Called by CI and by Deploy rather than triggered on its own, so there is one definition of what
# an end-to-end run is. Manual dispatch stays available for when only this needs checking.
on:
  workflow_call:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  e2e:
    name: Four scenarios in a real browser
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm

      - run: npm ci

      # Chromium only: the app targets people running WoW on a desktop, and a second engine doubles
      # the cost for a risk nobody has reported.
      - name: Install Chromium
        run: npx playwright install --with-deps chromium

      # Playwright starts both servers itself: a local wrangler dev needing no Cloudflare account,
      # and the real build served on its deployed path shape.
      - name: End-to-end tests
        run: npm run test:e2e

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 2: call it from CI**

In `.github/workflows/ci.yml`, after the `verify` job:

```yaml
  e2e:
    name: End-to-end
    uses: ./.github/workflows/e2e.yml
```

- [ ] **Step 3: call it from Deploy**

A reusable workflow is called at job level, so this becomes a job the build waits on. In
`.github/workflows/deploy.yml`, add before `build`:

```yaml
  e2e:
    name: End-to-end
    uses: ./.github/workflows/e2e.yml
```

and make the build wait for it:

```yaml
  build:
    name: Check, build and tag
    needs: e2e
    runs-on: ubuntu-latest
```

For the reason `deploy.yml` already gives in its own comment: being manual it can target any ref, so
it cannot inherit CI's guarantee and replays the checks itself. **This builds the app twice per
deploy** — once inside the end-to-end job to serve it, once in `build` for the artifact. That is
about thirty seconds, and sharing a `dist/` between two jobs to save it would couple them for no
real gain.

- [ ] **Step 4: check the workflows parse**

`gh` is not installed here, so this cannot be dispatched locally. Verify the YAML loads and the
job graph is what you think it is:

```bash
node -e "const y=require('yaml'),f=require('fs');for(const p of ['.github/workflows/e2e.yml','.github/workflows/ci.yml','.github/workflows/deploy.yml']){const d=y.parse(f.readFileSync(p,'utf8'));console.log(p,'->',Object.keys(d.jobs).map(j=>j+(d.jobs[j].needs?' needs '+d.jobs[j].needs:'')).join(', '))}"
```

Expected: `e2e.yml -> e2e`; `ci.yml -> verify, e2e`; `deploy.yml -> e2e, build needs e2e, deploy needs build`.

- [ ] **Step 5: commit**

```bash
git add .github/workflows/e2e.yml .github/workflows/ci.yml .github/workflows/deploy.yml
```

```bash
git commit -m "Run the end-to-end scenarios on every pull request and before every deploy"
```

**The first real run is RwlRwlRwlRwl's**, from the Actions UI or a pull request: nothing here can
trigger a workflow. Say so in the task report rather than reporting CI as verified.

---

### Task 8: tell the reader what changed

**Files:**
- Modify: `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: the final test counts.
- Produces: documentation that matches the repository.

- [ ] **Step 1: get the real numbers**

```bash
npm test
```

```bash
npm run test:e2e
```

Use what these print. Do not copy 632 from this plan if the number differs — earlier tasks may have
added tests of their own.

**`CLAUDE.md`'s current counts are already wrong** and must be corrected in the same pass: it claims
"634 tests… `app` — 624 tests… `relay` — 10", where a clean checkout reports **631 = `app` 620 in 24
files + `relay` 11 in 1**. The figure was written from a working tree carrying another session's
uncommitted tests. Take the numbers from the commands above, in this worktree, not from any earlier
document.

- [ ] **Step 2: correct the testing table in `CLAUDE.md`**

The row currently reads `| End-to-end | — | **None.** No browser runner is installed |`. Replace it
with the runner, the count and what it covers, and update the surrounding paragraph that says the
rule is "the target, not today's reality" — it is now less untrue. Mention:

- `npm run test:e2e`, chromium, **five tests: the four scenarios plus one smoke test that proves the
  harness itself**, and that `npm test` deliberately does not include them;
- that Playwright starts a local `wrangler dev` and `vite preview --base=/keystone-codex/`, so the
  suite needs neither the network nor a Cloudflare account;
- that `e2e/**` is excluded from the `app` Vitest project on purpose, and why;
- that every scenario has been watched failing, and that a new one is expected to be.

- [ ] **Step 3: update `README.md`**

Add `npm run test:e2e` to the commands table, described for a user rather than a maintainer.

- [ ] **Step 4: verify by reading**

Re-read both files end to end. No sentence may claim end-to-end coverage the suite does not have —
in particular the pause is **not** covered, on purpose, and the tables must not imply otherwise.

- [ ] **Step 5: commit**

```bash
git add CLAUDE.md README.md
```

```bash
git commit -m "Record the end-to-end suite in the testing tables"
```

---

## Self-review

**Spec coverage.** All four design scenarios have a task: the relay canary (Task 2), the join link
(Task 3), the two viewports (Task 5), the local route (Task 6). The harness, the sub-path, the two
servers, `VITE_COLLAB_URL`, the Vitest exclusion, the IPv6 base URL and `workers: 1` are Task 1. The
design's one open decision — the map landmark — is Task 4, approved. CI placement matches the choice
recorded in the design: `ci.yml` **and** `deploy.yml`, through a reusable workflow. Typechecking is
Task 1, Step 4, with the ordering dependency on the `relay/` work stated where it will be read.
The design's browser cache is **not** implemented; the deviation and its reason are stated at the
top rather than left as a silent gap.

**Placeholder scan.** No TBDs. Every step names its file, its command and its expected output. Two
places deliberately tell the implementer to read rather than trust this document: the render helper
and props fixture in `DungeonMap.test.tsx` (Step 1 of Task 4), and the exact `setItem` call to
disable in `useRouteDoc.ts` (Step 3 of Task 6). Both are cases where guessing an identifier would
be worse than looking.

**Two traps the first draft of this plan walked into**, fixed here rather than left for the
implementer to discover:

- `browser.newContext()` inherits **nothing** from the config's `use` block. A hand-made context has
  no base URL, so `page.goto('./')` throws on a relative URL, and no clipboard permission either.
  Hence `e2e/urls.ts` and `newParticipant()`.
- Playwright matches an accessible name as a case-insensitive **substring** by default, so
  `getByRole('button', { name: 'Route' })` also matches "Open a session with this route" and fails on
  strict mode — which reads like a missing element, not an ambiguous one. Hence `exact: true` on that
  locator, in both places it appears.

**Type consistency.** `cloneId: string` is added to `BlipProps` in Task 4 and consumed as
`data-clone` by Task 5's locator; the value's shape (`enemyIdx:cloneIdx`) comes from `cloneKey` in
`src/lib/data.ts:51` and is asserted against `/^\d+:\d+$/` in the jsdom test. `roomCode`,
`firstDungeonSlug`, `openSession` and `acceptInvitation` are defined once in Task 2 and used with
those exact signatures in Tasks 3, 5 and 6. The strings the tests query — `Route`, `Your name`,
`Open a session with this route`, `Join room {room}`, `SHARED SESSION`, `Copy the link`, `Leave`,
`1 connected`, `Route name`, `+ Pull`, `PULLS · 1` — were read from `src/lib/i18n/en.ts` and
`RoutePanel.tsx`, not recalled.

**Known risk, named rather than hidden.** The tests query English interface strings, so they are
coupled to `en.ts`. That is a deliberate trade: `data-testid` on every control would decouple them
at the cost of asserting nothing a user can see. If a string changes, the scenario fails loudly with
the old text in the error — which is the right kind of failure.
