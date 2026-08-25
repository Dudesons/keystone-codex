// ABOUTME: A route handed over as a link, between two real browsers.
// ABOUTME: Proves the sub-path, the encoding and the import all survive the round trip.

import { expect, test } from '@playwright/test'
import { newParticipant } from './fixtures'

test('a link carries a route into another browser', async ({ page, browser }) => {
  await page.goto('./#/d/the-blinding-vale/route')

  // A second pull, so what arrives is distinguishable from the single empty one a fresh
  // document starts with. The label is `route.addPull`, which is the string '+ Pull'.
  await page.getByRole('button', { name: '+ Pull' }).click()
  await expect(page.getByText('PULLS · 2')).toBeVisible()

  await page.getByRole('button', { name: 'Copy a link to this route' }).click()
  await expect(page.getByText('Link copied.')).toBeVisible()

  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain('?route=')
  // The deployed sub-path has to be in there, or the link is dead off this machine.
  expect(link).toContain('/keystone-codex/')

  // `newParticipant` returns a BrowserContext, not a page, so a page is opened on it. The
  // clipboard read above works because the config grants those permissions to every context.
  const context = await newParticipant(browser)
  const second = await context.newPage()
  try {
    await second.goto(link)
    await expect(second.getByText('This link carries a route')).toBeVisible()

    // Nothing is loaded until it is accepted: that is the whole point of the card.
    await expect(second.getByText('PULLS · 1')).toBeVisible()

    await second.getByRole('button', { name: 'Load this route' }).click()
    await expect(second.getByText('PULLS · 2')).toBeVisible()
    await expect(second.getByText('This link carries a route')).toHaveCount(0)
  } finally {
    await context.close()
  }
})

test('a link declined leaves the local route alone', async ({ page, browser }) => {
  await page.goto('./#/d/the-blinding-vale/route')
  await page.getByRole('button', { name: '+ Pull' }).click()
  await page.getByRole('button', { name: '+ Pull' }).click()
  await expect(page.getByText('PULLS · 3')).toBeVisible()

  await page.getByRole('button', { name: 'Copy a link to this route' }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())

  const context = await newParticipant(browser)
  const second = await context.newPage()
  try {
    await second.goto(link)
    await second.getByRole('button', { name: 'Keep mine' }).click()
    await expect(second.getByText('This link carries a route')).toHaveCount(0)
    // Still the fresh document it arrived with.
    await expect(second.getByText('PULLS · 1')).toBeVisible()
  } finally {
    await context.close()
  }
})
