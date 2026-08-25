// ABOUTME: Search in a real browser: the shortcut opens it, an id lands on the right mob's card.
// ABOUTME: Runs under the deployed sub-path, so a wrong base URL fails here as it would live.

import { expect, test } from '@playwright/test'

/** Sporeblight Belcher, in The Blinding Vale. The tips suite already rests on this id. */
const NPC_ID = 254850

test('an id typed into the palette lands on that mob’s card', async ({ page }) => {
  await page.goto('./#/d/the-blinding-vale/route')

  // The keydown listener exists only once React has mounted, and `goto` resolves before
  // that: a shortcut pressed too early is simply lost. The button is proof the provider is up.
  const trigger = page.getByRole('button', { name: 'Search', exact: true })
  await expect(trigger).toBeVisible()

  // Ctrl+K from the route tab, which is the case the overlay exists for: the panels fill the
  // viewport and there is nowhere a search field could have gone.
  await page.keyboard.press('Control+k')
  const box = page.getByRole('combobox')
  await expect(box).toBeVisible()

  // An id rather than a name, so the assertion rests on the data and not on Wowhead's wording.
  await box.fill(String(NPC_ID))
  const row = page.getByTestId(`hit-${NPC_ID}`)
  await expect(row).toBeVisible()
  await row.click()

  await expect(page).toHaveURL(new RegExp(`/d/the-blinding-vale/codex/mob/${NPC_ID}`))
  await expect(page.getByRole('combobox')).toHaveCount(0)
})

test('a spell reaches the mob that casts it', async ({ page }) => {
  // Belch Spores, one of Sporeblight Belcher's six spells — the same spell CONTRIBUTING uses as
  // its worked example. Searched by id rather than name so the assertion does not rest on
  // Wowhead's wording, which the pipeline may re-fetch at any time.
  const SPELL_ID = 1263636

  await page.goto('./#/d/the-blinding-vale')

  // The keydown listener exists only once React has mounted, and `goto` resolves before
  // that: a shortcut pressed too early is simply lost. The button is proof the provider is up.
  const trigger = page.getByRole('button', { name: 'Search', exact: true })
  await expect(trigger).toBeVisible()
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox').fill(String(SPELL_ID))

  const row = page.getByTestId(`hit-${NPC_ID}`)
  await expect(row).toBeVisible()
  // The row has to say why it is a row, or a list of mobs after typing a spell is a mystery.
  await expect(row).toContainText('casts')

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/d\/the-blinding-vale\/codex\/mob\//)
})

test('the search button opens the palette without the shortcut', async ({ page }) => {
  await page.goto('./')
  // `exact` because "Search" is a substring of the palette's own "Search mobs and spells" label.
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('combobox')).toBeVisible()
})
