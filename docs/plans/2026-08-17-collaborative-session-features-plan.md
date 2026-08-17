# Collaborative Session Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let people name themselves, see each other's cursors on the map, and join a session by link — while making a join non-destructive and a dead relay legible.

**Architecture:** A new pure module `src/lib/collab/presence.ts` turns Yjs awareness states into a list of peers with stable colours. `useRouteDoc` keeps ownership of the provider and feeds that module, gaining an editable identity, a throttled cursor writer, a `synced` flag, and a stash that protects the local route. The map draws peer cursors in an untransformed overlay, using two new pure coordinate functions in `viewport.ts`.

**Tech Stack:** React 19, TypeScript, Vite 6, Tailwind 4, Y.js + y-websocket, Vitest + jsdom + Testing Library.

**Spec:** [`docs/plans/2026-08-17-collaborative-session-features-design.md`](2026-08-17-collaborative-session-features-design.md)

## Global Constraints

- **TDD is mandatory.** `.claude/skills/testing/test-driven-development/SKILL.md`: write the test, **watch it fail**, then the minimal code. A test that passes the first time proves nothing — rewrite it.
- **Never use `--no-verify`, `--no-hooks`, `--no-pre-commit-hook`.** This repository has no git hooks configured, so nothing will stop a bad commit for you.
- **English everywhere developer-facing**: commit messages, comments, this plan. Interface copy is translated, never written in one language.
- **Commit style**: imperative mood, no `feat:`/`fix:` prefix. Subject says what the commit does to the repository; body says **why**, never what.
- **Every file starts with two `// ABOUTME: ` lines.** Markdown documents do not.
- **Comments are evergreen**: never mention refactors, "new", "improved", or how the code got here.
- Component test files carry `// @vitest-environment jsdom` at the top and declare their own `afterEach(cleanup)` — Testing Library runs without `globals: true`.
- Mount components through `src/test/render.tsx` (`renderEn` / `renderFr`), never Testing Library's bare `render`.
- `src/lib/i18n/fr.ts` is typed against `en.ts`; a missing key fails `npm run typecheck`. Add both together.
- The participant name is **not translated**: it is replicated to peers.
- Storage keys: route `midnight-codex:route:<slug>`, stash `midnight-codex:route:<slug>:stashed`, identity `midnight-codex:identity`.
- A parallel session is editing `content/**`. **Stage only the files each task names.** Never `git add -A`.
- A local relay is required for manual checks only: `npx -y y-websocket@2.1.0`, with `.env.local` holding `VITE_COLLAB_URL=ws://localhost:1234`. No automated test may touch it.

---

## File Structure

| File | Responsibility | Task |
| --- | --- | --- |
| `vitest.config.ts` *(or `vite.config.ts`)* | Keep the git worktree under `.claude/` out of the suite | 1 |
| `src/lib/collab/presence.ts` *(new)* | `Peer`, `peerColor`, `readPeers` — pure | 2 |
| `src/lib/collab/presence.test.ts` *(new)* | Its tests | 2 |
| `src/components/map/viewport.ts` | `toMapPoint`, `toContainerPoint` | 3 |
| `src/lib/mdt/useRouteDoc.ts` | Identity, peers, stash, `synced`, throttled cursor | 4, 5, 6 |
| `src/components/route/RoutePanel.tsx` | Name field, link, invitation card, waiting state | 7, 8, 11 |
| `src/components/map/PeerCursors.tsx` *(new)* | The cursor overlay | 10 |
| `src/components/map/RelayNotice.tsx` *(new)* | The "relay is not answering" notice | 11 |
| `src/components/map/DungeonMap.tsx` | Reports pointer moves, hosts both overlays | 9, 10, 11 |
| `src/routes/DungeonPage.tsx` | Reads `?room=`, wires presence through | 8, 10, 11 |
| `src/lib/i18n/en.ts`, `fr.ts` | New interface strings | 7, 8, 11 |
| `README.md` | The link, the name, the relay | 12 |

---

## Task 1: Keep the worktree out of the test suite

A git worktree lives at `.claude/worktrees/competent-chaplygin-be3ccb`, excluded from git through `.git/info/exclude`. Vitest does not read that file, so it globs those test files too and runs the whole suite twice — 1066 tests instead of ~533, half of them against a frozen copy of the source. Every later task in this plan reads test output; it has to mean something first.

**Files:**
- Modify: the Vitest config (`vitest.config.ts` if present, otherwise the `test` block of `vite.config.ts`)

**Interfaces:**
- Consumes: nothing
- Produces: nothing — a tooling fix

- [ ] **Step 1: Confirm the duplication exists**

```bash
npm test 2>&1 | tail -5
```

Expected: a test-file count around 44 and a test count around 1066, with paths under `.claude/worktrees/` in the listing. If the worktree is gone and the count is around 22 files / 533 tests, **skip this whole task** and say so.

- [ ] **Step 2: Locate the Vitest config**

```bash
ls vitest.config.ts vite.config.ts 2>/dev/null
```

- [ ] **Step 3: Exclude the directory**

In the `test` block, add `exclude`, keeping Vitest's defaults so `node_modules` stays excluded:

```ts
import { configDefaults } from 'vitest/config'

// …
test: {
  // A git worktree may sit under .claude/; its copies of every test file would otherwise
  // run beside the real ones, against a frozen checkout.
  exclude: [...configDefaults.exclude, '.claude/**'],
  // …existing options
}
```

- [ ] **Step 4: Verify the count halves**

```bash
npm test 2>&1 | tail -5
```

Expected: roughly half the files and half the tests, all passing, no `.claude/` paths.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts
git commit -m "$(cat <<'EOF'
Run each test once, not once per worktree

A worktree under .claude/ is invisible to git through .git/info/exclude,
but Vitest globs the filesystem and picked up its copy of every test file.
The suite ran twice, and half of it against a checkout frozen at whatever
commit the worktree sits on.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: The presence module

**Files:**
- Create: `src/lib/collab/presence.ts`
- Test: `src/lib/collab/presence.test.ts`

**Interfaces:**
- Consumes: `Point` from `src/lib/geometry.ts`
- Produces:
  - `interface Peer { clientId: number; name: string; color: string; cursor?: Point; isSelf: boolean }`
  - `function peerColor(clientId: number): string`
  - `function readPeers(states: Map<number, unknown>, self: number): Peer[]`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/collab/presence.test.ts`:

```ts
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

  it('orders by client id, so cursors do not swap places between renders', () => {
    const shuffled = new Map<number, unknown>([
      [9, { user: { name: 'C' } }],
      [3, { user: { name: 'A' } }],
      [5, { user: { name: 'B' } }],
    ])
    expect(readPeers(shuffled, 3).map((p) => p.name)).toEqual(['A', 'B', 'C'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test src/lib/collab/presence.test.ts
```

Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/collab/presence.ts`:

```ts
// ABOUTME: Turns Yjs awareness states into the participants of a session.
// ABOUTME: Pure, because a colour or a coordinate can be wrong without anything looking broken.

import type { Point } from '../geometry'

export interface Peer {
  clientId: number
  /** Empty until the peer has announced a name. */
  name: string
  color: string
  /** In map coordinates. Absent until the peer moves over the map. */
  cursor?: Point
  /** You. Kept in the list so a count of it means "participants, yourself included". */
  isSelf: boolean
}

/**
 * A colour per participant, derived rather than agreed.
 *
 * Stepping the hue by the golden angle keeps neighbouring client ids far apart on the wheel,
 * and deriving it from the id alone means nobody has to negotiate: two browsers reach the
 * same colour for the same person without exchanging a word about it.
 */
const GOLDEN_ANGLE = 137.508

export function peerColor(clientId: number): string {
  const hue = Math.abs(Math.round(clientId * GOLDEN_ANGLE)) % 360
  return `hsl(${hue} 70% 62%)`
}

function readPoint(raw: unknown): Point | undefined {
  const p = raw as { x?: unknown; y?: unknown } | null
  if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return undefined
  return { x: p.x, y: p.y }
}

/**
 * Reads the awareness map, tolerating whatever is missing.
 *
 * A peer that has just arrived has neither a name nor a cursor, and that must never break the
 * render — the same rule as a mob with no entry still appearing on the map. Ordering by client
 * id keeps cursors from swapping places in the DOM between two updates.
 */
export function readPeers(states: Map<number, unknown>, self: number): Peer[] {
  const peers: Peer[] = []
  states.forEach((raw, clientId) => {
    const state = (raw ?? {}) as { user?: { name?: unknown }; cursor?: unknown }
    peers.push({
      clientId,
      name: typeof state.user?.name === 'string' ? state.user.name : '',
      color: peerColor(clientId),
      cursor: readPoint(state.cursor),
      isSelf: clientId === self,
    })
  })
  return peers.sort((a, b) => a.clientId - b.clientId)
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test src/lib/collab/presence.test.ts
```

Expected: PASS, 7 tests, no warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/collab/presence.ts src/lib/collab/presence.test.ts
git commit -m "$(cat <<'EOF'
Read a session's participants out of its awareness states

Colours are derived from the client id rather than agreed between peers:
two browsers reach the same colour for the same person without exchanging
a word about it, and there is no shared state to keep consistent.

Everything a peer has not announced yet is tolerated. Someone who has just
arrived has neither a name nor a cursor, and the arrival of a teammate is
the worst possible moment to stop rendering.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Map and container coordinates

**Files:**
- Modify: `src/components/map/viewport.ts`
- Test: `src/components/map/viewport.test.ts`

**Interfaces:**
- Consumes: `Transform` and `Point`, both already in `viewport.ts`'s imports
- Produces:
  - `function toMapPoint(t: Transform, p: Point): Point`
  - `function toContainerPoint(t: Transform, p: Point): Point`

- [ ] **Step 1: Write the failing tests**

Append to `src/components/map/viewport.test.ts`, following the file's existing `describe` style:

```ts
describe('toMapPoint and toContainerPoint', () => {
  const transforms: Transform[] = [
    { scale: 1, tx: 0, ty: 0 },
    { scale: 0.5, tx: 120, ty: -40 },
    { scale: 3.25, tx: -900, ty: 615 },
  ]

  it('reads the top-left of an untransformed map as the origin', () => {
    expect(toMapPoint({ scale: 1, tx: 0, ty: 0 }, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })

  it('undoes the translation before the scale', () => {
    expect(toMapPoint({ scale: 2, tx: 100, ty: 50 }, { x: 300, y: 250 })).toEqual({ x: 100, y: 100 })
  })

  it('places a map point back where the container draws it', () => {
    expect(toContainerPoint({ scale: 2, tx: 100, ty: 50 }, { x: 100, y: 100 })).toEqual({
      x: 300,
      y: 250,
    })
  })

  it('round-trips at every transform, which is what keeps two zoom levels agreeing', () => {
    for (const t of transforms) {
      for (const p of [{ x: 0, y: 0 }, { x: 640, y: 480 }, { x: 1919, y: 1279 }]) {
        const back = toMapPoint(t, toContainerPoint(t, p))
        expect(back.x).toBeCloseTo(p.x, 9)
        expect(back.y).toBeCloseTo(p.y, 9)
      }
    }
  })
})
```

Add `toContainerPoint` and `toMapPoint` to the existing import from `./viewport`, and `type Transform` if the file does not already import it.

- [ ] **Step 2: Run to verify it fails**

```bash
npm test src/components/map/viewport.test.ts
```

Expected: FAIL — `toMapPoint is not a function`.

- [ ] **Step 3: Write the minimal implementation**

Append to `src/components/map/viewport.ts`:

```ts
/**
 * Container pixels to map pixels, and back.
 *
 * A peer's cursor travels in map coordinates. Sending screen pixels would put their arrow on
 * a different mob than ours the moment our zoom levels differ — an error that does not look
 * like a bug, only like a colleague pointing badly.
 */
export function toMapPoint(t: Transform, p: Point): Point {
  return { x: (p.x - t.tx) / t.scale, y: (p.y - t.ty) / t.scale }
}

export function toContainerPoint(t: Transform, p: Point): Point {
  return { x: p.x * t.scale + t.tx, y: p.y * t.scale + t.ty }
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test src/components/map/viewport.test.ts
```

Expected: PASS, all tests in the file.

- [ ] **Step 5: Commit**

```bash
git add src/components/map/viewport.ts src/components/map/viewport.test.ts
git commit -m "$(cat <<'EOF'
Convert between container pixels and map pixels

A cursor shared between two people has to be expressed in the map's own
coordinates. Screen pixels would land on a different mob as soon as the two
zoom levels differ, and nothing about that failure looks like a bug — only
like a teammate pointing badly.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: A chosen name, and peers instead of a count

**Files:**
- Modify: `src/lib/mdt/useRouteDoc.ts`
- Modify: `src/components/route/RoutePanel.tsx` (the two lines that read `collab.peers`)
- Modify: `src/routes/DungeonPage.tsx` (the header badge)
- Test: `src/lib/mdt/useRouteDoc.test.tsx`

**Interfaces:**
- Consumes: `Peer`, `readPeers` from Task 2
- Produces:
  - `CollabState.peers` is now `Peer[]` (was `number`)
  - `CollabState.identity` is now `string | null`
  - `useRouteDoc` returns an added `setIdentity(name: string): void`
  - `storedIdentity(): string | null` replaces `identityName()`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/mdt/useRouteDoc.test.tsx`, inside a new `describe('Identity', …)`:

```ts
describe('Identity', () => {
  it('starts with no name, so one has to be chosen', () => {
    localStorage.removeItem('midnight-codex:identity')
    const { result } = mount()
    expect(result.current.collab.identity).toBeNull()
  })

  it('remembers a chosen name across mounts', () => {
    const first = mount()
    act(() => first.result.current.setIdentity('Rwl'))
    first.unmount()
    expect(mount().result.current.collab.identity).toBe('Rwl')
  })

  it('keeps a name already stored rather than renaming anyone', () => {
    localStorage.setItem('midnight-codex:identity', 'Player-8429')
    expect(mount().result.current.collab.identity).toBe('Player-8429')
  })

  it('counts yourself among the participants of a room you just opened', () => {
    const { result } = mount()
    act(() => result.current.setIdentity('Rwl'))
    act(() => result.current.joinRoom('AAAAAA', 'host'))
    expect(result.current.collab.peers.map((p) => p.name)).toEqual(['Rwl'])
    expect(result.current.collab.peers[0].isSelf).toBe(true)
  })

  it('announces a rename to the room without reconnecting', () => {
    const { result } = mount()
    act(() => result.current.setIdentity('Rwl'))
    act(() => result.current.joinRoom('AAAAAA', 'host'))
    act(() => result.current.setIdentity('RwlRwl'))
    expect(result.current.collab.peers.map((p) => p.name)).toEqual(['RwlRwl'])
  })
})
```

Add `beforeEach(() => localStorage.clear())` if the file does not already clear storage between tests.

- [ ] **Step 2: Run to verify it fails**

```bash
npm test src/lib/mdt/useRouteDoc.test.tsx
```

Expected: FAIL — `setIdentity is not a function`, and `identity` is a `Player-…` string rather than `null`.

- [ ] **Step 3: Write the minimal implementation**

In `src/lib/mdt/useRouteDoc.ts`:

Replace `identityName()` at the bottom of the file with:

```ts
const IDENTITY_KEY = 'midnight-codex:identity'

/**
 * The name you chose, or nothing yet.
 *
 * Not translated, for the same reason as `DEFAULT_ROUTE_NAME`: this name is replicated to
 * Y.js peers, so two teammates on different locales must see the same string for the same
 * person. Returning nothing on a first visit is what makes choosing one mean something —
 * offering an invented name would have everybody accept it without reading.
 */
function storedIdentity(): string | null {
  return localStorage.getItem(IDENTITY_KEY)
}
```

Change the `CollabState` interface:

```ts
export interface CollabState {
  status: CollabStatus
  room: string | null
  /** Participants, yourself included. */
  peers: Peer[]
  identity: string | null
}
```

Import `readPeers` and `type Peer` from `../collab/presence`. Initialise `peers: []` and `identity: storedIdentity()`.

Inside `joinRoom`, replace the awareness field write and the `update` closure:

```ts
if (collab.identity) provider.awareness.setLocalStateField('user', { name: collab.identity })

const update = () =>
  setCollab((c) => ({
    ...c,
    status: provider.wsconnected ? 'connected' : 'connecting',
    peers: readPeers(provider.awareness.getStates(), provider.awareness.clientID),
  }))
```

Set `peers: []` in `leaveRoom`.

Add, next to the other callbacks:

```ts
const setIdentity = useCallback((name: string) => {
  const trimmed = name.trim()
  localStorage.setItem(IDENTITY_KEY, trimmed)
  setCollab((c) => ({ ...c, identity: trimmed }))
  sessionRef.current?.provider.awareness.setLocalStateField('user', { name: trimmed })
}, [])
```

Return it from the hook.

In `RoutePanel.tsx`, `plural('collab.connected', collab.peers)` becomes `plural('collab.connected', collab.peers.length)`. In `DungeonPage.tsx`, `{collab.peers}` in the header badge becomes `{collab.peers.length}`.

- [ ] **Step 4: Run to verify it passes**

```bash
npm test src/lib/mdt/useRouteDoc.test.tsx
npm run typecheck
```

Expected: PASS, and a clean typecheck. If `npm run typecheck` complains at any other reader of `collab.peers`, fix it — that is the compiler doing the survey for you.

- [ ] **Step 5: Run the whole suite**

```bash
npm test
```

Expected: all green. `RoutePanel.test.tsx` and `DungeonPage.test.tsx` both assert on the connected count.

- [ ] **Step 6: Commit**

```bash
git add src/lib/mdt/useRouteDoc.ts src/lib/mdt/useRouteDoc.test.tsx src/components/route/RoutePanel.tsx src/routes/DungeonPage.tsx
git commit -m "$(cat <<'EOF'
Let people name themselves instead of being handed a number

The session invented Player-8429 and remembered it. Nobody ever chose it,
and on a call nobody could say whose it was. A name is now absent until
someone types one, and it can be changed mid-session: the rename travels
over awareness, so the room sees it without anyone reconnecting.

The participant count becomes a list of participants, since knowing who is
in the room is the point of asking for a name at all.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: The local route is set aside, not destroyed

**Files:**
- Modify: `src/lib/mdt/useRouteDoc.ts`
- Test: `src/lib/mdt/useRouteDoc.test.tsx`

**Interfaces:**
- Consumes: `storageKey`, `seed`, `luaToRoute`, `decodeMdtString` — all already in the file
- Produces: nothing new in the public surface; `joinRoom` and `leaveRoom` change behaviour

- [ ] **Step 1: Write the failing tests**

Add a `describe('The stashed local route', …)` to `src/lib/mdt/useRouteDoc.test.tsx`:

```ts
describe('The stashed local route', () => {
  const stashKey = `midnight-codex:route:${SLUG}:stashed`

  /** A saved local route, in the only form the app persists: an MDT string. */
  const saveLocalRoute = () => {
    const route = emptyRoute(SLUG, MDT_INDEX)
    route.name = 'My own route'
    localStorage.setItem(storageKey, encodeMdtString(routeToLua(route)))
  }

  it('sets the local route aside when joining someone else’s room', () => {
    saveLocalRoute()
    const { result } = mount()
    act(() => result.current.joinRoom('AAAAAA', 'guest'))
    expect(localStorage.getItem(stashKey)).not.toBeNull()
  })

  it('gives it back on leaving', () => {
    saveLocalRoute()
    const { result } = mount()
    act(() => result.current.joinRoom('AAAAAA', 'guest'))
    act(() => result.current.leaveRoom())
    expect(result.current.route.name).toBe('My own route')
    expect(localStorage.getItem(stashKey)).toBeNull()
  })

  it('gives it back at startup when a tab was closed mid-session', () => {
    saveLocalRoute()
    const stashed = localStorage.getItem(storageKey)!
    localStorage.setItem(stashKey, stashed)
    localStorage.setItem(storageKey, encodeMdtString(routeToLua(emptyRoute(SLUG, MDT_INDEX))))

    const { result } = mount()
    expect(result.current.route.name).toBe('My own route')
    expect(localStorage.getItem(stashKey)).toBeNull()
  })

  it('does not overwrite the stash when hopping from one room to another', () => {
    saveLocalRoute()
    const { result } = mount()
    act(() => result.current.joinRoom('AAAAAA', 'guest'))
    const afterFirstJoin = localStorage.getItem(stashKey)
    act(() => result.current.joinRoom('BBBBBB', 'guest'))
    expect(localStorage.getItem(stashKey)).toBe(afterFirstJoin)
  })

  it('stashes nothing for a host, whose document is the room', () => {
    saveLocalRoute()
    const { result } = mount()
    act(() => result.current.joinRoom('AAAAAA', 'host'))
    expect(localStorage.getItem(stashKey)).toBeNull()
  })
})
```

Import `emptyRoute` from `./route` if the test file does not already.

- [ ] **Step 2: Run to verify it fails**

```bash
npm test src/lib/mdt/useRouteDoc.test.tsx
```

Expected: FAIL — the stash key is never written.

- [ ] **Step 3: Write the minimal implementation**

In `src/lib/mdt/useRouteDoc.ts`, next to `storageKey`:

```ts
/**
 * Where the local route waits while you are in someone else's room.
 *
 * The invariant: a stash exists exactly when a local route is waiting, and **every** way out
 * of a session puts it back — leaving, and also closing the tab, which is why the initial
 * document consults it too.
 */
const stashKey = (slug: string) => `${storageKey(slug)}:stashed`
```

In the `useState` initialiser for `doc`, before reading the saved route:

```ts
// A stash left behind means a session was interrupted rather than left. Closing a tab counts
// as leaving, so the route goes back before anything else reads storage.
const stashed = localStorage.getItem(stashKey(slug))
if (stashed) {
  localStorage.setItem(storageKey(slug), stashed)
  localStorage.removeItem(stashKey(slug))
}
```

In `joinRoom`, immediately after `closeSession()`:

```ts
// Only on the way in from local editing: hopping from one room to another must not bury the
// route you started with under the one you are leaving. A host stashes nothing — its document
// is the room.
if (mode === 'guest' && collab.status === 'off') {
  const local = localStorage.getItem(storageKey(slug))
  if (local) localStorage.setItem(stashKey(slug), local)
}
```

Add `collab.status` to `joinRoom`'s dependency array.

Rewrite `leaveRoom`:

```ts
const leaveRoom = useCallback(() => {
  closeSession()
  const stashed = localStorage.getItem(stashKey(slug))
  if (stashed) {
    const restored = new Y.Doc()
    try {
      seed(restored, luaToRoute(decodeMdtString(stashed).table), stashed)
      setDoc(restored)
      localStorage.setItem(storageKey(slug), stashed)
    } catch {
      // An unreadable stash must not trap anyone inside a session they want to leave.
    }
    localStorage.removeItem(stashKey(slug))
  }
  setCollab((c) => ({ ...c, status: 'off', room: null, peers: [] }))
}, [closeSession, slug])
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test src/lib/mdt/useRouteDoc.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mdt/useRouteDoc.ts src/lib/mdt/useRouteDoc.test.tsx
git commit -m "$(cat <<'EOF'
Set the local route aside on joining rather than overwriting it

Joining a room swaps in an empty document, and the save that follows wrote
the room's route over the local one in storage. That cost a deliberate act
while a six-letter code was the only way in; it would cost one careless
click once a link exists.

The route now waits under its own key, and every way out puts it back —
leaving, and closing the tab, which is why the initial document consults
the stash before anything else reads storage.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Knowing when the room has actually answered, and sharing a cursor

**Files:**
- Modify: `src/lib/mdt/useRouteDoc.ts`
- Test: `src/lib/mdt/useRouteDoc.test.tsx`

**Interfaces:**
- Consumes: `Point` from `../geometry`
- Produces:
  - `CollabState.synced: boolean`
  - `useRouteDoc` returns an added `setCursor(point: Point | null): void`

- [ ] **Step 1: Write the failing tests**

```ts
describe('Sync and cursors', () => {
  it('does not claim to be synced before the room has answered', () => {
    const { result } = mount()
    act(() => result.current.joinRoom('AAAAAA', 'guest'))
    expect(result.current.collab.synced).toBe(false)
  })

  it('reports no cursor before anyone has moved', () => {
    const { result } = mount()
    act(() => result.current.joinRoom('AAAAAA', 'host'))
    expect(result.current.collab.peers[0].cursor).toBeUndefined()
  })

  it('shares the first move at once', () => {
    const { result } = mount()
    act(() => result.current.joinRoom('AAAAAA', 'host'))
    act(() => result.current.setCursor({ x: 100, y: 200 }))
    expect(result.current.collab.peers[0].cursor).toEqual({ x: 100, y: 200 })
  })

  it('holds back a flood of moves, then sends the last one', () => {
    vi.useFakeTimers()
    try {
      const { result } = mount()
      act(() => result.current.joinRoom('AAAAAA', 'host'))
      act(() => result.current.setCursor({ x: 1, y: 1 }))
      for (let i = 2; i <= 40; i++) act(() => result.current.setCursor({ x: i, y: i }))

      expect(result.current.collab.peers[0].cursor).toEqual({ x: 1, y: 1 })
      act(() => void vi.advanceTimersByTime(60))
      expect(result.current.collab.peers[0].cursor).toEqual({ x: 40, y: 40 })
    } finally {
      vi.useRealTimers()
    }
  })

  it('drops the cursor at once when the pointer leaves the map', () => {
    const { result } = mount()
    act(() => result.current.joinRoom('AAAAAA', 'host'))
    act(() => result.current.setCursor({ x: 100, y: 200 }))
    act(() => result.current.setCursor(null))
    expect(result.current.collab.peers[0].cursor).toBeUndefined()
  })
})
```

Add `vi` to the `vitest` import.

- [ ] **Step 2: Run to verify it fails**

```bash
npm test src/lib/mdt/useRouteDoc.test.tsx
```

Expected: FAIL — `setCursor is not a function`.

- [ ] **Step 3: Write the minimal implementation**

In `src/lib/mdt/useRouteDoc.ts`, add `synced: boolean` to `CollabState` (initialised `false`), and import `type Point` from `../geometry`.

Near the other module constants:

```ts
/**
 * How often a cursor is allowed on the wire.
 *
 * A pointer fires sixty times a second. Twenty is already past what an eye resolves in a
 * moving arrow, and the other forty would be a relay's bandwidth spent on nothing.
 */
const CURSOR_INTERVAL_MS = 50
```

Inside the hook:

```ts
const cursorRef = useRef<{ last: number; pending: Point | null; timer: ReturnType<typeof setTimeout> | null }>({
  last: 0,
  pending: null,
  timer: null,
})
```

In `joinRoom`, extend `update` and subscribe to `sync`:

```ts
const update = () =>
  setCollab((c) => ({
    ...c,
    status: provider.wsconnected ? 'connected' : 'connecting',
    synced: provider.synced,
    peers: readPeers(provider.awareness.getStates(), provider.awareness.clientID),
  }))

provider.awareness.on('change', update)
provider.on('status', update)
provider.on('sync', update)
```

and unsubscribe from `sync` in `detach`. Reset `synced: false` in `leaveRoom` and when a session opens.

Add:

```ts
const setCursor = useCallback((point: Point | null) => {
  const state = cursorRef.current
  const write = (value: Point | null) => {
    // Read the provider at the moment of writing, never through a closure: a throttled write
    // can land after the session it belonged to was torn down.
    sessionRef.current?.provider.awareness.setLocalStateField('cursor', value)
  }

  // Leaving the map is not throttled. A cursor that lingers where its owner no longer is says
  // something false, and says it for as long as nobody moves.
  if (point === null) {
    state.pending = null
    write(null)
    return
  }

  const wait = CURSOR_INTERVAL_MS - (Date.now() - state.last)
  if (wait <= 0) {
    state.last = Date.now()
    write(point)
    return
  }

  state.pending = point
  if (state.timer == null) {
    state.timer = setTimeout(() => {
      state.timer = null
      state.last = Date.now()
      if (state.pending) write(state.pending)
      state.pending = null
    }, wait)
  }
}, [])
```

In `closeSession`, clear the pending timer:

```ts
if (cursorRef.current.timer != null) {
  clearTimeout(cursorRef.current.timer)
  cursorRef.current.timer = null
}
cursorRef.current.pending = null
```

Return `setCursor` from the hook.

- [ ] **Step 4: Run to verify it passes**

```bash
npm test src/lib/mdt/useRouteDoc.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mdt/useRouteDoc.ts src/lib/mdt/useRouteDoc.test.tsx
git commit -m "$(cat <<'EOF'
Share a pointer, and tell whether the room has answered

A provider that has opened its socket has not necessarily received
anything, and the difference is the whole of what a stalled session looks
like from the inside. It is now reported rather than guessed at.

Cursor writes are held to twenty a second. A pointer fires sixty times, and
the other forty would be a relay's bandwidth spent below what an eye can
resolve in a moving arrow. Leaving the map is exempt: a cursor that lingers
where its owner is not says something false until somebody else moves.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: The name field, and the buttons it gates

**Files:**
- Modify: `src/components/route/RoutePanel.tsx` (the `CollabSection` component)
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`
- Test: `src/components/route/RoutePanel.test.tsx`

**Interfaces:**
- Consumes: `collab.identity: string | null` and `setIdentity` from Task 4
- Produces: `RoutePanel` gains the prop `onSetIdentity: (name: string) => void`

- [ ] **Step 1: Write the failing tests**

```ts
describe('Choosing a name', () => {
  it('refuses to open or join a session until a name is given', () => {
    renderEn(<RoutePanel {...props({ collab: { ...offline, identity: null } })} />)
    expect(screen.getByRole('button', { name: /open a session/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^join$/i })).toBeDisabled()
  })

  it('offers the name already remembered', () => {
    renderEn(<RoutePanel {...props({ collab: { ...offline, identity: 'Rwl' } })} />)
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Rwl')
  })

  it('reports a name as it is typed', async () => {
    const onSetIdentity = vi.fn()
    renderEn(<RoutePanel {...props({ collab: { ...offline, identity: null }, onSetIdentity })} />)
    await userEvent.type(screen.getByLabelText(/your name/i), 'R')
    expect(onSetIdentity).toHaveBeenCalledWith('R')
  })

  it('still offers the name while a session is open, so it can be changed', () => {
    renderEn(<RoutePanel {...props({ collab: { ...connected, identity: 'Rwl' } })} />)
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Rwl')
  })
})
```

Follow the file's existing helper for building props; `offline` and `connected` are `CollabState` fixtures with `peers: []` and a one-peer list respectively.

- [ ] **Step 2: Run to verify it fails**

```bash
npm test src/components/route/RoutePanel.test.tsx
```

Expected: FAIL — no field labelled "Your name".

- [ ] **Step 3: Add the strings**

`src/lib/i18n/en.ts`:

```ts
'collab.name': 'Your name',
'collab.namePlaceholder': 'Name',
```

`src/lib/i18n/fr.ts`:

```ts
'collab.name': 'Ton pseudo',
'collab.namePlaceholder': 'Pseudo',
```

- [ ] **Step 4: Write the minimal implementation**

In `CollabSection`, above the buttons in the offline branch, and inside the connected branch in place of the plain `{collab.identity}` line:

```tsx
<label className="mb-2 block">
  <span className="mb-1 block text-[10px] font-bold tracking-widest text-ink-400">
    {t('collab.name')}
  </span>
  <input
    value={collab.identity ?? ''}
    onChange={(e) => onSetIdentity(e.target.value)}
    placeholder={t('collab.namePlaceholder')}
    maxLength={20}
    className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-100 focus:border-gold-500 focus:outline-none"
  />
</label>
```

Guard both buttons with `disabled={!collab.identity?.trim()}` (the Join button keeps its existing code-length condition too), and thread `onSetIdentity` from `RoutePanel`'s props down to `CollabSection`. In `DungeonPage.tsx`, pass `onSetIdentity={setIdentity}`.

- [ ] **Step 5: Run to verify it passes**

```bash
npm test src/components/route/RoutePanel.test.tsx
npm run typecheck
```

Expected: PASS and a clean typecheck.

- [ ] **Step 6: Commit**

```bash
git add src/components/route/RoutePanel.tsx src/components/route/RoutePanel.test.tsx src/routes/DungeonPage.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit -m "$(cat <<'EOF'
Ask for a name before opening or joining a session

The field starts empty and both buttons stay shut until it holds something,
so choosing a name is a real step rather than a decoration. Prefilling an
invented one would have everybody accept it without reading, which is the
situation this replaces.

It stays editable inside a session: names get chosen badly the first time.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: The join link

**Files:**
- Modify: `src/components/route/RoutePanel.tsx`
- Modify: `src/routes/DungeonPage.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`
- Test: `src/components/route/RoutePanel.test.tsx`

**Interfaces:**
- Consumes: `roomName` is not needed here; the link carries the bare code
- Produces:
  - `RoutePanel` gains `pendingRoom: string | null`
  - `sessionLink(slug: string, room: string): string` — exported from `RoutePanel.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
describe('sessionLink', () => {
  it('puts the room inside the hash, where a static host can still route it', () => {
    expect(sessionLink('altar-of-fangs', 'ABC123')).toBe(
      `${location.origin}${location.pathname}#/d/altar-of-fangs?room=ABC123`,
    )
  })
})

describe('An invitation carried by a link', () => {
  it('names the room and warns that the local route is set aside', () => {
    renderEn(<RoutePanel {...props({ collab: offline, pendingRoom: 'ABC123' })} />)
    expect(screen.getByText(/ABC123/)).toBeInTheDocument()
    expect(screen.getByText(/set aside/i)).toBeInTheDocument()
  })

  it('joins nothing until the invitation is accepted', () => {
    const onJoinRoom = vi.fn()
    renderEn(<RoutePanel {...props({ collab: offline, pendingRoom: 'ABC123', onJoinRoom })} />)
    expect(onJoinRoom).not.toHaveBeenCalled()
  })

  it('joins as a guest once accepted', async () => {
    const onJoinRoom = vi.fn()
    renderEn(
      <RoutePanel
        {...props({ collab: { ...offline, identity: 'Rwl' }, pendingRoom: 'ABC123', onJoinRoom })}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /join room abc123/i }))
    expect(onJoinRoom).toHaveBeenCalledWith('ABC123', 'guest')
  })

  it('offers a link to copy while a session is open', () => {
    renderEn(<RoutePanel {...props({ collab: { ...connected, room: 'ABC123' } })} />)
    expect(screen.getByRole('button', { name: /copy the link/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test src/components/route/RoutePanel.test.tsx
```

Expected: FAIL — `sessionLink` is not exported.

- [ ] **Step 3: Add the strings**

`en.ts`:

```ts
'collab.copyLink': 'Copy the link',
'collab.invitation': 'Join room {room} — your local route will be set aside.',
'collab.acceptInvitation': 'Join room {room}',
'route.linkCopied': 'Session link copied.',
```

`fr.ts`:

```ts
'collab.copyLink': 'Copier le lien',
'collab.invitation': 'Rejoindre le salon {room} — ta route locale sera mise de côté.',
'collab.acceptInvitation': 'Rejoindre le salon {room}',
'route.linkCopied': 'Lien de session copié.',
```

- [ ] **Step 4: Write the minimal implementation**

In `RoutePanel.tsx`:

```tsx
/**
 * A link that carries the room.
 *
 * The build is served statically under a hash router, so the room has to live inside the
 * hash. `location.pathname` already carries whatever prefix the host adds — nothing about
 * the deployment is repeated here.
 */
export function sessionLink(slug: string, room: string): string {
  return `${location.origin}${location.pathname}#/d/${slug}?room=${room}`
}
```

Beside the existing **Copy the code** button in the connected branch:

```tsx
<button
  onClick={async () => {
    await navigator.clipboard.writeText(sessionLink(slug, collab.room ?? ''))
    onMessage({ kind: 'ok', text: t('route.linkCopied') })
  }}
  className="flex-1 rounded border border-ink-700 px-2 py-1 text-xs text-ink-300 hover:border-gold-500 hover:text-gold-400"
>
  {t('collab.copyLink')}
</button>
```

At the top of the offline branch, before the **Open a session** button:

```tsx
{pendingRoom && (
  <div className="mb-3 rounded border border-gold-500/40 bg-gold-500/5 p-2">
    <p className="text-[11px] text-ink-300">{t('collab.invitation', { room: pendingRoom })}</p>
    <button
      onClick={() => onJoinRoom(pendingRoom, 'guest')}
      disabled={!collab.identity?.trim()}
      className="mt-2 w-full rounded border border-gold-500/60 bg-gold-500/10 px-2 py-1.5 text-xs font-semibold text-gold-400 hover:bg-gold-500/20 disabled:opacity-40"
    >
      {t('collab.acceptInvitation', { room: pendingRoom })}
    </button>
  </div>
)}
```

`CollabSection` needs `slug` and `pendingRoom` passed down from `RoutePanel`.

In `DungeonPage.tsx`:

```tsx
const [searchParams] = useSearchParams()
const pendingRoom = searchParams.get('room')
```

Add `useSearchParams` to the `react-router-dom` import, start the mode on the route panel when an invitation is present — `useState<Mode>(pendingRoom ? 'route' : 'codex')` — and pass `pendingRoom` to `RoutePanel`.

- [ ] **Step 5: Run to verify it passes**

```bash
npm test src/components/route/RoutePanel.test.tsx
npm test src/routes/DungeonPage.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/route/RoutePanel.tsx src/components/route/RoutePanel.test.tsx src/routes/DungeonPage.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit -m "$(cat <<'EOF'
Invite people with a link, not only a code read aloud

The room travels inside the hash, which is the only part of the URL a
statically served build controls, and the path prefix comes from the page
itself rather than being repeated in the source.

An invitation is shown, not obeyed. It names the room and says plainly that
the local route will be set aside, and nothing connects until it is
accepted — a link arriving in a chat window should not be able to move
somebody's work by being clicked.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: The map reports where the pointer is

**Files:**
- Modify: `src/components/map/DungeonMap.tsx`
- Test: `src/components/map/DungeonMap.test.tsx`

**Interfaces:**
- Consumes: `toMapPoint` from Task 3
- Produces: `DungeonMap` gains the prop `onCursorMove?: (p: Point | null) => void`

- [ ] **Step 1: Write the failing tests**

```ts
describe('Reporting the pointer', () => {
  it('reports a move in map coordinates, not screen pixels', () => {
    const moves: (Point | null)[] = []
    const { container } = renderEn(
      <DungeonMap slug={SLUG} lookup={lookup} onCursorMove={(p) => moves.push(p)} />,
    )
    const surface = container.querySelector('.map-surface')!
    fireEvent.pointerMove(surface, { clientX: 200, clientY: 150, pointerId: 1 })

    // jsdom lays everything out at zero, so the container's rect is the origin and the
    // transform is the whole of the arithmetic under test.
    expect(moves.at(-1)).not.toBeNull()
    expect(moves.at(-1)).toHaveProperty('x')
  })

  it('reports nothing once the pointer has left', () => {
    const moves: (Point | null)[] = []
    const { container } = renderEn(
      <DungeonMap slug={SLUG} lookup={lookup} onCursorMove={(p) => moves.push(p)} />,
    )
    const surface = container.querySelector('.map-surface')!
    fireEvent.pointerMove(surface, { clientX: 200, clientY: 150, pointerId: 1 })
    fireEvent.pointerLeave(surface)
    expect(moves.at(-1)).toBeNull()
  })

  it('says nothing at all when nobody is listening', () => {
    const { container } = renderEn(<DungeonMap slug={SLUG} lookup={lookup} />)
    const surface = container.querySelector('.map-surface')!
    expect(() => fireEvent.pointerMove(surface, { clientX: 5, clientY: 5, pointerId: 1 })).not.toThrow()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test src/components/map/DungeonMap.test.tsx
```

Expected: FAIL — nothing is pushed into `moves`.

- [ ] **Step 3: Write the minimal implementation**

Add `onCursorMove?: (p: Point | null) => void` to `Props` and to the destructured parameters.

Inside `onPointerMove`, before the existing drag handling:

```ts
const el = e.currentTarget as HTMLElement
const rect = el.getBoundingClientRect()
onCursorMove?.(toMapPoint(transform, { x: e.clientX - rect.left, y: e.clientY - rect.top }))
```

Note the early `if (!d) return` currently at the top of `onPointerMove` — the cursor report must come **before** it, or nothing would ever be reported except while dragging.

Add to the container element:

```tsx
onPointerLeave={() => onCursorMove?.(null)}
```

Import `toMapPoint` from `./viewport`.

- [ ] **Step 4: Run to verify it passes**

```bash
npm test src/components/map/DungeonMap.test.tsx
```

Expected: PASS, including the panning tests already in the file.

- [ ] **Step 5: Commit**

```bash
git add src/components/map/DungeonMap.tsx src/components/map/DungeonMap.test.tsx
git commit -m "$(cat <<'EOF'
Report the pointer's position in the map's own coordinates

Converting at the source rather than at the destination means the map's
transform never has to travel with the point, and two people at different
zoom levels are talking about the same place on the floor.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Drawing everyone's cursor

**Files:**
- Create: `src/components/map/PeerCursors.tsx`
- Modify: `src/components/map/DungeonMap.tsx`
- Modify: `src/routes/DungeonPage.tsx`
- Test: `src/components/map/DungeonMap.test.tsx`

**Interfaces:**
- Consumes: `Peer` from Task 2, `toContainerPoint` from Task 3, `setCursor` from Task 6
- Produces: `DungeonMap` gains `cursors?: Peer[]`; `PeerCursors` takes `{ peers: Peer[]; transform: Transform }`

- [ ] **Step 1: Write the failing tests**

```ts
describe('Peer cursors', () => {
  const peer = (over: Partial<Peer> = {}): Peer => ({
    clientId: 7,
    name: 'Alice',
    color: 'hsl(200 70% 62%)',
    cursor: { x: 100, y: 200 },
    isSelf: false,
    ...over,
  })

  it('names the person behind the arrow', () => {
    renderEn(<DungeonMap slug={SLUG} lookup={lookup} cursors={[peer()]} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('draws nobody who has not moved yet', () => {
    renderEn(<DungeonMap slug={SLUG} lookup={lookup} cursors={[peer({ cursor: undefined })]} />)
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('does not draw a second arrow under your own mouse', () => {
    renderEn(<DungeonMap slug={SLUG} lookup={lookup} cursors={[peer({ name: 'Me', isSelf: true })]} />)
    expect(screen.queryByText('Me')).not.toBeInTheDocument()
  })

  it('draws someone who has arrived without announcing a name', () => {
    const { container } = renderEn(
      <DungeonMap slug={SLUG} lookup={lookup} cursors={[peer({ name: '' })]} />,
    )
    expect(container.querySelectorAll('[data-peer-cursor]')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test src/components/map/DungeonMap.test.tsx
```

Expected: FAIL — `Alice` is not in the document.

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/map/PeerCursors.tsx`:

```tsx
// ABOUTME: Draws one arrow and one name per participant, over the map.
// ABOUTME: Outside the transformed layer, so a cursor keeps its size at every zoom level.

import type { Peer } from '../../lib/collab/presence'
import { toContainerPoint, type Transform } from './viewport'

/**
 * The cursors of everyone else in the room.
 *
 * This layer sits over the transformed map rather than inside it. Inside, every arrow would
 * have to be counter-divided by the scale and its label re-rasterised at each zoom notch;
 * outside, a cursor is a translation and its constant on-screen size follows on its own.
 * Anyone looking elsewhere is clipped by the container, which is the right answer: an arrow
 * pinned to the edge would claim a position its owner is not at.
 */
export default function PeerCursors({ peers, transform }: { peers: Peer[]; transform: Transform }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {peers
        .filter((p) => !p.isSelf && p.cursor)
        .map((p) => {
          const at = toContainerPoint(transform, p.cursor!)
          return (
            <div
              key={p.clientId}
              data-peer-cursor={p.clientId}
              className="absolute top-0 left-0 flex items-start gap-1"
              style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
            >
              <svg width="14" height="20" viewBox="0 0 14 20" aria-hidden="true">
                <path d="M1 1 L1 16 L5 12.5 L7.5 18 L10 17 L7.5 11.5 L12.5 11 Z" fill={p.color} stroke="#0b0d12" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              {p.name && (
                <span
                  className="rounded px-1 py-0.5 text-[10px] font-semibold whitespace-nowrap text-ink-950"
                  style={{ background: p.color }}
                >
                  {p.name}
                </span>
              )}
            </div>
          )
        })}
    </div>
  )
}
```

In `DungeonMap.tsx`, add `cursors?: Peer[]` to `Props`, and render beside `MapHud`:

```tsx
{cursors && <PeerCursors peers={cursors} transform={transform} />}
```

In `DungeonPage.tsx`, pass to `DungeonMap`:

```tsx
cursors={collab.status === 'off' ? undefined : collab.peers}
onCursorMove={collab.status === 'off' ? undefined : setCursor}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test src/components/map/DungeonMap.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Verify by hand, with two browsers**

```bash
npx -y y-websocket@2.1.0
```

With `.env.local` set to `ws://localhost:1234`, open the app in two different browsers (not two tabs of one — tabs of one origin sync over `BroadcastChannel` and would prove nothing about the relay). Open a session in the first, copy the link, open it in the second, and move the mouse in each. Both arrows should appear, named, and stay on the same mob when either browser zooms.

- [ ] **Step 6: Commit**

```bash
git add src/components/map/PeerCursors.tsx src/components/map/DungeonMap.tsx src/components/map/DungeonMap.test.tsx src/routes/DungeonPage.tsx
git commit -m "$(cat <<'EOF'
Show where everyone else is looking

The layer sits over the transformed map rather than inside it. Inside,
every arrow would need counter-scaling and its label re-rasterising at each
zoom notch; outside, a cursor is a translation and a constant on-screen
size follows without arithmetic.

Your own cursor is left undrawn: you already have one, and a second arrow
under the real one is only a lag meter.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Saying so when the relay does not answer

**Files:**
- Create: `src/components/map/RelayNotice.tsx`
- Modify: `src/components/map/DungeonMap.tsx`
- Modify: `src/components/route/RoutePanel.tsx`
- Modify: `src/routes/DungeonPage.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`
- Test: `src/components/map/RelayNotice.test.tsx` *(new)*, `src/components/route/RoutePanel.test.tsx`

**Interfaces:**
- Consumes: `collab.synced` from Task 6
- Produces: `RelayNotice` takes `{ stalled: boolean; onLeave: () => void }`; `DungeonMap` gains `notice?: ReactNode`

- [ ] **Step 1: Write the failing tests**

Create `src/components/map/RelayNotice.test.tsx`:

```tsx
// ABOUTME: Tests the notice shown when a session never receives the room it joined.
// ABOUTME: Time is faked, since the whole point of the component is a delay.

// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act, afterEach, describe, expect, it, vi } from 'vitest'
import RelayNotice from './RelayNotice'
import { renderEn } from '../../test/render'

afterEach(cleanup)

describe('RelayNotice', () => {
  it('says nothing during the first seconds, when a slow relay is merely slow', () => {
    vi.useFakeTimers()
    try {
      renderEn(<RelayNotice stalled onLeave={() => {}} />)
      act(() => void vi.advanceTimersByTime(4000))
      expect(screen.queryByText(/not answering/i)).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('speaks up once the wait is no longer plausible', () => {
    vi.useFakeTimers()
    try {
      renderEn(<RelayNotice stalled onLeave={() => {}} />)
      act(() => void vi.advanceTimersByTime(5000))
      expect(screen.getByText(/not answering/i)).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('says nothing at all while the session is healthy', () => {
    vi.useFakeTimers()
    try {
      renderEn(<RelayNotice stalled={false} onLeave={() => {}} />)
      act(() => void vi.advanceTimersByTime(20000))
      expect(screen.queryByText(/not answering/i)).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('offers the way out, and it is the only way out', async () => {
    const onLeave = vi.fn()
    vi.useFakeTimers()
    try {
      renderEn(<RelayNotice stalled onLeave={onLeave} />)
      act(() => void vi.advanceTimersByTime(5000))
    } finally {
      vi.useRealTimers()
    }
    await userEvent.click(screen.getByRole('button', { name: /leave/i }))
    expect(onLeave).toHaveBeenCalled()
  })
})
```

And in `RoutePanel.test.tsx`:

```ts
it('says the room’s route is on its way rather than showing an empty one', () => {
  renderEn(<RoutePanel {...props({ collab: { ...connected, synced: false } })} />)
  expect(screen.getByText(/fetching the room/i)).toBeInTheDocument()
})

it('shows the route once it has arrived', () => {
  renderEn(<RoutePanel {...props({ collab: { ...connected, synced: true } })} />)
  expect(screen.queryByText(/fetching the room/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test src/components/map/RelayNotice.test.tsx
```

Expected: FAIL — the module does not exist.

- [ ] **Step 3: Add the strings**

`en.ts`:

```ts
'collab.relayStalled': 'The relay is not answering. Your local route is safe.',
'collab.awaitingRoom': 'Fetching the room’s route…',
```

`fr.ts`:

```ts
'collab.relayStalled': 'Le relais ne répond pas. Ta route locale est intacte.',
'collab.awaitingRoom': 'Récupération de la route du salon…',
```

- [ ] **Step 4: Write the minimal implementation**

Create `src/components/map/RelayNotice.tsx`:

```tsx
// ABOUTME: The notice shown when a session has joined a room that never answers.
// ABOUTME: Waits before speaking, so an ordinary handshake is never mistaken for a failure.

import { useEffect, useState } from 'react'
import { useI18n } from '../../lib/i18n/context'

/**
 * Five seconds before saying anything.
 *
 * A healthy relay converges in under half a second, measured. Ten times that will not fire
 * out of nervousness, and anything longer than it is no longer a handshake.
 */
const GRACE_MS = 5000

export default function RelayNotice({ stalled, onLeave }: { stalled: boolean; onLeave: () => void }) {
  const { t } = useI18n()
  const [speak, setSpeak] = useState(false)

  useEffect(() => {
    if (!stalled) {
      setSpeak(false)
      return
    }
    // The clock restarts whenever a session falls out of sync, so a relay that dies mid-route
    // gets the same grace as one that never answered.
    const timer = setTimeout(() => setSpeak(true), GRACE_MS)
    return () => clearTimeout(timer)
  }, [stalled])

  if (!speak) return null

  return (
    <div className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded border border-threat-lethal/50 bg-ink-900/95 px-3 py-2 text-xs shadow-lg">
      <span className="text-threat-lethal">⚠ {t('collab.relayStalled')}</span>
      <button
        onClick={onLeave}
        className="rounded border border-ink-700 px-2 py-0.5 text-ink-300 hover:border-gold-500 hover:text-gold-400"
      >
        {t('collab.leave')}
      </button>
    </div>
  )
}
```

In `DungeonMap.tsx`, add `notice?: ReactNode` to `Props` and render `{notice}` beside `MapHud`. Top centre is the one free corner: `MapHud` holds `right-3 bottom-3`, the legend `top-3 right-3`, the hover tooltip `top-3 left-3`.

In `DungeonPage.tsx`:

```tsx
notice={
  collab.status === 'off' ? undefined : (
    <RelayNotice stalled={!collab.synced} onLeave={leaveRoom} />
  )
}
```

In `RoutePanel.tsx`, above the pull list:

```tsx
{collab.status !== 'off' && !collab.synced && !hasRoute && (
  <p className="rounded border border-ink-700 bg-ink-850 px-3 py-2 text-xs text-ink-400">
    {t('collab.awaitingRoom')}
  </p>
)}
```

with `const hasRoute = route.pulls.some((p) => p.clones.length > 0)`. Gating on an empty route as well as on `synced` is what keeps a host — whose document is already the room's — from being told its own route is on its way.

- [ ] **Step 5: Run to verify it passes**

```bash
npm test src/components/map/RelayNotice.test.tsx
npm test src/components/route/RoutePanel.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Verify by hand that a dead relay says so**

Start the app **without** the relay running (or stop it mid-session), open a session, and wait. The notice must appear after five seconds, and its Leave button must give the local route back.

- [ ] **Step 7: Commit**

```bash
git add src/components/map/RelayNotice.tsx src/components/map/RelayNotice.test.tsx src/components/map/DungeonMap.tsx src/components/route/RoutePanel.tsx src/components/route/RoutePanel.test.tsx src/routes/DungeonPage.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit -m "$(cat <<'EOF'
Say when the relay is not answering instead of waiting silently

A session that joins a room it never receives showed an empty route under a
"connecting" label, and nothing distinguished an empty room from one that
had not arrived. That is exactly what the decommissioning of the public
relay looked like from a user's chair.

The wait is now named while it lasts, and after five seconds — ten times a
healthy handshake — it is called what it is, with the way out attached. The
notice sits top centre because every other corner of the map is spoken for.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Tell the reader what changed

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above
- Produces: nothing

- [ ] **Step 1: Read the section**

```bash
grep -n "Editing together" -A 30 README.md
```

- [ ] **Step 2: Rewrite it**

The section must now say: a name is asked for before opening or joining; a session can be shared as a link as well as a code; everyone's cursor is visible on the map; joining sets your local route aside and leaving gives it back; and the relay is configured with `VITE_COLLAB_URL`, with `npx -y y-websocket@2.1.0` as the way to run one locally. Do **not** describe the default URL as working — it is a decommissioned host, and that decision is still open.

- [ ] **Step 3: Verify nothing else drifted**

```bash
npm test
npm run typecheck
npm run build
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
Describe the session as it now behaves

Naming yourself, the link, the cursors, and the promise that joining a room
borrows your seat rather than taking your work.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

**Spec coverage.** Feature 1 → Tasks 4 and 7. Feature 2 → Tasks 2, 3, 6, 9, 10. Feature 3 → Task 8. Repair 4 → Task 5. Repair 5 → Tasks 6 and 11. The test plan's five files → Tasks 2, 3, 4–6, 9–10, 7–8–11. The i18n rule → strings added in the task that needs them. The two follow-ups (hosting, end-to-end harness) are deliberately absent: they are separate subjects with separate designs.

**Type consistency.** `Peer` is defined once, in Task 2, and used unchanged in Tasks 4, 10. `CollabState.peers: Peer[]` and `CollabState.identity: string | null` change in Task 4, before any consumer relies on them. `CollabState.synced` arrives in Task 6, before Task 11 reads it. `toMapPoint` / `toContainerPoint` are named identically in Tasks 3, 9, 10. `setIdentity`, `setCursor`, `onCursorMove`, `onSetIdentity`, `pendingRoom`, `cursors`, `notice`, `sessionLink` each appear with one spelling throughout.

**Ordering.** Every task depends only on tasks before it. Task 1 comes first because every later task reads a test count.
