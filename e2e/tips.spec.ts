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

test('the map marks the pull a tip is about', async ({ page }) => {
  await page.goto('./#/d/the-blinding-vale/route')
  await expect(page.locator('[data-badge="tips"][data-pack="44"]')).toBeVisible()
})

test('marks one pull, not every clone of the mob the tip is written on', async ({ page }) => {
  await page.goto('./#/d/the-blinding-vale/route')
  // Blips are addressed by clone id (enemyIndex:cloneIndex), never by npc id — Sporeblight
  // Belcher is enemy index 4, so its clones are the `5:` group, and 5:10 is the one standing
  // in pack 44. Eleven marks here would be the noise `packs:` answers; one on a blip would
  // mean the advice had been pinned to a mob rather than to the pull it is about.
  await expect(page.locator('[data-clone="5:10"]')).toBeVisible()
  await expect(page.locator('[data-clone="5:10"] [data-badge="tips"]')).toHaveCount(0)
  await expect(page.locator('[data-badge="tips"]')).toHaveCount(1)
})

test('the briefing page loads no embed until asked', async ({ page }) => {
  const thirdParty: string[] = []
  page.on('request', (r) => {
    if (/youtube|ytimg|googlevideo/.test(new URL(r.url()).hostname)) thirdParty.push(r.url())
  })

  await page.goto('./#/d/the-blinding-vale')
  const card = page.locator(`[data-tips="254850"]`)
  await expect(card).toBeVisible()
  expect(thirdParty).toEqual([])
  await expect(card.locator('iframe')).toHaveCount(0)

  await card.getByRole('button').first().click()
  await expect(card.locator('iframe')).toHaveAttribute(
    'src',
    new RegExp(`youtube-nocookie\\.com/embed/${VIDEO_ID}`),
  )
})

/**
 * Folding drops the frame rather than hiding it.
 *
 * The unit tests already assert the iframe leaves the DOM. This one is here for what only a
 * real browser can show: that the same row folds and unfolds the same video repeatedly, in a
 * build where the embed really did load. The open-then-fold shape is also what keeps the test
 * honest — a locator that matched nothing would fail at the first assertion, not silently pass
 * the second.
 */
test('a reader can fold a video away again, and open it once more', async ({ page }) => {
  await page.goto('./#/d/the-blinding-vale/codex/mob/254850')

  const card = page.locator('[data-npc="254850"]')
  const row = card.getByRole('button', { name: /Naowh/ })

  await row.click()
  await expect(card.locator('iframe')).toHaveCount(1)
  await expect(row).toHaveAttribute('aria-expanded', 'true')

  await row.click()
  await expect(card.locator('iframe')).toHaveCount(0)
  await expect(row).toHaveAttribute('aria-expanded', 'false')

  await row.click()
  await expect(card.locator('iframe')).toHaveCount(1)
})
