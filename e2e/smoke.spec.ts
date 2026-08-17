// ABOUTME: Proves the harness itself: the production build, served on its deployed sub-path.
// ABOUTME: Asserts nothing about collaboration — the other specs do that.

import { test, expect } from '@playwright/test'

test('the built app loads on the deployed path shape', async ({ page }) => {
  const response = await page.goto('./')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/Keystone Codex/)

  expect(page.url()).toContain('/keystone-codex/')

  // The dungeon pool arrived, so the generated data is really being served — relative asset paths
  // are what let the same build load equally at the root and under this sub-path, and a build that
  // lost that would fail to reach this point rather than merely fail this line.
  await expect(page.locator('a[href*="#/d/"]').first()).toBeVisible()
})
