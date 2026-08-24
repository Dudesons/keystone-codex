// ABOUTME: The credit line: what the app is built on, and what belongs to somebody else.
// ABOUTME: NOTICE.md says all of this to whoever clones the repository; this says it on screen.

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import SiteFooter from './SiteFooter'
import { mdtRelease } from '../lib/data'
import { renderEn, renderFr } from '../test/render'

afterEach(cleanup)

const href = (name: string | RegExp) => screen.getByRole('link', { name }).getAttribute('href')

describe('Crediting the sources', () => {
  it('names the MDT release the data was extracted from', () => {
    renderEn(<SiteFooter />)
    expect(screen.getByText(new RegExp(mdtRelease.version))).toBeDefined()
  })

  it('links to Mythic Dungeon Tools', () => {
    renderEn(<SiteFooter />)
    expect(href('Mythic Dungeon Tools')).toBe('https://github.com/Nnoggie/MythicDungeonTools')
  })

  it('links to Wowhead, where the spell and creature labels come from', () => {
    renderEn(<SiteFooter />)
    expect(href('Wowhead')).toBe('https://www.wowhead.com')
  })

  it('says the project is not endorsed by Blizzard', () => {
    renderEn(<SiteFooter />)
    expect(screen.getByText(/neither affiliated with nor endorsed by/i)).toBeDefined()
  })

  it('links to the licence the project is under', () => {
    renderEn(<SiteFooter />)
    expect(href('GPL-2.0')).toBe(
      'https://github.com/Dudesons/keystone-codex/blob/main/LICENSE',
    )
  })

  it('links to the source, which is what the licence is about', () => {
    renderEn(<SiteFooter />)
    expect(href('Source')).toBe('https://github.com/Dudesons/keystone-codex')
  })
})

describe('Speaking the reader’s language', () => {
  it('credits in French for a French reader', () => {
    renderFr(<SiteFooter />)
    // Not on "Mythic Dungeon Tools": the product name is the same in both languages and appears
    // in the sentence *and* in the link label, so it says nothing about which one is rendered.
    expect(screen.getByText(/Données de mobs, packs, forces et cartes/)).toBeDefined()
    expect(screen.getByText(/ni affilié à Blizzard Entertainment ni approuvé par/i)).toBeDefined()
  })

  it('sends an English reader to the English contributor guide', () => {
    renderEn(<SiteFooter />)
    expect(href(/contribut/i)).toBe(
      'https://github.com/Dudesons/keystone-codex/blob/main/CONTRIBUTING.md',
    )
  })

  it('sends a French reader to the French one, which exists', () => {
    renderFr(<SiteFooter />)
    expect(href(/contribu/i)).toBe(
      'https://github.com/Dudesons/keystone-codex/blob/main/CONTRIBUTING.fr.md',
    )
  })
})
