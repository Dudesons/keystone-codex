# Hosting the relay — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** the deployed site's collaboration works against a relay we own, on Cloudflare's free
plan, and a forgotten tab stops costing anything after five minutes.

**Architecture:** a Worker routes each websocket upgrade to one Durable Object per room, which
holds a `Y.Doc` and an `Awareness` and rebroadcasts what it receives. It stores nothing: the
participants are the durable copies. The client stops being a cost by pausing itself when the tab
goes idle, and offers one button to come back.

**Tech Stack:** Cloudflare Workers, Durable Objects (SQLite-backed), `wrangler@4.123.0`,
`@cloudflare/vitest-pool-workers@0.12.21`, and the `yjs@13.6.32` / `y-protocols@1.0.7` /
`lib0@0.2.117` already in `node_modules`. Vitest 3.2.7, React 19.

**Spec:** [`docs/plans/2026-08-17-relay-hosting-design.md`](2026-08-17-relay-hosting-design.md)

## Global Constraints

- **English** for code, comments, commit messages and documentation. Interface text is never
  literal: it goes through `t()` with a key added to **both** `src/lib/i18n/en.ts` and
  `src/lib/i18n/fr.ts`.
- `fr.ts` is typed against `en.ts`, so `tsc -b` is the completeness check. **Do not** write a test
  comparing key sets.
- **No test may touch the network** or need a WoW installation. CI has neither.
- **Another session holds ~260 dirty files** in `content/**`, `src/lib/content.ts`,
  `src/components/codex/MobCard.tsx`, and uncommitted hunks inside
  `src/components/route/RoutePanel.tsx` and `RoutePanel.test.tsx`. **Never `git add -A`, never
  `git commit -a`.** Stage exactly the paths each task names. To commit only your own hunks in a
  file another session is editing: `git show HEAD:<file> > tmp`, apply your edits to `tmp`,
  `SHA=$(git hash-object -w tmp)`, `git update-index --cacheinfo 100644,$SHA,<file>`, check with
  `git diff --cached -- <file>`. The working tree is never touched.
- **Never `--no-verify`**, `--no-hooks` or `--no-pre-commit-hook`.
- `@cloudflare/vitest-pool-workers` is pinned to **exactly `0.12.21`**. From `0.13.0` it requires
  Vitest 4 and this repository runs 3.2.7.
- **`npm test` must be green at the end of every task.** The baseline before this work is **612
  tests across 24 files**. If it ever reports roughly double, the `.claude/**` exclusion has been
  lost.
- Component and hook tests carry `// @vitest-environment jsdom` at the top of the file and declare
  their own `afterEach(cleanup)`; Testing Library runs without `globals: true`.
- Mount components through `src/test/render.tsx` (`renderEn` / `renderFr`), never bare `render`.
- `node` and `npm` may not be on the shell's PATH. Prefix with
  `export PATH="/c/Program Files/nodejs:$PATH"`.

## File structure

| Path | Responsibility | Task |
| --- | --- | --- |
| `relay/wrangler.toml` | Worker name, the `ROOM` binding, the SQLite migration | 1 |
| `relay/src/index.js` | the Worker (routing, origin check) and the `Room` durable object | 1–4 |
| `relay/vitest.config.ts` | the `relay` Vitest project, running in workerd | 1 |
| `relay/test/client.ts` | a minimal y-websocket client, so tests exercise the real protocol | 2 |
| `relay/test/relay.test.ts` | the relay's tests | 1–4 |
| `vite.config.ts` | gains `test.projects`: the existing suite plus `relay` | 1 |
| `src/lib/mdt/useRouteDoc.ts` | the default URL, `'paused'`, the idle clock, `resumeRoom` | 5, 6 |
| `src/components/route/RoutePanel.tsx` | the paused label and the way back | 7 |
| `src/routes/DungeonPage.tsx` | wires `resumeRoom`, and keeps the notice quiet on a pause | 7, 8 |
| `src/lib/i18n/{en,fr}.ts` | two new keys | 7 |
| `.github/workflows/relay.yml` | manual deployment of the relay | 9 |
| `CLAUDE.md`, `README.md`, the collaborative-session design | corrections | 10 |

**Before Task 1.** `relay/` already exists in the working tree, untracked: it is the spike's code,
written before its tests. Per this repository's TDD rule, code that precedes its test is deleted
rather than adapted — **delete `relay/src/index.js`** and rebuild it test-first. Keep
`relay/wrangler.toml`; Task 1 checks its contents. The dev dependencies are already installed
(`wrangler@4.123.0`, `@cloudflare/vitest-pool-workers@0.12.21`) and `package.json` /
`package-lock.json` are modified but uncommitted; Task 1 commits them.

---

### Task 1: A second Vitest project, running in workerd

The riskiest step first: if the pool cannot coexist with the existing configuration, everything
else waits on that answer.

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`, `package-lock.json` (already changed; commit them here)
- Create: `relay/vitest.config.ts`
- Create: `relay/src/index.js`
- Verify: `relay/wrangler.toml`
- Test: `relay/test/relay.test.ts`

**Interfaces:**
- Produces: a Vitest project named `relay`, runnable with `npm test -- --project relay`; a Worker
  whose default export has a `fetch(request, env)`; a `Room` class exported from
  `relay/src/index.js` and bound as `ROOM`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test**

`relay/test/relay.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- --project relay`
Expected: FAIL — no project named `relay` exists yet, so Vitest reports no matching project.

- [ ] **Step 3: Check the wrangler configuration**

`relay/wrangler.toml` must read exactly:

```toml
name = "keystone-relay"
main = "src/index.js"
compatibility_date = "2026-08-11"

[[durable_objects.bindings]]
name = "ROOM"
class_name = "Room"

# SQLite-backed, which is the only storage the Workers free plan creates.
[[migrations]]
tag = "v1"
new_sqlite_classes = ["Room"]
```

- [ ] **Step 4: Write the minimal Worker**

`relay/src/index.js` — only what Step 1 asserts. The `Room` class must exist because the binding
names it, but it stays empty until Task 2.

```js
// ABOUTME: A Yjs relay on Cloudflare: one Durable Object per room, holding the document.
// ABOUTME: It stores nothing — the participants are the durable copies of their own route.

export class Room {}

export default {
  async fetch(request, env) {
    return new Response('keystone relay', { status: 200 })
  },
}
```

`env` is unused for now; Task 2 uses it. If the linter objects, leave the parameter — the signature
is the contract.

- [ ] **Step 5: Declare the project**

`relay/vitest.config.ts`:

```ts
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
```

- [ ] **Step 6: Add the project list to the root configuration**

In `vite.config.ts`, replace the `test` block with:

```ts
  test: {
    projects: [
      {
        // The application suite, unchanged: node by default, jsdom where a file asks for it.
        extends: true,
        test: {
          name: 'app',
          // A git worktree may sit under .claude/; its copies of every test file would
          // otherwise run beside the real ones, against a frozen checkout. `relay/` is
          // excluded here because it belongs to the project below, which runs in workerd.
          exclude: [...configDefaults.exclude, '.claude/**', 'relay/**'],
        },
      },
      './relay/vitest.config.ts',
    ],
  },
```

If `test.projects` is rejected by Vitest 3.2.7, the fallback is a `vitest.workspace.ts` at the
root listing `'.'` and `'./relay'`; keep the exclusion in whichever file ends up owning the app
project, and say in the commit body which mechanism was used.

- [ ] **Step 7: Run both projects**

Run: `npm test`
Expected: PASS. The `app` project reports **612 tests across 24 files** — the same as before — and
`relay` reports 1. Any change to the app count is a regression in this task, not a coincidence.

Run: `npm run typecheck`
Expected: PASS. `relay/src/index.js` is JavaScript and outside `tsc`'s reach;
`relay/vitest.config.ts` is TypeScript, so if `tsc -b` picks it up and fails on the pool's types,
add `relay` to the `exclude` of the tsconfig that claims it rather than loosening any compiler
option.

- [ ] **Step 8: Commit**

```bash
git add vite.config.ts package.json package-lock.json relay/wrangler.toml relay/src/index.js relay/vitest.config.ts relay/test/relay.test.ts
git commit -m "Run the relay's tests in workerd, beside the application suite"
```

Body: why the pool is pinned to 0.12.21, and why the relay needs its own project rather than an
environment pragma.

---

### Task 2: The Room carries a document between two clients

**Files:**
- Modify: `relay/src/index.js`
- Create: `relay/test/client.ts`
- Test: `relay/test/relay.test.ts`

**Interfaces:**
- Consumes: the `relay` project and the `ROOM` binding from Task 1.
- Produces: `connect(room: string): Promise<Client>` and `until(test, what, ms?)` from
  `relay/test/client.ts`, used by Tasks 3 and 4. `Client` is
  `{ doc: Y.Doc; awareness: Awareness; socket: WebSocket; close(): void }`.

- [ ] **Step 1: Write the test client**

`relay/test/client.ts` — a client that speaks the protocol by hand, so the tests exercise the
relay rather than `y-websocket`'s client, which has its own tests elsewhere.

```ts
// ABOUTME: A minimal y-websocket client, used to drive the relay from inside workerd.
// ABOUTME: Hand-written on purpose: what is under test is the relay's half of the protocol.

import { SELF } from 'cloudflare:test'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

export interface Client {
  doc: Y.Doc
  awareness: awarenessProtocol.Awareness
  socket: WebSocket
  close(): void
}

/** Opens a socket on `room` and wires just enough protocol to sync and to be present. */
export async function connect(room: string): Promise<Client> {
  const response = await SELF.fetch(`https://relay.test/${room}`, {
    headers: { Upgrade: 'websocket', Origin: 'http://localhost:5173' },
  })
  const socket = response.webSocket
  if (!socket) throw new Error(`no websocket in the response (status ${response.status})`)
  socket.accept()
  socket.binaryType = 'arraybuffer'

  const doc = new Y.Doc()
  const awareness = new awarenessProtocol.Awareness(doc)

  socket.addEventListener('message', (event) => {
    if (!(event.data instanceof ArrayBuffer)) {
      throw new Error(`expected bytes, got ${event.data?.constructor?.name}`)
    }
    const decoder = decoding.createDecoder(new Uint8Array(event.data))
    const encoder = encoding.createEncoder()
    switch (decoding.readVarUint(decoder)) {
      case MESSAGE_SYNC: {
        encoding.writeVarUint(encoder, MESSAGE_SYNC)
        syncProtocol.readSyncMessage(decoder, encoder, doc, socket)
        // A bare message type and nothing after it means there was nothing to answer.
        if (encoding.length(encoder) > 1) socket.send(encoding.toUint8Array(encoder))
        break
      }
      case MESSAGE_AWARENESS:
        awarenessProtocol.applyAwarenessUpdate(
          awareness,
          decoding.readVarUint8Array(decoder),
          socket,
        )
        break
    }
  })

  // `origin === socket` marks what arrived from the relay: echoing it back would loop.
  doc.on('update', (update, origin) => {
    if (origin === socket) return
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeUpdate(encoder, update)
    socket.send(encoding.toUint8Array(encoder))
  })

  awareness.on('update', ({ added, updated, removed }: Record<string, number[]>, origin: unknown) => {
    if (origin === socket) return
    const changed = added.concat(updated, removed)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changed),
    )
    socket.send(encoding.toUint8Array(encoder))
  })

  return { doc, awareness, socket, close: () => socket.close() }
}

/** Waits for something the relay has to bring about, and names it when it never happens. */
export async function until(test: () => boolean, what: string, ms = 2000): Promise<void> {
  const started = Date.now()
  while (!test()) {
    if (Date.now() - started > ms) throw new Error(`timed out waiting for ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}
```

- [ ] **Step 2: Write the failing test**

Append to `relay/test/relay.test.ts`:

```ts
import { connect, until } from './client'

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
```

The second test's fixed wait is deliberate: proving something does **not** arrive cannot be done
by polling for it.

- [ ] **Step 3: Run it and watch it fail**

Run: `npm test -- --project relay`
Expected: FAIL on the first test — `no websocket in the response (status 200)`, because the Worker
does not upgrade anything yet.

- [ ] **Step 4: Implement routing and the document half of the Room**

Replace `relay/src/index.js` with:

```js
// ABOUTME: A Yjs relay on Cloudflare: one Durable Object per room, holding the document.
// ABOUTME: It stores nothing — the participants are the durable copies of their own route.

/**
 * Written here rather than taken off the shelf.
 *
 * `y-protocols` and `lib0` are already dependencies of the client's `y-websocket`, so both ends
 * of the wire agree on the protocol at one version, by construction. The published ports of
 * y-websocket to Workers were written against neither this client nor this runtime, and the
 * scoped `@y/websocket-server` crashes against a classic `yjs` with `store.getClock is not a
 * function`.
 *
 * Nothing is persisted and the object never hibernates. Yjs is a CRDT and every participant
 * holds the whole document, the host's copy sitting in `localStorage` besides: a relay that
 * stores nothing cannot serve anything stale, and a Durable Object with no connections is
 * unloaded, so an empty room simply stops existing. Hibernation is the lever if the free quota
 * ever complains, and it is not free — the document would have to be persisted and reloaded
 * around every frame.
 */

import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

export class Room {
  constructor() {
    this.doc = new Y.Doc()
    /** Every open socket. A room is nothing but its participants. */
    this.sockets = new Set()

    this.doc.on('update', (update, origin) => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_SYNC)
      syncProtocol.writeUpdate(encoder, update)
      this.broadcast(encoding.toUint8Array(encoder), origin)
    })
  }

  broadcast(data, except) {
    for (const socket of this.sockets) {
      if (socket === except) continue
      try {
        socket.send(data)
      } catch {
        this.drop(socket)
      }
    }
  }

  drop(socket) {
    this.sockets.delete(socket)
  }

  async fetch() {
    const { 0: client, 1: server } = new WebSocketPair()
    server.accept()
    // Without this, workerd hands binary frames over as a Blob, and Yjs speaks bytes.
    server.binaryType = 'arraybuffer'
    this.sockets.add(server)

    const sync = encoding.createEncoder()
    encoding.writeVarUint(sync, MESSAGE_SYNC)
    syncProtocol.writeSyncStep1(sync, this.doc)
    server.send(encoding.toUint8Array(sync))

    server.addEventListener('message', (event) => {
      const decoder = decoding.createDecoder(new Uint8Array(event.data))
      const encoder = encoding.createEncoder()
      switch (decoding.readVarUint(decoder)) {
        case MESSAGE_SYNC:
          encoding.writeVarUint(encoder, MESSAGE_SYNC)
          syncProtocol.readSyncMessage(decoder, encoder, this.doc, server)
          // A bare message type and nothing after it means there was nothing to answer.
          if (encoding.length(encoder) > 1) server.send(encoding.toUint8Array(encoder))
          break
      }
    })

    server.addEventListener('close', () => this.drop(server))
    server.addEventListener('error', () => this.drop(server))

    return new Response(null, { status: 101, webSocket: client })
  }
}

export default {
  async fetch(request, env) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('keystone relay', { status: 200 })
    }
    // The client appends the room name to the URL, and rooms are namespaced by dungeon.
    const room = decodeURIComponent(new URL(request.url).pathname.slice(1)) || 'default'
    return env.ROOM.get(env.ROOM.idFromName(room)).fetch(request)
  },
}
```

`MESSAGE_AWARENESS` is imported and unused until Task 3; leave the constant, it is half the
protocol's vocabulary.

- [ ] **Step 5: Run the tests**

Run: `npm test -- --project relay`
Expected: PASS, 3 tests.

Run: `npm test`
Expected: PASS, `app` still 612.

- [ ] **Step 6: Commit**

```bash
git add relay/src/index.js relay/test/client.ts relay/test/relay.test.ts
git commit -m "Relay Yjs documents from a durable object, one per room"
```

Body: why the relay is written here rather than taken from a port, and the `binaryType` trap in
one sentence — workerd delivers binary frames as a `Blob` and lib0 raises "Unexpected end of
array" on the first one.

---

### Task 3: Presence crosses, and leaves with its socket

**Files:**
- Modify: `relay/src/index.js`
- Test: `relay/test/relay.test.ts`

**Interfaces:**
- Consumes: `connect`, `until` from Task 2.
- Produces: nothing new; the `Room` gains an `awareness` field and a `controlled` map.

- [ ] **Step 1: Write the failing tests**

Append to `relay/test/relay.test.ts`:

```ts
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
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- --project relay`
Expected: FAIL, both — the relay never forwards awareness, so B only ever knows itself and
`until` times out with "A's presence to reach B".

- [ ] **Step 3: Implement awareness**

In `relay/src/index.js`, in the constructor, after the `doc.on('update', …)` handler:

```js
    this.awareness = new awarenessProtocol.Awareness(this.doc)
    // The relay is not a participant: it holds no cursor of its own.
    this.awareness.setLocalState(null)

    /** Which client ids each socket speaks for, so a departure takes its cursor with it. */
    this.controlled = new Map()

    this.awareness.on('update', ({ added, updated, removed }, origin) => {
      const owned = this.controlled.get(origin)
      if (owned) {
        added.concat(updated).forEach((id) => owned.add(id))
        removed.forEach((id) => owned.delete(id))
      }
      const changed = added.concat(updated, removed)
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed),
      )
      this.broadcast(encoding.toUint8Array(encoder), origin)
    })
```

Replace `drop` with:

```js
  drop(socket) {
    const owned = this.controlled.get(socket)
    if (owned) awarenessProtocol.removeAwarenessStates(this.awareness, [...owned], null)
    this.controlled.delete(socket)
    this.sockets.delete(socket)
  }
```

In `fetch`, after `this.sockets.add(server)`:

```js
    this.controlled.set(server, new Set())
```

and after the sync step 1 send, announce whoever is already here:

```js
    const states = this.awareness.getStates()
    if (states.size > 0) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, [...states.keys()]),
      )
      server.send(encoding.toUint8Array(encoder))
    }
```

and add the awareness branch to the message switch:

```js
        case MESSAGE_AWARENESS:
          awarenessProtocol.applyAwarenessUpdate(
            this.awareness,
            decoding.readVarUint8Array(decoder),
            server,
          )
          break
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- --project relay`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add relay/src/index.js relay/test/relay.test.ts
git commit -m "Carry presence through the relay, and withdraw it with its socket"
```

Body: why each socket has to own its client ids — otherwise a departure leaves a cursor that will
never move again.

---

### Task 4: An origin allowlist, which is not authentication

**Files:**
- Modify: `relay/src/index.js`
- Test: `relay/test/relay.test.ts`

**Interfaces:**
- Consumes: the Worker's `fetch` from Task 2.
- Produces: `ALLOWED_ORIGINS`, internal to the Worker.

- [ ] **Step 1: Write the failing tests**

Append to `relay/test/relay.test.ts`:

```ts
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
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- --project relay`
Expected: FAIL on the last two — both return 101, because nothing is checked yet.

- [ ] **Step 3: Implement the allowlist**

In `relay/src/index.js`, above the default export:

```js
/**
 * Who may open a socket.
 *
 * Not access control on rooms — whoever has the six-letter code still joins, which is the
 * design's intent. This keeps another website from spending our free quota, and browsers always
 * send an `Origin`. A request without one is not a website, and gets nothing.
 *
 * Both development ports appear: 5173 is `npm run dev`, 4173 is `vite preview`, which is what an
 * end-to-end harness serves `dist/` on.
 */
const ALLOWED_ORIGINS = new Set([
  'https://dudesons.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])
```

and at the top of the upgrade branch of `fetch`:

```js
    const origin = request.headers.get('Origin')
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      return new Response('unknown origin', { status: 403 })
    }
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- --project relay`
Expected: PASS, 9 tests. The `connect` helper already sends `http://localhost:5173`, so Tasks 2
and 3 keep passing; if they do not, the helper is the thing to check, not the allowlist.

- [ ] **Step 5: Commit**

```bash
git add relay/src/index.js relay/test/relay.test.ts
git commit -m "Answer only the origins we serve"
```

---

### Task 5: The client points at our relay by default

**Files:**
- Modify: `src/lib/mdt/useRouteDoc.ts` (lines 25–35)

**Interfaces:**
- Consumes: the deployed Worker's URL.
- Produces: `COLLAB_URL` now defaulting to the relay; `VITE_COLLAB_URL` still overrides.

**No test, deliberately.** The change is the value of a constant, and a test asserting a literal
equals a literal proves only that someone typed it twice. What can break here — the app failing to
reach the relay — is what the end-to-end harness is for, and it is the next design. A reviewer
should read this paragraph rather than file a missing-test finding.

- [ ] **Step 1: Replace the constant and its comment**

```ts
/**
 * Where a session meets.
 *
 * WebRTC came first here, because it asked nothing of us but a handshake. Every public
 * y-webrtc signaling server that handshake relied on has since gone dark, and with no
 * signaling two browsers never find each other at all — which left the feature working only
 * between tabs of one browser, over `BroadcastChannel`. A relay is one host to keep alive
 * rather than a rendezvous nobody runs any more, and it reaches through the NAT and the
 * corporate firewall that WebRTC needs a TURN server to cross.
 *
 * The default is our own Worker, `relay/`, on Cloudflare's free plan. It used to be
 * `wss://demos.yjs.dev/ws`, which is not dead — it refused an upgrade one morning and synced a
 * document that afternoon — but flaky is the same as dead for something people rely on. Vite
 * inlines this at build time, so a default in the source is what makes a fresh clone and the
 * deployed site work without anyone remembering a variable; `VITE_COLLAB_URL` overrides it for
 * a local relay and for the end-to-end harness.
 */
const COLLAB_URL = import.meta.env.VITE_COLLAB_URL || 'wss://keystone-relay.damdam-gold.workers.dev'
```

- [ ] **Step 2: Verify nothing regressed**

Run: `npm test` → PASS, `app` 612, `relay` 9.
Run: `npm run typecheck` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mdt/useRouteDoc.ts
git commit -m "Point a session at the relay we run"
```

Body: that the previous default was flaky rather than decommissioned, and why the URL lives in the
source rather than in a deploy-time variable.

---

### Task 6: A session pauses itself when nobody is there

**Files:**
- Modify: `src/lib/mdt/useRouteDoc.ts`
- Test: `src/lib/mdt/useRouteDoc.test.tsx`

**Interfaces:**
- Consumes: `sessionRef`, `setCollab`, the `update` callback inside `joinRoom`.
- Produces: `CollabStatus` gains `'paused'`; the hook returns `resumeRoom: () => void` alongside
  `joinRoom` and `leaveRoom`.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/mdt/useRouteDoc.test.tsx` (check the file already carries
`// @vitest-environment jsdom`; it renders a hook, so it must). Room codes must stay unique across
`describe` blocks in this file — the provider's `BroadcastChannel` does not leave synchronously on
`destroy()`.

```ts
/** jsdom reports a visibility, but does not let a page change it. */
const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('An idle session pauses itself', () => {
  afterEach(() => {
    setVisibility('visible')
    vi.useRealTimers()
  })

  it('pauses five minutes after the tab is hidden', () => {
    vi.useFakeTimers()
    const { result } = mount()
    act(() => result.current.joinRoom('PAUSE1', 'host'))
    expect(result.current.collab.status).not.toBe('paused')

    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(5 * 60_000))
    expect(result.current.collab.status).toBe('paused')
  })

  it('does not pause a hidden tab before those five minutes are up', () => {
    vi.useFakeTimers()
    const { result } = mount()
    act(() => result.current.joinRoom('PAUSE2', 'host'))
    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(4 * 60_000))
    expect(result.current.collab.status).not.toBe('paused')
  })

  it('pauses a visible tab nobody has touched for fifteen minutes', () => {
    vi.useFakeTimers()
    const { result } = mount()
    act(() => result.current.joinRoom('PAUSE3', 'host'))
    act(() => void vi.advanceTimersByTime(15 * 60_000))
    expect(result.current.collab.status).toBe('paused')
  })

  it('starts the clock over on any sign of life', () => {
    vi.useFakeTimers()
    const { result } = mount()
    act(() => result.current.joinRoom('PAUSE4', 'host'))
    act(() => void vi.advanceTimersByTime(14 * 60_000))
    act(() => void document.dispatchEvent(new Event('pointermove')))
    act(() => void vi.advanceTimersByTime(14 * 60_000))
    expect(result.current.collab.status).not.toBe('paused')
  })

  it('comes back on request, on a new socket', () => {
    vi.useFakeTimers()
    const { result } = mount()
    act(() => result.current.joinRoom('PAUSE5', 'host'))
    const opened = SilentSocket.instances.length
    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(5 * 60_000))
    expect(result.current.collab.status).toBe('paused')

    act(() => result.current.resumeRoom())
    expect(result.current.collab.status).not.toBe('paused')
    expect(result.current.collab.room).toBe('PAUSE5')
    expect(SilentSocket.instances.length).toBeGreaterThan(opened)
  })

  it('keeps the room and the document, because a pause is not a departure', () => {
    vi.useFakeTimers()
    const { result } = mount()
    act(() => result.current.joinRoom('PAUSE6', 'host'))
    act(() => result.current.actions.setName('Week 12'))
    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(5 * 60_000))
    expect(result.current.collab.room).toBe('PAUSE6')
    expect(result.current.route.name).toBe('Week 12')
  })

  it('leaves a session that was never opened alone', () => {
    vi.useFakeTimers()
    const { result } = mount()
    act(() => setVisibility('hidden'))
    act(() => void vi.advanceTimersByTime(30 * 60_000))
    expect(result.current.collab.status).toBe('off')
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- --project app src/lib/mdt/useRouteDoc.test.tsx`
Expected: FAIL — `result.current.resumeRoom is not a function`, and every pause assertion fails
because the status never leaves `'connecting'`.

- [ ] **Step 3: Widen the status**

```ts
export type CollabStatus = 'off' | 'connecting' | 'connected' | 'paused'
```

and extend the field's own comment in `CollabState`:

```ts
export interface CollabState {
  /**
   * `paused` is a decision, not a failure: the socket was closed because nobody was there.
   * The room and the stash are kept, so `resumeRoom` puts the session back and `leaveRoom`
   * still gives the local route back.
   */
  status: CollabStatus
```

- [ ] **Step 4: Add the constants and the pause**

Beside `CURSOR_INTERVAL_MS`:

```ts
/**
 * How long an unattended session stays on the wire.
 *
 * An open socket keeps the relay's durable object loaded whether or not anyone is looking, and a
 * forgotten tab shows the others a cursor that will never move again — a quota problem and an
 * interface problem with one fix. Hidden is the short clock because a forgotten tab is almost
 * always a background tab or a locked screen; visible-but-untouched is the long one, because
 * somebody reading the map is not gone.
 */
const HIDDEN_PAUSE_MS = 5 * 60_000
const IDLE_PAUSE_MS = 15 * 60_000
```

Inside the hook, after `closeSession`:

```ts
  /**
   * Read by the provider's own listeners, which would otherwise overwrite `paused` with what the
   * socket says: closing one emits a last awareness change, and `wsconnected` is false.
   */
  const pausedRef = useRef(false)

  const pauseSession = useCallback(() => {
    const open = sessionRef.current
    if (!open || pausedRef.current) return
    pausedRef.current = true
    // Disconnect, not destroy: the document, the room and the stash all survive a pause, and
    // `connect()` is what makes the way back one click rather than a rejoin.
    open.provider.disconnect()
    setCollab((c) => ({ ...c, status: 'paused', peers: [], synced: false }))
  }, [])

  const resumeRoom = useCallback(() => {
    const open = sessionRef.current
    if (!open || !pausedRef.current) return
    pausedRef.current = false
    setCollab((c) => ({ ...c, status: 'connecting', synced: false }))
    open.provider.connect()
  }, [])
```

In `joinRoom`, reset the flag next to `closeSession()`:

```ts
      closeSession()
      pausedRef.current = false
```

and make `update` respect it:

```ts
      const update = () =>
        setCollab((c) => ({
          ...c,
          // The socket, not an intention. The previous reading was true as soon as a room
          // existed, so a session whose relay never answered still called itself connected.
          // A pause outranks both: it is why the socket is closed.
          status: pausedRef.current ? 'paused' : provider.wsconnected ? 'connected' : 'connecting',
          synced: provider.synced,
          peers: readPeers(provider.awareness.getStates(), provider.awareness.clientID),
        }))
```

In `leaveRoom`, clear it beside the rest:

```ts
    pausedRef.current = false
```

- [ ] **Step 5: Add the idle clock**

After the effect that tears the session down on unmount:

```ts
  // The clock only runs while a session does, and only until it pauses itself.
  const live = collab.status === 'connecting' || collab.status === 'connected'
  useEffect(() => {
    if (!live) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const arm = () => {
      if (timer != null) clearTimeout(timer)
      timer = setTimeout(
        pauseSession,
        document.visibilityState === 'hidden' ? HIDDEN_PAUSE_MS : IDLE_PAUSE_MS,
      )
    }

    // A hidden tab gets the short clock from the moment it hides, not from the next event it
    // will never receive.
    const signals = ['pointermove', 'pointerdown', 'keydown', 'visibilitychange']
    signals.forEach((name) => document.addEventListener(name, arm))
    arm()

    return () => {
      if (timer != null) clearTimeout(timer)
      signals.forEach((name) => document.removeEventListener(name, arm))
    }
  }, [live, pauseSession])
```

Add `resumeRoom` to the returned object:

```ts
  return { route, actions, collab, joinRoom, leaveRoom, resumeRoom, setIdentity, setCursor }
```

- [ ] **Step 6: Run the tests**

Run: `npm test -- --project app src/lib/mdt/useRouteDoc.test.tsx`
Expected: PASS, the file's existing tests plus 7.

Run: `npm test` → PASS.
Run: `npm run typecheck` → PASS. `DungeonPage` does not yet destructure `resumeRoom`, which is not
an error; Task 7 wires it.

- [ ] **Step 7: Commit**

```bash
git add src/lib/mdt/useRouteDoc.ts src/lib/mdt/useRouteDoc.test.tsx
git commit -m "Pause a session nobody is attending"
```

Body: why the client has to own this — a server-side timeout only produces a reconnection loop,
because `y-websocket` reconnects on its own with a growing backoff.

---

### Task 7: The panel says it is paused, and offers the way back

**Files:**
- Modify: `src/components/route/RoutePanel.tsx` (the session block, around line 389)
- Modify: `src/routes/DungeonPage.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`
- Test: `src/components/route/RoutePanel.test.tsx`

**Interfaces:**
- Consumes: `collab.status === 'paused'` and `resumeRoom` from Task 6.
- Produces: `RoutePanel` gains an `onResumeRoom: () => void` prop, passed on to its session
  section exactly as `onLeaveRoom` is.

`RoutePanel.tsx` and `RoutePanel.test.tsx` **both hold another session's uncommitted work** (an
`inlineMarkdown` import with a trap render, and a `describe('Traps in the briefing', …)` block).
Use the index technique from the Global Constraints to commit only your own hunks, and never
`git add` the whole file blindly.

- [ ] **Step 1: Write the failing tests**

Add to `src/components/route/RoutePanel.test.tsx`, following the file's existing pattern for
building a `CollabState` fixture:

```tsx
describe('A paused session', () => {
  it('says so, rather than looking like a session still going', () => {
    renderEn(<RoutePanel {...props({ status: 'paused', room: 'ABCDEF' })} />)
    expect(screen.getByText(/paused/i)).toBeDefined()
  })

  it('offers the way back', () => {
    const onResumeRoom = vi.fn()
    renderEn(<RoutePanel {...props({ status: 'paused', room: 'ABCDEF' })} onResumeRoom={onResumeRoom} />)
    fireEvent.click(screen.getByRole('button', { name: /return to the room/i }))
    expect(onResumeRoom).toHaveBeenCalled()
  })

  it('offers nothing to come back from while the session is live', () => {
    renderEn(<RoutePanel {...props({ status: 'connected', room: 'ABCDEF' })} />)
    expect(screen.queryByRole('button', { name: /return to the room/i })).toBeNull()
  })
})
```

Adapt `props(...)` to whatever the file's existing helper is called — read the file first and reuse
it rather than inventing a second one. Every existing `CollabState` fixture in that file needs no
change: `'paused'` is a new value, not a new required field.

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- --project app src/components/route/RoutePanel.test.tsx`
Expected: FAIL — no text matching /paused/ and no such button.

- [ ] **Step 3: Add the two strings**

`src/lib/i18n/en.ts`, beside the other `collab.*` keys:

```ts
  'collab.paused': 'paused — nobody was here',
  'collab.resume': 'Return to the room',
```

`src/lib/i18n/fr.ts`, at the matching place:

```ts
  'collab.paused': 'en pause — plus personne ici',
  'collab.resume': 'Revenir dans le salon',
```

`fr.ts` is typed against `en.ts`, so a missing key fails `tsc -b`. There is no test to write for
that, and one comparing key sets is forbidden.

- [ ] **Step 4: Render the state and the button**

In `RoutePanel.tsx`'s session block, replace the status line:

```tsx
            <div className="text-xs text-ink-300">
              {collab.status === 'paused'
                ? t('collab.paused')
                : collab.status === 'connected'
                  ? plural('collab.connected', collab.peers.length)
                  : t('collab.connecting')}
            </div>
```

and put the way back in front of the two clipboard buttons, which are useless while paused —
replace them for the duration rather than crowd the row:

```tsx
        <div className="mt-2 flex gap-2">
          {collab.status === 'paused' ? (
            <button
              onClick={onResumeRoom}
              className="flex-1 rounded border border-threat-low/60 px-2 py-1 text-xs text-threat-low hover:border-gold-500 hover:text-gold-400"
            >
              {t('collab.resume')}
            </button>
          ) : (
            <>{/* the two existing clipboard buttons, unchanged */}</>
          )}
          {/* the existing Leave button, unchanged and always present */}
        </div>
```

Add `onResumeRoom: () => void` to both prop types that carry `onLeaveRoom` (the component's and
its session section's), and thread it through exactly where `onLeaveRoom` goes.

- [ ] **Step 5: Wire it in the page**

In `src/routes/DungeonPage.tsx`, destructure `resumeRoom` from `useRouteDoc` and pass
`onResumeRoom={resumeRoom}` wherever `onLeaveRoom` is passed. `resumeRoom` needs no wrapper: unlike
leaving, it neither clears the pending room nor touches the URL.

- [ ] **Step 6: Run the tests**

Run: `npm test` → PASS, app up by 3.
Run: `npm run typecheck` → PASS.

- [ ] **Step 7: Commit**

Stage `RoutePanel.tsx` and `RoutePanel.test.tsx` through the index technique; the other three
files are yours alone.

```bash
git commit -m "Show a paused session, and one way back into it"
```

---

### Task 8: The stalled notice keeps quiet during a pause

**Files:**
- Modify: `src/routes/DungeonPage.tsx` (the `notice` prop, around line 237)
- Test: `src/routes/DungeonPage.test.tsx`

**Interfaces:**
- Consumes: `RelayNotice`'s existing `stalled: boolean` prop — unchanged, since the component is
  right and only its input is wrong.

- [ ] **Step 1: Write the failing test**

Add to `src/routes/DungeonPage.test.tsx`. The file already stubs `scrollIntoView` and
`ResizeObserver`; keep using its own helpers to open a session.

```tsx
it('does not cry outage when the session paused itself', async () => {
  vi.useFakeTimers()
  try {
    // Open a session, then walk away from the tab for longer than the pause.
    // …the file's own way of opening a session, with a room code unique to this test…
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    act(() => void vi.advanceTimersByTime(5 * 60_000 + 5000))
    expect(screen.queryByText(/not answering/i)).toBeNull()
  } finally {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    vi.useRealTimers()
  }
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- --project app src/routes/DungeonPage.test.tsx`
Expected: FAIL — the notice is on screen, because pausing sets `synced: false` and the prop reads
`stalled={!collab.synced}`.

- [ ] **Step 3: Fix the input**

```tsx
                <RelayNotice
                  // A pause is a decision, not a failure: "the relay is not answering" would be
                  // a lie, and the panel already says what happened.
                  stalled={collab.status !== 'paused' && !collab.synced}
                  onLeave={handleLeaveRoom}
                />
```

- [ ] **Step 4: Run the tests**

Run: `npm test` → PASS, app up by 1.

- [ ] **Step 5: Commit**

```bash
git add src/routes/DungeonPage.tsx src/routes/DungeonPage.test.tsx
git commit -m "Keep the outage notice quiet while a session is paused"
```

---

### Task 9: Deploy the relay from a manual workflow

**Files:**
- Create: `.github/workflows/relay.yml`

**No automated verification exists for a workflow file** — nothing in this repository lints
Actions, and a run needs a token that only RwlRwlRwlRwl can create. Read it against `deploy.yml`,
which is the house pattern, and leave the first run to him.

- [ ] **Step 1: Write the workflow**

```yaml
name: Relay

# Manual trigger only, like Deploy. The relay changes about once a year, and nothing here
# deploys itself.
on:
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy the relay to Cloudflare
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm

      - run: npm ci

      # The relay's own tests run in workerd, so they need no network and no account.
      - name: Test the relay
        run: npm test -- --project relay

      - uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: relay
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/relay.yml
git commit -m "Deploy the relay from a manual workflow"
```

Body: that `CLOUDFLARE_API_TOKEN` is a repository secret created by hand from the "Edit Cloudflare
Workers" template, that no token ever lands on a laptop, and that `accountId` may have to be added
if wrangler asks for it on the first run.

---

### Task 10: Tell the reader what changed

**Files:**
- Modify: `CLAUDE.md` (the repository overview, and the "Where things live" table)
- Modify: `README.md`
- Modify: `docs/plans/2026-08-17-collaborative-session-features-design.md`

- [ ] **Step 1: Correct `CLAUDE.md`**

The overview says the route syncs "collaboratively, over Y.js on WebRTC". It has been
`y-websocket` throughout. Replace with "collaboratively, over Y.js through a relay we run
(`relay/`)".

Add a row to "Where things live":

```
| `relay/` | The Cloudflare Worker a session meets on: one durable object per room, storing nothing. | By hand |
```

- [ ] **Step 2: Correct the collaborative-session design**

In `docs/plans/2026-08-17-collaborative-session-features-design.md`, the *Hosting a relay*
follow-up calls the old default "**guaranteed broken**". It is not: on 2026-08-17 it refused an
upgrade in the morning and synced a document in the afternoon. Say flaky, and note that the
follow-up is now closed by
[`2026-08-17-relay-hosting-design.md`](2026-08-17-relay-hosting-design.md). Do not rewrite the
rest of that document: it records what was true when it was written.

- [ ] **Step 3: Tell a reader of `README.md` what a session needs**

Add, wherever the README explains sessions: that they meet on a relay the project runs, that
nothing needs configuring; and for anyone running their own,
`VITE_COLLAB_URL=ws://127.0.0.1:8787` with `npx wrangler dev --config relay/wrangler.toml`. Match
the README's existing voice and level of detail; it addresses users, not maintainers.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md docs/plans/2026-08-17-collaborative-session-features-design.md
git commit -m "Say where a session meets now"
```

---

## After the last task

Run `npm test`, `npm run typecheck` and `npm run build` once more, then hand back to
RwlRwlRwlRwl with three things he has to do himself, in this order:

1. Create the API token (Cloudflare dashboard → profile → My Profile → API Tokens → "Edit
   Cloudflare Workers") and add it as the repository secret `CLOUDFLARE_API_TOKEN`.
2. Run `Actions → Relay → Run workflow`, and check that
   `https://keystone-relay.damdam-gold.workers.dev` answers `keystone relay`.
3. Run `Actions → Deploy → Run workflow`, then open a session from two browsers.

Nothing in this plan deploys anything. The end-to-end harness is the next design, and the pause
introduced here is one of the things it should prove in a real browser.

## Self-review

**Spec coverage.** Decision 1 (no persistence, no hibernation) — Task 2's Room holds the doc in
memory and the comment carries the reasoning. Decision 2 (origin allowlist) — Task 4. Decision 3
(URL default in code) — Task 5. Decision 4 (tests in workerd on a pinned pool) — Task 1, with the
three test subjects landing in Tasks 2, 3 and 4. Decision 5 (idle pause) — Tasks 6, 7 and 8. The
shape section's Worker and Room — Tasks 2 to 4. Deployment — Task 9. The three documents to correct
— Task 10.

**Placeholders.** One deliberate gap: Task 7's `props(...)` helper and Task 8's way of opening a
session are named rather than quoted, because both files hold another session's uncommitted work
and quoting a line I cannot see would be worse than telling the implementer to read it. Task 7's
`<>{/* the two existing clipboard buttons, unchanged */}</>` is the same case. Every other step
carries its code.

**Type consistency.** `CollabStatus` gains `'paused'` in Task 6 and is read in Tasks 7 and 8.
`resumeRoom` is produced in Task 6, consumed as `onResumeRoom` in Task 7. `connect` / `until` /
`Client` are produced in Task 2 and consumed in Tasks 3 and 4. `ALLOWED_ORIGINS` is internal to
Task 4, and Task 2's helper already sends an origin that Task 4 will allow — checked, because the
reverse would break Tasks 2 and 3 retroactively.

**Test count.** 612 before; +1 (Task 1), +2 (Task 2), +2 (Task 3), +4 (Task 4), +7 (Task 6), +3
(Task 7), +1 (Task 8) = **632 across 26 files**, in two projects.
