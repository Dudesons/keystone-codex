# Sharing a route as a link — design

**Goal:** let someone hand a finished route to their group as a URL, so opening it offers to load
that route — without needing a live session, and without anyone installing MDT.

**Why now:** a route can already be shared two ways, and neither fits "here is the route, keep it".
An **MDT string** works only for people who run MDT. A **collaboration room** is live and ephemeral:
it needs both people present, and closing the tab ends it. What is missing is the flat case — post a
link in the group's channel on Tuesday, everyone opens it whenever.

**Depends on:** nothing new. The payload, the import path and the URL builder all exist.

## What already exists, and is reused rather than rebuilt

| Piece | Where | Reused for |
| --- | --- | --- |
| The payload | `useRouteDoc.ts:441` persists the route as `encodeMdtString(routeToLua(current))` | The link carries **that same string**. This is not a new serialisation. |
| Applying it | `actions.importRoute(mdtString)` (`useRouteDoc.ts:602`) | A share link is a pre-filled version of the paste box `RoutePanel` already has, with the same errors. |
| Building the URL | `sessionLink(slug, room)` (`RoutePanel.tsx:74`) — `${location.origin}${location.pathname}#/d/<slug>/route?room=<code>` | The shape to mirror. Deriving from `location` is what carries the deployed sub-path `/keystone-codex/`. |
| Offering rather than doing | the `?room=` flow in `DungeonPage.tsx:42-63` | The arrival behaviour, including the `declined` pattern. |

**The whole feature is a URL parameter, a confirm card and a copy button.** If it grows past that,
something has been misunderstood.

## The decisions

### 1. The route travels in the URL, not on a server

`#/d/<slug>/route?route=<url-encoded MDT string>`.

The relay stores nothing — *"the participants are the durable copies of their own route"* is a
commitment written into `relay/src/index.js`, and it is why an empty room simply stops existing.
Putting snapshots there would introduce storage, expiry, quota and a privacy question the project
does not currently have. A link that carries its own payload needs none of that, never expires, and
works offline from a text file.

### 2. Long routes are named as a limit, not hidden

Measured from the repository's own fixtures:

| Route | MDT string | URL-encoded | Full link |
| --- | --- | --- | --- |
| `real-export.txt` — five notes | 963 | 1013 | ~1092 |
| `real-export-strokes.txt` — notes, strokes, two arrows | 1931 | 2037 | ~2116 |

URL overhead is 79 characters at the season's longest slug
(`https://dudesons.github.io/keystone-codex/` plus `#/d/temple-of-sethraliss/route?route=`).

Browsers are not the constraint — Discord is, at **2000 characters per message**, and Discord is
where these get posted. So a heavily drawn route produces a link that will not paste.

**The link is always copied, and when it exceeds 1900 characters the app says so and names the
collaboration room as the way to share that route instead.** The room has no length limit and
already exists for exactly this. Warning rather than refusing matters because the limit belongs to
wherever they are pasting, not to us: a 2100-character link is fine in an email, a wiki or a
Discord *file*.

A shorter custom format was considered and rejected: what overflows is freehand stroke points, which
any format has to carry, so a second codec would buy a few percent in exchange for another thing to
maintain and test.

### 3. Arriving offers; it never applies by itself

Applying a route destroys the one already there — `importRoute` replaces the document and clears the
undo stacks. A link someone posted must therefore not be able to overwrite your work by being
clicked.

This follows the `?room=` precedent deliberately, including its subtleties: a card asks, `declined`
holds the specific payload just refused rather than a flag (a flag would suppress every *later*
link too), and the card appears without a reload when the link is pasted into a tab already on this
dungeon, since that only changes the hash.

It also inherits the redirect: a `?route=` on the codex address moves to the route address keeping
the parameter, because that is where a route is looked at.

### 4. Applying strips the parameter; declining leaves it

The one place this **differs** from `?room=`, and why.

`?room=` stays in the URL after joining, so a reload offers the invitation again. That is right for a
room: rejoining is harmless. It is wrong for a route — after applying it you start editing, and a
reload offering to import the same route again is offering to destroy the edits you just made.

So: **on apply, the parameter is removed** (`navigate(..., { replace: true })`), making the link
single-use per arrival. **On decline it stays**, so a reload offers it again — matching `?room=`,
where declining and changing your mind is the expected path.

### 5. A room invitation outranks a route offer

A URL could carry both. Joining a room replaces the document with the peer's copy anyway, so
applying a route first would be work immediately thrown away, and showing two cards at once is a
choice nobody asked for. **When `?room=` is present, the route offer is suppressed** and the room
invitation is shown alone.

### 6. Where the button goes

Beside the existing session controls in `RoutePanel`, as a third way of handing the route over: copy
the MDT string (for MDT users), open a session (to work together), copy a link (to just send it).
Grouping them is what makes the choice between them legible.

### 7. The payload's dungeon must match the address's

`importRoute` does **not** check this today, and the check belongs here rather than nowhere.

`luaToRoute` reads `currentDungeonIdx` out of the payload and resolves a slug from it, throwing
`notInPool` only when that index names no dungeon in the season pool
(`src/lib/mdt/route.ts:73-75`). It never compares the result against the document it is being
imported into. A Temple of Sethraliss route applied to Altar of Fangs' page therefore writes Temple's
pulls into Altar's document, where every clone reference means a different mob — a route that looks
populated and is nonsense.

A share link is the first mechanism that puts a payload and a slug into one string, so it is the
first place they can disagree: hand-editing the slug in a copied URL is enough. **On arrival, the
payload's `currentDungeonIdx` is compared to the address's slug, and a mismatch is refused with a
message rather than applied.**

> **Pre-existing, and out of scope:** the paste box has the same gap — pasting dungeon A's string into
> dungeon B's panel is accepted today. This design does not change that path; it is worth its own
> issue, and this section is the description to open it with.

### 8. What the link cannot carry

Nothing under `content/` — no tips, no traps, no prose. That is a CLAUDE.md invariant and it holds
here for free, because the payload is an MDT string and the codec serialises the route document
only. Worth stating because "share a link to my route" sounds like it might carry more than it does.

## What gets built

| File | Change |
| --- | --- |
| `src/components/route/RoutePanel.tsx` | `routeLink(slug, mdtString)` exported beside `sessionLink`; the copy button; the over-length warning; the confirm card. |
| `src/routes/DungeonPage.tsx` | Read `?route=`, hold `declined`, redirect from the codex address, suppress when `?room=` is present, check the dungeon matches. |
| `src/lib/i18n/en.ts`, `fr.ts` | The new strings. |
| `e2e/share.spec.ts` | The link survives the deployed sub-path into a second browser. |

**Nothing changes in `useRouteDoc.ts`.** `RoutePanel` already holds `route` and already builds the
export string as `encodeMdtString(routeToLua(route))` (line 164, in `handleExport`) — the link builder
takes the same expression, so the document needs to expose nothing new.

**The confirm card is not a new component.** The room invitation is written inline in `RoutePanel`
(around line 554, `collab.invitation` / `collab.acceptInvitation`); the route offer goes beside it in
the same place, so the two read as one family rather than two conventions.

## Testing

**Unit** — `routeLink`, beside the existing `sessionLink` test in `RoutePanel.test.tsx`:
a link contains the origin, the sub-path, the slug and the encoded payload; a payload with characters
that must be encoded round-trips through `decodeURIComponent` unchanged.

**Integration** — `RoutePanel.test.tsx`: the copy button writes a link to the clipboard; a route long
enough to exceed the threshold still copies **and** reports the warning; a short one reports success
with no warning.

**Integration** — `DungeonPage.test.tsx`: a `?route=` address offers rather than applies; accepting
calls `importRoute` with the payload and clears the parameter; declining leaves the parameter and
shows no card; a reload after declining offers again; `?room=` and `?route=` together show only the
room invitation; a malformed payload reports the same error a bad paste does rather than throwing;
**a payload for another dungeon is refused rather than applied** (decision 7) — built by taking a
real fixture and pointing the address at a different slug, so the test exercises a genuine string.

**E2E** — `e2e/share.spec.ts`: build a route in one browser, copy the link, open it in a second
context, accept, and see the same pulls — the one test that proves the sub-path, the encoding and the
import all survive a real round trip. This mirrors the existing join-link scenario in
`e2e/session.spec.ts`, which is the pattern to follow.

## Deliberately not in this slice

- **Any server-side storage or short links.** Decision 1 says why.
- **A read-only view of someone else's route.** Applying it to your own document is the whole
  interaction; a viewer mode is a different feature.
- **Compressing beyond what the MDT codec already does.** Decision 2 says why.
- **Sharing a route across dungeons.** The link names its dungeon; a payload whose `mdtIndex`
  disagrees is already rejected by `importRoute` with `mdtError.notInPool`, and that message is the
  right answer.
