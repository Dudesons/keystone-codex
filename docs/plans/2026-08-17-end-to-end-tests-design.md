# End-to-end tests — design

**Status:** awaiting review.
**Goal:** a four-scenario Playwright suite covering what jsdom structurally cannot — the built
bundle, served on a sub-path, in a real browser, talking to a real relay over a real socket.

## Why this exists

The repository has 639 green tests and, until now, no end-to-end test at all — `CLAUDE.md` says so
plainly. The argument for closing that gap is not coverage arithmetic; it is one concrete class of
bug.

The relay's origin allowlist could name the wrong host and every one of the 639 tests would still
pass, because the relay's own tests choose the `Origin` header they send. During the relay work that
guarantee was checked by reasoning about `git remote -v` and reading a string by eye. Nothing in the
suite could have caught a wrong entry. The same holds for the join link's shape on a GitHub Pages
sub-path, and for the composition of the map's coordinate transforms with real layout: each has unit
tests that pass by construction, because the test supplies the very value production gets from the
browser.

A browser suite that mirrored the existing 639 tests would be a maintenance tax for nothing. This
one is deliberately small, and every scenario earns its place by being unprovable without a browser.

## Out of scope

- **The five-minute pause and the idle clock.** Browsers throttle timers in hidden tabs, so the
  browser is the *worst* place to assert this; the jsdom tests pin it correctly with fake timers, and
  waiting five real minutes in CI is how a suite gets switched off.
- **Anything the existing suites already prove**: the MDT codec, the coordinate maths in isolation,
  content parsing, i18n formatting, the relay's room lifecycle.
- **Cross-browser.** Chromium only. The app targets people running WoW on a desktop; a second engine
  doubles the CI cost for a risk nobody has reported.
- **Screenshots as assertions.** Visual regression on a map made of generated tiles would fail on
  every data regeneration.

## Verified groundwork

Every load-bearing assumption below was checked against the installed toolchain, not against
documentation. Recorded here so the implementation does not re-litigate it.

| Fact | How it was verified |
| --- | --- |
| `wrangler dev` needs no token and no Cloudflare account | `wrangler dev --help` shows `--remote` defaulting to `false`; a local run answered `200 keystone relay` |
| A WebSocket upgrade into the Durable Object works locally, and a Yjs document crosses between two clients | a throwaway node probe using the repo's own `ws`, `yjs` and `y-protocols`: two upgrades accepted, `"carried by the durable object"` arrived at the second client |
| The allowlist refuses a foreign origin under local wrangler too | the same probe got `HTTP 403` for `https://evil.example` |
| `vite preview --base=/keystone-codex/` serves the *production* build at a sub-path | fetched `http://localhost:4173/keystone-codex/` → `200`, with the built HTML still referencing `./assets/index-*.js` relatively, exactly as deployed |
| Vitest's default `include` matches `**/*.spec.ts` | printed `configDefaults.include` → `**/*.{test,spec}.?(c\|m)[jt]s?(x)` |
| The preview server binds IPv6 only | `http://localhost:4173/` answers, `http://127.0.0.1:4173/` does not |
| Each peer cursor already carries a stable handle | `data-peer-cursor={p.clientId}` in `PeerCursors.tsx`, already used by `DungeonMap.test.tsx` |
| Git Bash mangles a `/leading/slash` argument into a Windows path | `--base=/keystone-codex/` became `/Program Files/Git/keystone-codex/`; `MSYS2_ARG_CONV_EXCL="*"` fixes it |

**One assumption remains unverified**, because Playwright is not installed yet: that
`webServer` accepts an *array* of servers, so the relay and the app can both be started by the
config. If it does not, the fallback is a `globalSetup` module that starts the relay and a single
`webServer` entry for the app. The plan's first task installs Playwright and settles this before
anything is written on top of it.

## The harness

### Two servers, both owned by Playwright

| Server | Command | Readiness probe |
| --- | --- | --- |
| Relay | `wrangler dev --config relay/wrangler.toml --port 8787` | `GET http://localhost:8787/` → 200 |
| App | `npm run build` then `npm run preview:e2e` | `GET http://localhost:4173/keystone-codex/` → 200 |

The relay's readiness probe costs nothing to add: the worker's plain-`GET` branch already returns
`200 keystone relay` before any upgrade handling, and it exists precisely so something can ask
whether the relay is up.

`http://localhost:4173` is already in `ALLOWED_ORIGINS`, put there during the relay work with a
comment naming this use — "4173 is `vite preview`, which is what an end-to-end harness serves
`dist/` on". Nothing about the allowlist changes.

### The sub-path, and why it matters

The share link is built as `${location.origin}${location.pathname}#/d/${slug}?room=${room}`. On the
deployed site `pathname` is `/keystone-codex/`; served at the root it is `/`. A regression that
dropped the sub-path would therefore be invisible to a harness serving at `/`. Serving under
`--base=/keystone-codex/` reproduces the deployed shape while keeping the *production* build
untouched — `base: './'` in `vite.config.ts` stays as it is, the built asset URLs stay relative, and
only the path they are served under changes.

The command lives in an npm script rather than inline in the Playwright config, so that npm spawns
it through `cmd.exe` on Windows and the Git Bash path mangling recorded above cannot apply. The plan
verifies that from Git Bash explicitly rather than assuming it.

### `VITE_COLLAB_URL`, and one honest caveat

Vite substitutes `import.meta.env.*` at build time, so pointing the app at the local relay means
building with `VITE_COLLAB_URL=ws://localhost:8787`. **The bundle under test is therefore not
byte-identical to the deployed one**: exactly one string differs, the relay URL, which the harness
must override by construction. Worth stating rather than discovering.

### New scripts and configuration

- `package.json`: `"preview:e2e": "vite preview --base=/keystone-codex/ --port 4173 --strictPort"`,
  `"test:e2e": "playwright test"`, and `@playwright/test@1.62.1` as a devDependency.
- **`npm test` stays Vitest-only.** The default test command must keep working on a machine with no
  browsers installed; `npm run test:e2e` is a separate door.
- `vite.config.ts`: add `'e2e/**'` to the `app` project's `exclude`. Without it, Vitest's default
  `include` collects the Playwright specs and runs them in node — the same reason `relay/**` is
  already excluded there.
- `.gitignore`: `playwright-report/`, `test-results/`. Nothing is needed for the relay's local
  state: `wrangler` resolves it relative to its configuration file, so `--config relay/wrangler.toml`
  invoked from the repository root still writes to the already-ignored `relay/.wrangler/` — verified,
  because the obvious assumption is that it would land at the root.
- `playwright.config.ts`: `testDir: 'e2e'`, chromium only, `baseURL`
  `http://localhost:4173/keystone-codex/` (`localhost`, not `127.0.0.1`, per the IPv6 finding),
  `workers: 1`, `retries: process.env.CI ? 1 : 0`, `forbidOnly: !!process.env.CI`, trace on first
  retry.

`workers: 1` because two tests sharing a room name would share one Durable Object instance. Unique
room codes per test would allow parallelism, and each test generates one anyway — the relay suite
learned that lesson when shared storage made room names collide — but serial is the honest default
for four tests, and it keeps the relay's output readable when one fails.

## The four scenarios

Each one names the guarantee it holds and why a browser is required. Each must also be **proven to
fail**: break its guarantee with a one-line change, watch it go red, revert. A green end-to-end test
nobody has seen fail is decoration.

### 1. The relay answers over a real socket, with a real `Origin`

Open a session, assert the panel reports *connected* rather than merely connecting or stalled.

This is the canary for the allowlist. It duplicates a precondition of scenarios 2 and 3, and that
duplication is deliberate: when the allowlist is wrong, this test failing alone gives a one-line
diagnosis instead of three tests failing for reasons that look like presence bugs.

### 2. A join link survives the deployed URL shape

Arrive at the home page, click through to the first dungeon (so no slug is hardcoded and next
season's data cannot break the suite), open a session, read the share link, assert it carries the
sub-path, then open it in a second browser context and assert the invitation appears.

Only a browser composes a real `location.pathname`, a hash route and a query string on a sub-path.
Every jsdom test supplies that URL itself.

### 3. Two viewports agree where a cursor points

Both contexts join the same room at **different viewport sizes**. One hovers a known landmark on the
map; the other's `[data-peer-cursor]` must land on that same landmark in its own layout.

The coordinate transforms have unit tests. What has none is their composition with real layout, real
zoom, a real image and the throttled trip through the relay — and jsdom cannot have one, because it
lays every element out at zero. The differing viewport sizes are the point: identical sizes would
pass even if the map-space conversion were skipped entirely.

### 4. Leaving a session restores the local route

Build a small local route (name it, add a pull), join an empty room, assert the local draft is gone,
leave, assert it comes back — against real `localStorage`.

This is the repair the collaborative-session work made, and its failure mode is losing someone's
work. Deliberately **not** driven by `src/lib/mdt/__fixtures__/real-export.txt`: importing that would
tie the test to one dungeon's slug and to data regenerated every season, buying nothing, since what
is under test is the stash and its restoration, not the codec.

## Where it runs

A new `.github/workflows/e2e.yml`, `on: workflow_call` plus `workflow_dispatch`, called from both:

- **`ci.yml`** — every pull request and every push to `main`, where feedback is cheap and timely.
- **`deploy.yml`** — before `upload-pages-artifact`, for the reason that workflow already states in
  its own comment: being manual it can target any ref, so it cannot inherit CI's guarantee and
  replays the checks itself. An end-to-end suite that CI runs but a manual deploy skips would leave
  exactly the hole `deploy.yml` exists to close.

Browsers come from `npx playwright install --with-deps chromium`, cached on the Playwright version.
No workflow gains a `push` or `schedule` trigger that deploys anything: deployment stays manual.

## Flakiness policy

- **No fixed sleeps.** Playwright's auto-waiting and `expect.poll` only. A `waitForTimeout` in this
  suite is a defect.
- **One retry in CI, none locally.** The retry exists for genuine socket timing, not as a way to
  make a race pass.
- A scenario that needs its retry regularly is **raised with RwlRwlRwlRwl**, not quietly retried into
  green and not deleted.

## Typechecking, and an ordering dependency

`tsconfig.json`'s `include` is `["src", "scripts", "vite.config.ts"]`, so a new `e2e/` directory
would be outside the typechecker — the identical gap that `relay/` has today, and that the approved
follow-up work is about to close. **Both should be closed by the same mechanism.** Whichever lands
first sets the shape; this plan must be sequenced after that decision rather than inventing a second
one.

## Files touched

| Path | Change |
| --- | --- |
| `playwright.config.ts` | new |
| `e2e/session.spec.ts` | new — start as one file; split when it stops being comfortable to read |
| `e2e/fixtures.ts` | new — the room-code generator and a `joinSession(page, room, name)` helper |
| `package.json` | two scripts, one devDependency |
| `vite.config.ts` | `'e2e/**'` added to the `app` project's `exclude` |
| `.gitignore` | `playwright-report/`, `test-results/` |
| `.github/workflows/e2e.yml` | new |
| `.github/workflows/ci.yml`, `deploy.yml` | call the reusable workflow |
| `CLAUDE.md`, `README.md` | the testing table currently records **None** for end-to-end |
| `tsconfig*.json` | per the ordering dependency above |

## One decision left for RwlRwlRwlRwl

**Scenario 3 needs a stable handle on a map landmark, and none exists.** The `<g>` a `Blip` renders
carries no `data-` attribute; only the container (`data-panning`) and the peer cursors
(`data-peer-cursor`) do.

Recommendation: add one `data-` attribute to the `Blip` `<g>`, mirroring `data-peer-cursor` — same
file, same purpose, an established pattern rather than a new one.

The alternative, locating a mob by its portrait `<image href>`, is rejected on a fact rather than a
preference: `enemy.displayId &&` gates that element, so some mobs render no image at all and the
locator would silently match nothing.

## Cost, stated plainly

Roughly 130 MB of Chromium in CI (cached between runs), one to two minutes added per CI run, and a
devDependency locally. Four tests is the whole suite; if it grows past what those four guarantees
need, that growth needs its own argument.
