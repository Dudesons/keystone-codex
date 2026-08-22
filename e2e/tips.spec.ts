// ABOUTME: A video tip in the real build: no frame before the click, the right frame after.
// ABOUTME: Never loads YouTube itself — the assertion is on the iframe's src, not on its content.

import { test, expect } from '@playwright/test'

/** Naowh's Short on the pull after the first boss, committed on Sporeblight Belcher's card. */
const VIDEO_ID = '9D0gCU8Tp5Y'

test('a video tip loads its embed only once the reader asks', async ({ page }) => {
  const requestedUrls: string[] = []
  page.on('request', (req) => requestedUrls.push(req.url()))

  await page.goto('./#/d/the-blinding-vale/codex/mob/254850')

  const card = page.locator('[data-npc="254850"]')
  await expect(card).toBeVisible()

  // Before the click the page has contacted nobody: the button is ours, the frame is not. The
  // missing iframe is a good proxy, but only a network assertion proves the stronger claim.
  await expect(card.locator('iframe')).toHaveCount(0)
  const contactedYouTube = requestedUrls.some((url) => /youtube|ytimg|googlevideo/.test(new URL(url).hostname))
  expect(contactedYouTube).toBe(false)

  await card.getByRole('button', { name: /Naowh/ }).click()

  const frame = card.locator('iframe')
  await expect(frame).toHaveCount(1)
  await expect(frame).toHaveAttribute('src', new RegExp(`youtube-nocookie\\.com/embed/${VIDEO_ID}`))
})

test('the link out survives the deployed sub-path', async ({ page }) => {
  await page.goto('./#/d/the-blinding-vale/codex/mob/254850')

  const link = page.locator('[data-npc="254850"]').getByRole('link', { name: 'Open on YouTube' })
  await expect(link).toHaveAttribute('href', `https://www.youtube.com/watch?v=${VIDEO_ID}`)
})
