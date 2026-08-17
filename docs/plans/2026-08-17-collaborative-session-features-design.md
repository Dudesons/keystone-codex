# Collaborative session features — design

**Date:** 2026-08-17 · **Status:** approved, awaiting an implementation plan

## Why

A route can already be edited by several people at once: `useRouteDoc` holds the route in a
Y.js document and attaches a provider when you open or join a room. What it cannot do is tell
you *who* is in the room, *where* they are looking, or let you invite them with anything
better than a six-letter code read out loud.

Three requests, in the requester's order:

1. On joining a session, you should have to enter a name for yourself.
2. Each participant's mouse cursor should be visible on the map.
3. A join link, rather than only a code. Dropping the link was an acceptable outcome if it
   fought the deployment model; it does not, so it stays in.

Two repairs join them, both found while designing rather than reported:

4. Joining a room replaces your local route and overwrites it in `localStorage`. Today that
   costs a deliberate act — typing a code. A link makes it one careless click.
5. When the relay does not answer, the app shows an empty route and says "connecting…"
   forever. On 2026-08-17 the public relay it defaulted to was decommissioned, and that is
   exactly what everyone saw. The transport will fail again; the interface must say so.

Repair 5 does not fix a dead relay. It makes the death legible and reversible. The actual
fix is a relay we control, and that is deliberately out of scope here (see *Follow-ups*).

## Feature 1 — Identity

`identityName()` currently invents `Player-8429` on first use and remembers it in
`localStorage['midnight-codex:identity']`. It is replaced by `storedIdentity(): string | null`,
which returns the remembered name or nothing.

The name field lives in the "Edit together" section of the route panel, above the
**Open a session** and **Join** buttons, which stay disabled while it is empty. On a first
visit the field is blank, so a name has to be chosen; afterwards it is prefilled and a single
keystroke gets you in. Prefilling an invented name instead would mean everyone accepts
`Player-8429` without reading, and "enter a name" would be decoration.

The field stays editable inside a session. `setIdentity(name)` writes to `localStorage` and,
when a provider is open, pushes `awareness.setLocalStateField('user', { name })`. Peers see
the new name without reconnecting.

The name is **not** translated, for the reason already recorded next to `DEFAULT_ROUTE_NAME`
and in `.claude/skills/i18n/SKILL.md`: it is replicated to peers, so two teammates running
different locales have to see the same string for the same person.

Names already in `localStorage` are kept. Someone who has been `Player-8429` all season is
offered it prefilled and may overwrite it, but is never renamed behind their back.

## Feature 2 — Cursors

### Where presence lives

A new module, `src/lib/collab/presence.ts`, holds the parts that can be wrong without looking
broken, as pure functions:

```ts
export interface Peer {
  clientId: number
  name: string
  color: string
  cursor?: Point
  /** You. Kept in the list so the count stays "participants, yourself included". */
  isSelf: boolean
}
export function peerColor(clientId: number): string
export function readPeers(states: Map<number, unknown>, self: number): Peer[]
```

`peerColor` derives a hue from `clientId` and returns a saturated HSL colour: stable, the same
for everyone, nothing to synchronise. `readPeers` tolerates incomplete states — a peer that
has just arrived has neither a name nor a cursor yet, and that must never break the render.
It is the same invariant as "a mob with no `.md` entry still renders".

`readPeers` returns **every** participant, yourself among them, flagged. Dropping yourself
from the list would quietly change what the "N connected" counter means — its current
definition, written next to the field, is "participants, yourself included". `PeerCursors`
filters on `isSelf` instead: you have a real mouse pointer already and do not need a second
one drawn under it.

`useRouteDoc` keeps ownership of the provider and merely feeds this module. Putting presence
inside the hook instead would make it a fifth responsibility in a file that already has four,
and none of it testable without mounting React. A React context was considered and rejected:
one consumer, one level of prop drilling.

`CollabState.peers` changes from `number` to `Peer[]`. The two call sites that read it —
`RoutePanel`'s connected count and the `DungeonPage` header badge — become `.length`.

### Coordinates

Two pure functions, exact inverses, join `src/components/map/viewport.ts`:

```ts
export function toMapPoint(t: Transform, p: Point): Point       // container px → map px
export function toContainerPoint(t: Transform, p: Point): Point // map px → container px
```

A cursor travels in **map coordinates**. Screen pixels would put my arrow on a different mob
than yours the moment our zoom levels differ — an error that does not look like a bug, only
like a colleague pointing badly. This is what `viewport.ts` exists for, in its own words.

### Emission

`DungeonMap` gains `onCursorMove?: (p: Point | null) => void`, called from the `pointermove`
handler that already drives panning, and with `null` on `pointerleave`. Panning is covered for
free: the map moves under a stationary mouse, but `pointermove` fires throughout a drag.

Writes to awareness are throttled to 20 per second, **in the hook**. Sixty per second would be
rude to a relay and invisible to the eye, and the map has no business knowing what a network
write costs.

### Rendering

A new `src/components/map/PeerCursors.tsx` draws one arrow and one name pill per peer, in a
`pointer-events-none` layer positioned **over** the container — not inside the transformed
div. Inside, every element would need to be counter-divided by `scale` and the text would be
re-rasterised at each zoom notch; outside, a cursor is a translation and constant on-screen
size falls out on its own. Cursors that leave the frame are already clipped by the container's
`overflow-hidden`; no edge indicators, nobody asked for them.

`DungeonPage` passes `cursors` and `onCursorMove`, both absent outside a session, so nothing
changes when you work alone.

## Feature 3 — The join link

The build is served statically under `HashRouter` (`src/main.tsx`), so the room has to live
inside the hash:

```
${location.origin}${location.pathname}#/d/${slug}?room=${code}
```

`location.pathname` already carries the `/keystone-codex/` that GitHub Pages adds, so nothing
is hardcoded. Under `HashRouter` the query string inside the hash is the router's location,
and `useSearchParams` reads it.

A **Copy link** button joins the existing **Copy code**, which stays: a code is still what you
read out on voice chat.

On arrival with a `?room=`, `DungeonView` starts in **route** mode rather than codex, prefills
the code field, and shows a confirmation card:

> Join room ABC123 — your local route will be set aside. **[Join]**

Nothing connects before that click. This is what keeps a link from being destructive by
construction, and it lets you see where you are going before you go. The `?room=` stays in the
URL: reloading should offer again, not silently reconnect.

## Repair 4 — The local route is set aside, not destroyed

A second storage key, `midnight-codex:route:<slug>:stashed`, and one invariant:

> A stash exists ⟺ your local route is waiting. **Every** way out of a session puts it back.

The route is stashed when joining **and only when coming from `status: 'off'`**. Hopping from
room A to room B must not overwrite the stash with room A's route.

Leaving restores it. So does mounting: closing the tab mid-session counts as leaving, so if a
stash is found at startup it goes back. Without that, the promise only holds for people who
remember to click **Leave**.

A host stashes nothing. Its document *is* the room; there is nothing to rescue.

## Repair 5 — Failing honestly

`useRouteDoc` exposes `synced: boolean`, read from `provider.synced`
(`node_modules/y-websocket/src/y-websocket.js:466`; the provider emits `sync` and `synced` at
line 478).

**While waiting**, the route panel does not show an empty route. It says the room's route is
being fetched. Today the guest switches to an empty document that *looks* like a fresh route
with one default pull, and nothing distinguishes "the room is empty" from "nothing has arrived
yet". That ambiguity is what made the outage read as "the route does not appear".

**After five seconds** without a sync, a notice appears at the **top centre** of the map. The
clock starts when the session opens and restarts every time the provider falls back out of
sync, so a relay that dies mid-session gets the same five seconds of grace as one that never
answered.

> ⚠ The relay is not answering. Your local route is safe. **[Leave session]**

Top centre because the other corners are taken: `MapHud` sits at `right-3 bottom-3`, the legend
panel at `top-3 right-3`, the hover tooltip at `top-3 left-3`.

Five seconds because a healthy relay converges in **under 500 ms** — measured on 2026-08-17
against a local `y-websocket` server, with `BroadcastChannel` disabled so the measurement was
of the relay and not of the browser talking to itself. A threshold ten times the observed
figure will not fire out of nervousness.

The notice clears itself if the sync eventually lands: `y-websocket` reconnects on its own with
a growing backoff, so a relay that comes back must catch up without anyone doing anything.

Its **Leave** button calls the same action as the panel's. One way out, not two behaviours to
keep in step.

## Test plan

| File | What it pins |
| --- | --- |
| `src/lib/collab/presence.test.ts` *(new)* | a colour is stable for a given client id; `readPeers` flags self rather than dropping it, and survives a peer with no name and no cursor |
| `src/components/map/viewport.test.ts` | `toMapPoint`/`toContainerPoint` round-trip at several scales and translations |
| `src/lib/mdt/useRouteDoc.test.tsx` | the name is persisted and pushed to awareness; the stash round-trip (join → set aside → leave → restored); a stash left by a closed tab is restored on mount; hopping from room A to room B does not overwrite the stash; cursor writes are throttled (`vi.useFakeTimers()`) |
| `src/components/map/DungeonMap.test.tsx` | a peer cursor renders at the expected container position; moving the pointer reports map coordinates; leaving reports `null` |
| `src/components/route/RoutePanel.test.tsx` | an empty name disables both buttons; the share link carries dungeon and room; `?room=` prefills and shows the confirmation card; the stalled notice appears and its Leave button goes through the same action as the panel's |

With the existing tooling: `SilentSocket` for the offline session lifecycle, `renderEn` /
`renderFr`, the `// @vitest-environment jsdom` pragma, `afterEach(cleanup)`.

New interface strings go in `src/lib/i18n/en.ts` and `fr.ts`. `fr.ts` is typed against `en.ts`,
so a missing key fails `tsc -b`; there is no test to write for that.

**Not covered here: the relay itself.** CI has no network, and the unit suite must not acquire
one. See the follow-up below.

## Follow-ups, deliberately out of scope

### Hosting a relay

`COLLAB_URL` falls back to `wss://demos.yjs.dev/ws` when nothing is configured. As of
2026-08-17 that host still serves its static demo pages over HTTPS (200) but refuses the
WebSocket upgrade (close code 1006 in ~170 ms, while `wss://echo.websocket.org` opens in
250 ms from the same browser) — that was the morning's measurement; the same host synced a
document that afternoon. The default is not dead, it is **flaky**, which for something people
are meant to rely on is just as bad, and it is what the deployed site uses.

`VITE_COLLAB_URL` already overrides it, so pointing at any server needs no code change. For
local development, `.env.local` (covered by `*.local` in `.gitignore`) with:

```
VITE_COLLAB_URL=ws://localhost:1234
```

and a relay started with:

```
npx -y y-websocket@2.1.0
```

Version 2.1.0 rather than the latest: `y-websocket@3.1.0` is client-only and ships no binary,
which is why `npx y-websocket` answers "could not determine executable to run". The scoped
`@y/websocket-server` is not an alternative — it pulls the `@y/*` rewrite of Yjs and crashes
against a classic `yjs` client with `store.getClock is not a function`.

Choosing where the durable relay lives is a decision for the repository's owner and has not
been taken.

This follow-up is now closed by [`2026-08-17-relay-hosting-design.md`](2026-08-17-relay-hosting-design.md).

### An end-to-end harness

The idea, from RwlRwlRwlRwl: boot a relay inside the CI workflow and run real browser tests
against it. It works — the runner already has Node, so a background `npx -y y-websocket@2.1.0`
step is enough and no external network is touched. It deserves its own design rather than a
paragraph grafted onto this one, and it comes after these features: writing browser tests
against an interface that does not exist yet means guessing at selectors.

Two traps to carry into that design:

- **Vite inlines environment variables at build time.** The end-to-end job has to build with
  `VITE_COLLAB_URL=ws://localhost:1234` before serving `dist/`, or the bundle still points at
  the dead relay and the suite fails for the wrong reason.
- **Two tabs of one origin sync over `BroadcastChannel` without ever touching the relay.**
  Whether two browser contexts are isolated from each other has not been verified. The rule
  for the harness must therefore be: *every collaboration test has to be shown red with the
  relay switched off.* Without that counterfactual the suite would be green while testing
  nothing but the browser talking to itself.

Picking the runner is a decision to take with the repository's owner, per `CLAUDE.md`.
