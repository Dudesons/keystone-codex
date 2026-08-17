// ABOUTME: The four things only a browser can prove about a shared session.
// ABOUTME: A real socket, a real join link, real layout, and real localStorage.

import { test, expect } from '@playwright/test'
import { acceptInvitation, firstDungeonSlug, newParticipant, openSession, roomCode } from './fixtures'

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
