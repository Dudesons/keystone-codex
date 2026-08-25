// ABOUTME: What every end-to-end scenario needs: a room nobody else is in, and a way in.
// ABOUTME: Deliberately thin — a helper that hides which button was clicked hides the test.

import { expect, type Browser, type Page, type ViewportSize } from '@playwright/test'
import { APP } from './urls'

/**
 * A second participant's browser.
 *
 * `browser.newContext()` does inherit the config's `use` block for any key the call omits, so the
 * base URL and the clipboard permissions would reach a hand-made context either way. They are
 * still passed here, deliberately: this helper should read correctly on its own terms, without
 * requiring the reader to hold the config's defaults in mind.
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
 * page, where the route address has not been visited yet. Going straight to `/route` needs no tab
 * click — it is the tab's own address.
 *
 * The room code is not returned. The only caller that needs it reads it from the share link, which
 * is the value under test there anyway; scraping it out of the panel would mean pinning a Tailwind
 * class as though it were an interface.
 */
export async function openSession(page: Page, slug: string, name: string) {
  await page.goto(`./#/d/${slug}/route`)
  await page.getByLabel('Your name').fill(name)
  await page.getByRole('button', { name: 'Open a session with this route' }).click()
  await expect(page.getByText('SHARED SESSION')).toBeVisible()
}

/**
 * Arrive by join link and accept. The link already points at the route address, so the invitation
 * is there from the first paint — no tab has to be clicked here.
 *
 * Everything is asked of the dialog rather than the page: the panel behind it carries a second
 * name field bound to the same identity, so an unscoped `getByLabel` matches two elements and
 * Playwright's strict mode refuses it. Scoping also keeps this helper honest about where an
 * arriving guest actually types — the panel's copy is out of reach behind the backdrop.
 */
export async function acceptInvitation(page: Page, slug: string, room: string, name: string) {
  await page.goto(`./#/d/${slug}/route?room=${room}`)
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Your name').fill(name)
  await dialog.getByRole('button', { name: `Join room ${room}` }).click()
  await expect(page.getByText('SHARED SESSION')).toBeVisible()
}
