// ABOUTME: A card that demotes its mob, in the real build: the briefing lists three bosses.
// ABOUTME: MDT flags four for Den of Nalorakk; the fourth is an add fought during an encounter.

import { test, expect } from '@playwright/test'

/** Echo of Nalorakk: 3.4M health against Nalorakk's 21.9M, and MDT's boss flag anyway. */
const ECHO = 247301

test('the briefing lists the three bosses Den of Nalorakk has, not the four MDT flags', async ({
  page,
}) => {
  await page.goto('./#/d/den-of-nalorakk')

  // `data-boss` is the strip's own landmark, one per card — the same kind of hook as
  // `data-clone` on a blip.
  const cards = page.locator('[data-boss]')
  await expect(cards.first()).toBeVisible()
  await expect(cards).toHaveCount(3)
  await expect(page.locator(`[data-boss="${ECHO}"]`)).toHaveCount(0)
})

test('the demoted mob is marked in place rather than dropped from the briefing', async ({ page }) => {
  await page.goto('./#/d/den-of-nalorakk')
  // It is still a mob a group meets, so it keeps its row and says what it is there.
  const row = page.locator(`[data-mob="${ECHO}"]`)
  await expect(row).toBeVisible()
  await expect(row.getByText('MINIBOSS')).toBeVisible()
})
