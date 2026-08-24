# Shareable route link — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** a button that copies the current route as a URL, and an address carrying one that offers to
load it.

**Architecture:** the route travels in `#/d/<slug>/route?route=<url-encoded MDT string>`. The payload
is the string the document already persists, applying it is the `importRoute` the paste box already
calls, and the URL is built the way `sessionLink` already builds the join link. No storage, no
server, no new codec.

**Tech Stack:** React 19, TypeScript, react-router-dom (HashRouter), Vitest (jsdom for components),
Playwright. **No new dependency.**

**Spec:** [`2026-08-24-shareable-route-link-design.md`](2026-08-24-shareable-route-link-design.md)

## Global Constraints

- **TDD is mandatory.** Watch every test fail before implementing.
- **Every new UI string goes in both `src/lib/i18n/en.ts` and `src/lib/i18n/fr.ts`.** `tsc` fails on
  a key missing from either.
- **Never write a game term into a dictionary.**
- **Component test files** carry `// @vitest-environment jsdom`, declare their own
  `afterEach(cleanup)`, and mount through `renderEn` / `renderFr` from `src/test/render.tsx`.
- **Nothing under `content/` may reach the payload.** This holds for free — the codec serialises the
  route document only — but do not add anything that changes it.
- **`importRoute` replaces the document and clears the undo stacks.** Nothing a share link does may
  make that happen without the reader agreeing to it first.
- **Commit style:** imperative subject, no prefix, body says *why*. Trailer
  `Co-authored-by: Claude Opus 5 <noreply@anthropic.com>`. **Never `--no-verify`.**
- **Playwright matches an accessible name as a case-insensitive substring by default.** `Copy the
  link` and a new `Copy the route link` would collide — use `exact: true`, and prefer names that do
  not nest.

## What already exists (read these before starting)

| Thing | Where | Why it matters |
| --- | --- | --- |
| `sessionLink(slug, room)` | `src/components/route/RoutePanel.tsx:74` | The URL shape to mirror. `${location.origin}${location.pathname}` is what carries the `/keystone-codex/` sub-path — never hardcode it. |
| `handleExport` | `src/components/route/RoutePanel.tsx:162-165` | Already computes `encodeMdtString(routeToLua(route))`. The link builder needs the same expression and nothing new from the document. |
| `handleImport` / `errorText` | `src/components/route/RoutePanel.tsx:141`, `:84` | The error handling to reuse. Only `MdtUserError` is translated; other codec errors are diagnostics shown verbatim. |
| The room invitation | `src/components/route/RoutePanel.tsx:~554` | Written inline, not as a component. The route offer goes beside it. |
| The `?room=` arrival flow | `src/routes/DungeonPage.tsx:42-63` | The precedent: `declined` holds the specific value refused, and the codex address redirects to the route one keeping the parameter. |
| `luaToRoute` | `src/lib/mdt/route.ts:73-75` | Resolves the slug from `currentDungeonIdx`; throws `MdtUserError('notInPool')` only for a dungeon outside the pool. This is why Task 3 exists. |
| Its tests | `src/routes/DungeonPage.test.tsx:167-225`, `src/components/route/RoutePanel.test.tsx:689-710` | The shape the new tests should match. |

---

### Task 1: Building and copying the link

**Files:**
- Modify: `src/components/route/RoutePanel.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`
- Test: `src/components/route/RoutePanel.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  /** Beside `sessionLink`. The payload is url-encoded; the caller passes the MDT string raw. */
  export function routeLink(slug: string, mdtString: string): string
  /** A link longer than this will not paste into a Discord message. */
  export const LINK_LIMIT = 1900
  ```

- [ ] **Step 1: Add the strings**

`src/lib/i18n/en.ts`, beside the existing `route.*` keys:

```ts
  'route.copyRouteLink': 'Copy a link to this route',
  'route.routeLinkCopied': 'Link copied.',
  'route.routeLinkLong':
    'Link copied, but it is {n} characters — too long for a Discord message. To share a route this size, open a session instead.',
  'route.routeOffer': 'This link carries a route. Loading it replaces the one you have.',
  'route.acceptRoute': 'Load this route',
  'route.declineRoute': 'Keep mine',
  'route.routeWrongDungeon': 'That link’s route is for another dungeon.',
```

`src/lib/i18n/fr.ts`, at the matching position:

```ts
  'route.copyRouteLink': 'Copier un lien vers cette route',
  'route.routeLinkCopied': 'Lien copié.',
  'route.routeLinkLong':
    'Lien copié, mais il fait {n} caractères — trop long pour un message Discord. Pour partager une route de cette taille, ouvrez plutôt une session.',
  'route.routeOffer': 'Ce lien contient une route. La charger remplacera la vôtre.',
  'route.acceptRoute': 'Charger cette route',
  'route.declineRoute': 'Garder la mienne',
  'route.routeWrongDungeon': 'La route de ce lien concerne un autre donjon.',
```

- [ ] **Step 2: Write the failing tests**

Append to `src/components/route/RoutePanel.test.tsx`. Check the file's existing imports first and add
only what is missing — it already imports `RoutePanel`, `sessionLink` and the render helpers.

```tsx
describe('routeLink', () => {
  it('carries the origin, the sub-path, the dungeon and the payload', () => {
    const link = routeLink('altar-of-fangs', 'ABC=+/xyz')
    expect(link.startsWith(`${location.origin}${location.pathname}`)).toBe(true)
    expect(link).toContain('#/d/altar-of-fangs/route?route=')
  })

  it('encodes the payload so an MDT string survives being a query value', () => {
    // MDT strings are base64-ish: `+`, `/` and `=` all mean something else in a URL.
    const payload = 'a+b/c=d&e'
    const link = routeLink('altar-of-fangs', payload)
    const back = new URLSearchParams(link.split('?')[1]).get('route')
    expect(back).toBe(payload)
  })

  it('round-trips a real MDT export unchanged', () => {
    const real = fs.readFileSync(
      path.join(__dirname, '..', '..', 'lib', 'mdt', '__fixtures__', 'real-export.txt'),
      'utf8',
    ).trim()
    const link = routeLink('altar-of-fangs', real)
    expect(new URLSearchParams(link.split('?')[1]).get('route')).toBe(real)
  })
})
```

Add to that file's imports:

```tsx
import fs from 'node:fs'
import path from 'node:path'
import RoutePanel, { routeLink, sessionLink } from './RoutePanel'
```

(keep whatever else the existing import line names).

Then the button, in a new describe:

```tsx
describe('Copying a link to the route', () => {
  it('writes a link to the clipboard and says so', async () => {
    const written: string[] = []
    Object.assign(navigator, {
      clipboard: { writeText: async (t: string) => void written.push(t) },
    })
    // Mount the panel the way this file's other tests do — reuse its existing helper and its
    // recorder for `actions`, rather than building a second harness.
    mountPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Copy a link to this route' }))
    await waitFor(() => expect(written).toHaveLength(1))
    expect(written[0]).toContain('?route=')
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
npx vitest run --project app src/components/route/RoutePanel.test.tsx
```

Expected: FAIL — `routeLink is not a function` on the first three, and
`Unable to find an accessible element with the role "button" and name "Copy a link to this route"`
on the fourth.

- [ ] **Step 4: Add the builder and the limit**

In `src/components/route/RoutePanel.tsx`, immediately after `sessionLink`:

```tsx
/**
 * A link that carries the route itself.
 *
 * Built from `location` for the same reason `sessionLink` is: that is what puts the deployed
 * sub-path (`/keystone-codex/`) in front of the hash. The payload is encoded here rather than by
 * the caller, so there is one place that decides it.
 */
export function routeLink(slug: string, mdtString: string): string {
  return `${location.origin}${location.pathname}#/d/${slug}/route?route=${encodeURIComponent(mdtString)}`
}

/**
 * The length past which a link stops being postable.
 *
 * Not a browser limit — browsers take far more. Discord caps a message at 2000 characters, and
 * Discord is where a route gets handed to a group. A route carrying freehand strokes measures about
 * 2116, so this is a real case and not a theoretical one. The link is still copied: the limit
 * belongs to wherever it is being pasted, and 2116 characters are fine in an email or a wiki.
 */
export const LINK_LIMIT = 1900
```

- [ ] **Step 5: Add the button**

Beside the existing export button (near `handleExport`, around line 201), add a handler next to it:

```tsx
  const handleCopyRouteLink = async () => {
    try {
      const link = routeLink(slug, encodeMdtString(routeToLua(route)))
      await navigator.clipboard.writeText(link)
      onMessage(
        link.length > LINK_LIMIT
          ? { kind: 'error', text: t('route.routeLinkLong', { n: link.length }) }
          : { kind: 'ok', text: t('route.routeLinkCopied') },
      )
    } catch (err) {
      onMessage({ kind: 'error', text: errorText(err, t) })
    }
  }
```

and a button beside the export one, matching its classes:

```tsx
          <button
            onClick={handleCopyRouteLink}
            className="flex-1 rounded border border-ink-700 px-2 py-1 text-xs text-ink-300 hover:border-gold-500 hover:text-gold-400"
          >
            {t('route.copyRouteLink')}
          </button>
```

Note `onMessage({ kind: 'error', ... })` for the over-length case: it is not a failure, but it is the
channel this panel has for something the reader must read, and a success tone would let it pass
unnoticed. If the message component supports a third tone, use that instead and say so in the commit.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npx vitest run --project app src/components/route/RoutePanel.test.tsx
npm run typecheck
```

Expected: PASS, clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/route/RoutePanel.tsx src/components/route/RoutePanel.test.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit -m "Copy a route as a link, and say when it is too long to post"
```

---

### Task 2: Arriving with a route, and being asked

**Files:**
- Modify: `src/routes/DungeonPage.tsx`
- Modify: `src/components/route/RoutePanel.tsx` (the offer card)
- Test: `src/routes/DungeonPage.test.tsx`

**Interfaces:**
- Consumes: `routeLink` and `LINK_LIMIT` from Task 1; `actions.importRoute` from `useRouteDoc`.
- Produces: `RoutePanel` gains three props, all optional so its existing tests keep compiling:
  ```ts
  /** The route a link carries. Null when the address carries none, or it is for another dungeon. */
  pendingRoute?: string | null
  /** True when a route was offered but belongs to a different dungeon. */
  routeWrongDungeon?: boolean
  /** Called only after a successful import, so the page can drop the parameter. */
  onRouteLoaded?: () => void
  onDeclineRoute?: () => void
  ```
  The panel performs the import itself, through its own `errorText` / `onMessage` path — the same
  one `handleImport` uses for a bad paste.

- [ ] **Step 1: Write the failing tests**

Append to `src/routes/DungeonPage.test.tsx`, following the shape of its existing
`Arriving with an invitation link` describe (read lines 167-225 first and reuse its helpers):

```tsx
describe('Arriving with a route link', () => {
  /** A real export, so the test exercises the codec rather than a hand-made string. */
  const payload = fs
    .readFileSync(path.join(__dirname, '..', 'lib', 'mdt', '__fixtures__', 'real-export.txt'), 'utf8')
    .trim()

  it('offers the route rather than loading it', () => {
    mountAt(`/d/altar-of-fangs/route?route=${encodeURIComponent(payload)}`)
    expect(screen.getByText(/This link carries a route/)).toBeDefined()
  })

  it('redirects the codex address to the route one, keeping the route', () => {
    mountAt(`/d/altar-of-fangs/codex?route=${encodeURIComponent(payload)}`)
    expect(screen.getByText(/This link carries a route/)).toBeDefined()
  })

  it('loads nothing until the offer is accepted', () => {
    mountAt(`/d/altar-of-fangs/route?route=${encodeURIComponent(payload)}`)
    // The fresh document has one empty pull; an imported route has more than that.
    expect(screen.queryByText(/Pull 2/)).toBeNull()
  })

  it('drops the offer when it is declined, and shows no card', () => {
    mountAt(`/d/altar-of-fangs/route?route=${encodeURIComponent(payload)}`)
    fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }))
    expect(screen.queryByText(/This link carries a route/)).toBeNull()
  })

  it('shows only the room invitation when the link carries both', () => {
    // Joining replaces the document from the peer, so applying a route first is work thrown
    // away — and two cards at once is a choice nobody asked for.
    mountAt(`/d/altar-of-fangs/route?room=ABC123&route=${encodeURIComponent(payload)}`)
    expect(screen.queryByText(/This link carries a route/)).toBeNull()
    expect(screen.getByText(/Join room ABC123/)).toBeDefined()
  })

  it('refuses a route meant for another dungeon rather than applying it', () => {
    // `real-export.txt` names its own dungeon. Pointed at a different one, its clone references
    // would mean different mobs — a route that looks populated and is nonsense.
    mountAt(`/d/kings-rest/route?route=${encodeURIComponent(payload)}`)
    expect(screen.getByText(/another dungeon/)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Load this route' })).toBeNull()
  })
})
```

Add `import fs from 'node:fs'` and `import path from 'node:path'` to that file if absent, and confirm
which dungeon `real-export.txt` is actually for before writing `kings-rest` above:

```bash
node --input-type=module -e "
import('./src/lib/mdt/string.ts').then(async (m) => {
  const fs = await import('node:fs')
  const s = fs.readFileSync('src/lib/mdt/__fixtures__/real-export.txt','utf8').trim()
  console.log('currentDungeonIdx:', m.decodeMdtString(s).table.get('value').get('currentDungeonIdx'))
})"
```

If that is awkward to run outside Vite, get the same answer from a scratch test instead — but **do
get it**, and pick a `slug` in the "another dungeon" test whose `mdtIndex` differs from it.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run --project app src/routes/DungeonPage.test.tsx
```

Expected: FAIL — no card is rendered, so every `getByText(/This link carries a route/)` fails.

- [ ] **Step 3: Read the parameter in `DungeonPage`**

Beside the existing `room` handling (after line 51):

```tsx
  // The route a share link carries. Held the same way `room` is, and for the same reason: a
  // reader who declined must not be offered it again by the next render, but a reload should
  // offer it again. A room outranks it — joining replaces the document from the peer anyway.
  const [declinedRoute, setDeclinedRoute] = useState<string | null>(null)
  const routeParam = searchParams.get('route')
  const pendingRoute = routeParam && routeParam !== declinedRoute && !pendingRoom ? routeParam : null
```

Extend the existing redirect effect so a `?route=` on the codex address also reaches the route
address. Keep `pendingRoom`'s branch first — it is the one that outranks:

```tsx
  useEffect(() => {
    if (mode === 'route') return
    if (pendingRoom) {
      navigate(`/d/${slug}/route?room=${pendingRoom}`, { replace: true })
      return
    }
    if (pendingRoute) {
      navigate(`/d/${slug}/route?route=${encodeURIComponent(pendingRoute)}`, { replace: true })
    }
  }, [pendingRoom, pendingRoute, mode, navigate, slug])
```

Then the two handlers. Accepting strips the parameter, which is the one place this differs from
`?room=` — see decision 4 in the design:

```tsx
  // Called by the panel once an import has actually succeeded. The parameter is removed rather
  // than left in place: after loading you start editing, and a reload offering the same import
  // again would be offering to destroy those edits. `?room=` stays for the opposite reason —
  // rejoining a room is harmless.
  const routeLoaded = useCallback(() => {
    navigate(`/d/${slug}/route`, { replace: true })
  }, [navigate, slug])

  const declineRoute = useCallback(() => setDeclinedRoute(routeParam), [routeParam])
```

**`DungeonPage` has no message mechanism** — `onMessage` belongs to `RoutePanel`, which already owns
`errorText` and the paste box's error path. So the import itself is done **in the panel**, not here:
this page decides *whether* a route is on offer, and the panel performs it and reports failure the
same way a bad paste does. That is why the callback above is `routeLoaded` (a notification) rather
than `acceptRoute` (a command).

- [ ] **Step 4: Add the dungeon check**

The payload names its own dungeon and the address names another. Decide the mismatch **before**
offering, so a refused link never shows an accept button:

```tsx
  // `luaToRoute` resolves a slug from the payload's `currentDungeonIdx` and only rejects a
  // dungeon outside the season pool — it never compares that against the document being
  // imported into. A link is the first thing to carry a payload and a slug together, so it is
  // the first place they can disagree.
  const routeForThisDungeon = useMemo(() => {
    if (!pendingRoute) return true
    try {
      return luaToRoute(decodeMdtString(pendingRoute).table).slug === slug
    } catch {
      // A payload that will not decode is not a dungeon mismatch; let `acceptRoute` report the
      // codec's own error, which says something useful.
      return true
    }
  }, [pendingRoute, slug])
```

and pass to `RoutePanel`:

```tsx
  pendingRoute={routeForThisDungeon ? pendingRoute : null}
  routeWrongDungeon={Boolean(pendingRoute) && !routeForThisDungeon}
  onRouteLoaded={routeLoaded}
  onDeclineRoute={declineRoute}
```

Import `luaToRoute` from `../lib/mdt/route` and `decodeMdtString` from `../lib/mdt/string`.

- [ ] **Step 5: Add the card to `RoutePanel`**

Beside the room invitation (around line 554), in the same section, so the two read as one family:

```tsx
The panel does the import, reusing the paste box's error path. Add this handler beside
`handleImport`:

```tsx
  const handleAcceptRoute = () => {
    if (!pendingRoute) return
    try {
      actions.importRoute(pendingRoute)
      onRouteLoaded?.()
    } catch (err) {
      // Exactly what a bad paste reports: only `MdtUserError` is translated, the codec's other
      // errors are diagnostics and more useful verbatim.
      onMessage({ kind: 'error', text: errorText(err, t) })
      onDeclineRoute?.()
    }
  }
```

and the card itself:

```tsx
      {pendingRoute && (
        <div className="mb-2 rounded border border-gold-500/40 bg-gold-500/5 p-2">
          <p className="text-[11px] text-ink-300">{t('route.routeOffer')}</p>
          <div className="mt-1.5 flex gap-1.5">
            <button
              onClick={handleAcceptRoute}
              className="flex-1 rounded border border-gold-500/60 px-2 py-1 text-xs text-gold-400 hover:border-gold-500"
            >
              {t('route.acceptRoute')}
            </button>
            <button
              onClick={onDeclineRoute}
              className="rounded border border-ink-700 px-2 py-1 text-xs text-ink-500 hover:text-ink-300"
            >
              {t('route.declineRoute')}
            </button>
          </div>
        </div>
      )}
      {routeWrongDungeon && (
        <p className="mb-2 rounded border border-threat-lethal/40 bg-threat-lethal/5 p-2 text-[11px] text-ink-300">
          {t('route.routeWrongDungeon')}
        </p>
      )}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npx vitest run --project app src/routes/DungeonPage.test.tsx src/components/route/RoutePanel.test.tsx
npm test
npm run typecheck
```

Expected: all clean. `RoutePanel`'s new props are optional, so its existing tests keep compiling.

- [ ] **Step 7: Commit**

```bash
git add src/routes/DungeonPage.tsx src/components/route/RoutePanel.tsx src/routes/DungeonPage.test.tsx
git commit -m "Offer a route a link carries, rather than loading it over yours"
```

---

### Task 3: The round trip in two real browsers

**Files:**
- Create: `e2e/share.spec.ts`

**Interfaces:**
- Consumes: `newParticipant` from `e2e/fixtures.ts` — the helper the join-link scenario already uses
  for a second browser context with clipboard permissions.

- [ ] **Step 1: Read the scenario this mirrors**

```bash
grep -n "newParticipant" -A 20 e2e/session.spec.ts | head -60
```

The join-link test already does the hard parts: build something in one context, copy a link, open it
in a second, accept. Follow it rather than inventing a second way. Note in particular
`e2e/session.spec.ts:31`, which reads the clipboard off the default `page` fixture — proof that the
config's global `permissions` are enough and no special setup is needed for the first half.

- [ ] **Step 2: Write the failing test**

```ts
// ABOUTME: A route handed over as a link, between two real browsers.
// ABOUTME: Proves the sub-path, the encoding and the import all survive the round trip.

import { expect, test } from '@playwright/test'
import { newParticipant } from './fixtures'

test('a link carries a route into another browser', async ({ page, browser }) => {
  await page.goto('./#/d/the-blinding-vale/route')

  // A second pull, so the arrival is distinguishable from a fresh document's single empty one.
  // The label is `route.addPull`, which is the string '+ Pull' — not a sentence.
  await page.getByRole('button', { name: '+ Pull' }).click()

  await page.getByRole('button', { name: 'Copy a link to this route', exact: true }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain('?route=')
  // The deployed sub-path has to be in there, or the link is dead off this machine.
  expect(link).toContain('/keystone-codex/')

  // `newParticipant` returns a BrowserContext — `browser.newContext(...)` — not a page, so a page
  // has to be opened on it. The clipboard read above works because `playwright.config.ts` grants
  // those permissions in its `use` block, for every context; the helper sets them again so it
  // reads correctly on its own terms.
  const context = await newParticipant(browser)
  const second = await context.newPage()
  await second.goto(link)
  await expect(second.getByText(/This link carries a route/)).toBeVisible()

  // Nothing is loaded until it is accepted: that is the whole point of the card.
  await second.getByRole('button', { name: 'Load this route' }).click()
  await expect(second.getByText(/This link carries a route/)).toHaveCount(0)

  await context.close()
})
```

`page` here is the runner's own fixture, which `playwright.config.ts` already gives the `APP` base URL
and `locale: 'en-US'` — that pinned locale is why every English locator in this suite works, since the
app resolves its language from `navigator.languages`. The hand-made context inherits both.

- [ ] **Step 3: Run it, watching it fail first**

```bash
npx playwright install chromium
npm run test:e2e -- share.spec.ts
```

Ports 4173 and 8787 must be free. A stray `[WebServer] ... Uncaught Error: internal error` line from
the relay is **recorded in CLAUDE.md as known and undiagnosed** — it is not this task's doing.

- [ ] **Step 4: Run the whole suite**

```bash
npm run test:e2e
```

- [ ] **Step 5: Commit**

```bash
git add e2e/share.spec.ts
git commit -m "Prove a route link survives into a second browser"
```

---

## Final verification

- [ ] `npm test` — green, output pristine
- [ ] `npm run typecheck` — clean
- [ ] `npm run build` — succeeds
- [ ] `npm run test:e2e` — green
- [ ] By hand in `npm run dev`: copy a link from a route with a few pulls, open it in a private
      window, decline it, reload, accept it, then reload again and confirm **no second offer**
- [ ] By hand: draw enough freehand strokes to push the link past 1900 characters and confirm the
      warning names the length and points at the session
- [ ] By hand: edit the slug in a copied link to another dungeon and confirm it refuses

## Follow-up to raise separately, not here

`importRoute` does not check that a pasted string's dungeon matches the document's — pasting dungeon
A's MDT string into dungeon B's panel is accepted today and writes pulls whose clone references mean
different mobs. Task 2 fixes this **for the link path only**, deliberately. Open an issue for the
paste path, using decision 7 of the design as its description.
