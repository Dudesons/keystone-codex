// ABOUTME: Proves the harness itself: the production build, served on its deployed sub-path.
// ABOUTME: Asserts nothing about collaboration — the other specs do that.

import { test, expect } from '@playwright/test'

test('the built app loads on the deployed path shape', async ({ page }) => {
  const response = await page.goto('./')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/Keystone Codex/)

  // Relative asset paths are what make one build work at the root and under a sub-path alike.
  expect(page.url()).toContain('/keystone-codex/')

  // The dungeon pool arrived, so the generated data is really being served.
  await expect(page.locator('a[href*="#/d/"]').first()).toBeVisible()
})
