// ABOUTME: The four things only a browser can prove about a shared session.
// ABOUTME: A real socket, a real join link, real layout, and real localStorage.

import { test, expect } from '@playwright/test'
import { acceptInvitation, firstDungeonSlug, roomCode } from './fixtures'

test('the relay accepts a socket from the origin it actually serves', async ({ page }) => {
  const slug = await firstDungeonSlug(page)
  const room = roomCode()

  await acceptInvitation(page, slug, room, 'Canary')

  // "connecting…" would mean the socket never opened — a wrong entry in the relay's origin
  // allowlist looks exactly like this, and no unit test can see it: the relay's own tests choose
  // the Origin header they send.
  await expect(page.getByText('1 connected')).toBeVisible()
})
