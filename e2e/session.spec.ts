// ABOUTME: The four things only a browser can prove about a shared session.
// ABOUTME: A real socket, a real join link, real layout, and real localStorage.

import { test, expect } from '@playwright/test'
import { acceptInvitation, firstDungeonSlug, newParticipant, openSession, roomCode } from './fixtures'
import { APP } from './urls'

/** Escapes the characters `RegExp` gives meaning to, so a literal URL can sit inside a pattern. */
const reEscape = (literal: string) => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

test('the relay accepts a socket from the origin it actually serves', async ({ page }) => {
  const slug = await firstDungeonSlug(page)
  const room = roomCode()

  await acceptInvitation(page, slug, room, 'Canary')

  // "connecting…" would mean the socket never opened — a wrong entry in the relay's origin
  // allowlist looks exactly like this, and no unit test can see it: the relay's own tests choose
  // the Origin header they send.
  await expect(page.getByText('1 connected')).toBeVisible()
})

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
  // is `randomRoomCode`'s: six characters, with I, O, 0 and 1 left out. Built from `APP` rather than
  // a literal, so a port change here does not leave a stale string behind — `APP` still comes from
  // `e2e/urls.ts`, independent of the page's own `location`.
  expect(link).toMatch(new RegExp(`^${reEscape(APP)}#/d/${slug}/route\\?room=[A-HJ-NP-Z2-9]{6}$`))
  const room = link.slice(link.indexOf('?room=') + '?room='.length)

  const guest = await newParticipant(browser)
  const guestPage = await guest.newPage()
  await guestPage.goto(link)
  await expect(guestPage.getByRole('button', { name: `Join room ${room}` })).toBeVisible()
  await guest.close()
})

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

test('a local route is set aside on joining and given back on leaving', async ({ page }) => {
  const slug = await firstDungeonSlug(page)
  const room = roomCode()

  // A local draft, in real localStorage rather than jsdom's.
  await page.goto(`./#/d/${slug}/route`)
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
