// ABOUTME: What only two real browsers can prove: a stroke arrives while it is being drawn.
// ABOUTME: The gesture is a real pointer drag, because jsdom models neither capture nor throughput.

import { test, expect } from '@playwright/test'
import { acceptInvitation, firstDungeonSlug, newParticipant, openSession } from './fixtures'

test('a stroke reaches the room while it is still being drawn, then stays', async ({ page, browser }) => {
  const slug = await firstDungeonSlug(page)
  await openSession(page, slug, 'Artist')

  // `openSession` does not return the room code (see `fixtures.ts`): the only place it appears
  // is the share link behind `Copy the link`, the same route `session.spec.ts` already takes.
  await page.getByRole('button', { name: 'Copy the link' }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  const room = link.slice(link.indexOf('?room=') + '?room='.length)
  expect(room, 'the copied link should carry a room code').toBeTruthy()

  const watcherContext = await newParticipant(browser)
  const watcher = await watcherContext.newPage()
  await acceptInvitation(watcher, slug, room, 'Watcher')

  await page.getByRole('button', { name: 'Draw', exact: true }).click()

  const surface = page.getByTestId('draw-surface')
  const box = (await surface.boundingBox())!
  const start = { x: box.x + box.width * 0.3, y: box.y + box.height * 0.4 }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  for (let i = 1; i <= 8; i += 1) {
    await page.mouse.move(start.x + i * 12, start.y + i * 6)
  }

  // Mid-gesture: the watcher already sees it, because it rides on awareness and not the document.
  await expect(watcher.locator('[data-peer-drawing]')).toBeVisible()

  // Release outside the surface's own bounds — over the tool panel beside the map, well within
  // the page but off the element the gesture started on. Without `setPointerCapture` on press,
  // this `pointerup` lands on whatever is now underneath the pointer instead of on the surface,
  // and the surface never hears its own release: the gesture neither commits nor clears, and the
  // preview it leaves behind keeps broadcasting to every peer. jsdom cannot model this at all —
  // it has no notion of pointer capture or of a release landing on a different element.
  await page.mouse.move(box.x - 40, start.y)
  await page.mouse.up()

  // And after release it is a committed stroke on both sides, with no peer preview left over.
  await expect(page.locator('[data-testid^="stroke-"]')).toHaveCount(1)
  await expect(watcher.locator('[data-testid^="stroke-"]')).toHaveCount(1)
  await expect(watcher.locator('[data-peer-drawing]')).toHaveCount(0)

  await watcherContext.close()
})
