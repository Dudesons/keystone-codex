# Hosting the relay — design

**Goal:** collaboration works on the deployed site, on a relay we control, for nothing a month.

**Why now:** `COLLAB_URL` falls back to `wss://demos.yjs.dev/ws`, a server nobody owes us. It
refused the upgrade this morning (close 1006 in ~170 ms) and answered again this afternoon — a
document synced across it, `bcconnected: false` both sides. So it is not decommissioned, it is
*flaky*, which is the same thing for a feature people are meant to rely on.

## The decision

**Cloudflare Workers, one Durable Object per room, the relay written here.** Free plan,
`wss://keystone-relay.damdam-gold.workers.dev`.

A Durable Object is the primitive this needs: a single named instance per room that holds the
connections and the document. The Workers free plan allows 100 000 requests/day with **incoming
websocket messages counted 20 to 1** — 2 000 000 messages/day, where one person moving a cursor
at our 20/s throttle spends 72 000 an hour.

Written here rather than taken off the shelf, because `y-protocols` and `lib0` are already in
`node_modules` as dependencies of `y-websocket`: both ends of the wire then agree on the protocol
*by construction*, at one version. The two published ports of y-websocket to Workers were written
against neither our client nor today's runtime, and the scoped `@y/websocket-server` already
crashed against our classic `yjs` with `store.getClock is not a function`.

### The spike that settled it

~120 lines, run under `wrangler dev`, two providers with `disableBc: true` so `BroadcastChannel`
could not answer in the relay's place:

| Checked | Result |
| --- | --- |
| `bcconnected` | `false` — the browser was not talking to itself |
| `synced`, both providers | `true` |
| A map entry, A → B | crossed |
| A presence with a cursor, A → B | crossed, `{x: 12, y: 34}` intact |
| A closes its provider | A's state disappears from B (2 states → 1) |

**The trap it paid for:** workerd delivers binary frames as a **`Blob`**, not an `ArrayBuffer`.
`new Uint8Array(blob)` yields an empty array and lib0 raises "Unexpected end of array" on the
first frame, killing the socket. `server.binaryType = 'arraybuffer'` after `accept()` is the whole
fix — and it is exactly the kind of detail an unmaintained port written for an older
`compatibility_date` would not carry.

### Why not the others

- **WebRTC** does not remove the server, it renames it. Its three default signalling hosts are
  dead (`wss://signaling.yjs.dev` closes 1006 in 32 ms; the two Heroku ones went with free dynos),
  so we would host signalling anyway — same bill, plus TURN for the NATs and firewalls a relay
  crosses for free, plus nothing left behind when the last tab closes.
- **A VPS** (OVH, Hetzner, Netcup) is 3–5 €/month *and* a Linux host to patch forever, for a
  feature a handful of people use.
- **Shared hosting** (o2switch and kin) runs Node from cPanel but throttles websockets; a relay is
  the first load such a host isolates.

## Shape

```
relay/
  wrangler.toml      name, the ROOM binding, migration v1 with new_sqlite_classes
  src/index.js       the Worker and the Room durable object
```

It shares the root `node_modules`, which is what keeps client and relay on one `yjs`.

- **Worker.** A request without `Upgrade: websocket` gets `200 keystone relay`. One with it is
  routed by URL path — the room name the client appends — through `env.ROOM.idFromName(room)`.
- **Room.** One `Y.Doc` and one `Awareness` per instance. On connect: sync step 1, then everyone
  already present. On a frame: `readSyncMessage` answering only when there is something to answer,
  or `applyAwarenessUpdate`. Document and awareness updates are broadcast to every socket but the
  one they came from. Each socket owns the client ids it speaks for, so a departure takes its
  cursor with it rather than leaving a ghost.
- `compatibility_date` pinned; `new_sqlite_classes` in the migration, the only storage backend the
  free plan creates.

## Five decisions

### 1. No persistence, and no hibernation

**The clients are the durable copies.** Yjs is a CRDT and every participant holds the whole
document; the host's route is in `localStorage` besides. A relay that stores nothing cannot serve
anything stale, and a Durable Object with no connections is unloaded, so an empty room simply
stops existing. This is a relay, not a database.

The cost, stated honestly: without hibernation a Durable Object meters duration for as long as a
socket is open. If GB-s are metered at 128 MB — an assumption to verify — the free 13 000 GB-s/day
are ≈ 28 hours of open connection per day, counted **per room, not per person**: five people for
three hours cost three of the twenty-eight. There is no invoice at the end of it: the free plan
grants a quota, not credit, and past the quota the relay stops answering until the day rolls
over — which Repair 5 already makes legible ("The relay is not answering. Your local route is
safe."). A bill requires deliberately upgrading.

What that leaves is the forgotten tab, and decision 5 takes it out of the picture: a session that
pauses itself after five idle minutes cannot spend a night. Hibernation stays the lever if the
quota ever complains anyway, and it is not free — the document would have to be persisted and
reloaded around every frame. YAGNI until then.

**Accepted limitation:** joining a room whose every member is offline shows an empty route with
`synced: true` — the document went with the last browser. True of any relay after a restart, and
not worth code today.

### 2. An origin allowlist, which is not authentication

The Worker accepts upgrades from `https://dudesons.github.io` and from localhost, and refuses the
rest. Three lines that keep our quota ours. It is **not** access control on rooms: whoever has the
six-letter code still joins, exactly as the collaborative-session design says.

### 3. The relay's URL becomes the default in code

`COLLAB_URL` defaults to `wss://keystone-relay.damdam-gold.workers.dev`, and `VITE_COLLAB_URL`
stays the override for local work and for the end-to-end harness.

Vite inlines `import.meta.env.VITE_*` at **build** time, so the alternative — a repository
variable read by the deploy workflow — is one more thing to remember or the site ships pointing
nowhere. A default in the source means a fresh clone works and `deploy.yml` needs no change at
all. The trade-off is that the repository names the account's `workers.dev` subdomain: public
information, on a public site, and not a credential.

### 4. Tests in workerd, on a deliberately pinned pool

`@cloudflare/vitest-pool-workers` runs Workers and Durable Objects inside Vitest, in workerd, with
no network — which is what CI needs. **Pinned to `0.12.21`**: from `0.13.0` it requires Vitest 4
and we run 3.2.7. Upgrading Vitest across 612 tests is its own change with its own risk, not
something to smuggle into a relay.

Three tests, as a second Vitest project so the `node` and `jsdom` suites keep their environments:

1. two clients on one room converge on a document entry;
2. a client that disconnects has its presence removed from the other's awareness;
3. a plain `GET` answers 200, and an upgrade from a foreign origin is refused.

If the pool cannot be made to coexist with the current Vitest configuration in reasonable effort,
the fallback is a Node integration test that boots `wrangler dev` on a port and drives two
clients against it — still no network beyond localhost, still runnable in CI, but a process to
manage. Take the pool first.

### 5. An idle tab pauses itself, and comes back with one click

An open socket keeps the object loaded whether or not anyone is looking at the page. That is a
quota problem, but it is first an **interface** problem: a forgotten tab shows the others a cursor
that will never move again and counts as a person in the room. Both go away with the same fix.

**The client has to own this.** The Room could close silent sockets, and it would buy nothing:
`y-websocket` reconnects on its own with a growing backoff, so a server-side timeout produces a
reconnection loop rather than a saving. Only the side that decides *not* to reconnect can stop the
meter.

`CollabStatus` gains a fourth value, `'paused'`. The hook disconnects the provider — not the
document — after either:

- **5 minutes with `document.visibilityState === 'hidden'`**: the forgotten tab, which is nearly
  always a background tab or a locked screen;
- **15 minutes without a pointer move, key or click** while the page is visible: the same person,
  screen on, gone to lunch.

Any of those signals resets the clock. Both durations are constants with a comment, not literals
buried in a handler.

**What paused means, precisely.** The room code and the stash are kept, so the local route stays
set aside and leaving still restores it — a pause is not a departure. The `Y.Doc` keeps everything
it had and stays editable: Yjs merges both sides on return, which is the entire point of a CRDT.
The others' cursors vanish because nothing arrives any more, and ours vanishes for them because
the Room removes the presence of a socket that closed. The route panel says the session is paused
and offers **Return to the room**, which calls `provider.connect()`.

Repair 5's five-second notice must not fire on a pause: that notice means "the relay is not
answering", and a pause is a decision, not a failure. It keys on `status === 'connecting'`.

**Not covered:** a client that ignores its own pause and reconnects forever still spends the
quota. The origin allowlist is the only guard, and since the client is ours that is proportionate.

This grows the work beyond the relay — a hook state, a panel state, a button and its two
translations. It is the right place for it all the same: the relay cannot fix a tab it does not
control.

## Deployment

A new `.github/workflows/relay.yml`, **`workflow_dispatch` only**, like `deploy.yml`: the relay
changes once a year and nothing here deploys itself.

```yaml
- uses: cloudflare/wrangler-action@v4
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    workingDirectory: relay
```

`CLOUDFLARE_API_TOKEN` is a repository secret **RwlRwlRwlRwl creates himself** — Cloudflare
dashboard, profile icon → My Profile → API Tokens, template "Edit Cloudflare Workers". No token
ever lands on a laptop, and `wrangler login` stays unnecessary. `accountId` may have to be added,
either as an input or in `wrangler.toml`; the account's `workers.dev` subdomain already exists, so
no manual step precedes the first deploy.

Order, once: deploy the relay, confirm the URL answers, then deploy Pages.

`deploy.yml` is untouched — decision 3 is what buys that.

## Three documents to correct

- `src/lib/mdt/useRouteDoc.ts`: the comment on `COLLAB_URL` calls the public relay dead. It is
  flaky, which is a better argument and a true one.
- `docs/plans/2026-08-17-collaborative-session-features-design.md`: "guaranteed broken", same
  correction.
- `CLAUDE.md`: the repository overview still says the route syncs "over Y.js on WebRTC". It has
  been `y-websocket` throughout.

## Out of scope

The end-to-end harness. The relay's own tests pin the protocol; only a browser test can pin two
real viewports agreeing on where a cursor points, or `HashRouter` splitting `?room=` out of the
hash on the deployed base path. It gets its own design, next.
