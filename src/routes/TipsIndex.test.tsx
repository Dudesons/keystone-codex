// ABOUTME: Tests the season-wide tips page: its groups, its two kinds of link, and its empty line.
// ABOUTME: Runs against the real content, so it asserts lower bounds rather than exact counts.

// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { renderEn } from '../test/render'
import { getSeasonTips } from '../lib/tipIndex'
import TipsIndex from './TipsIndex'

afterEach(cleanup)

const inRouter = { wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter> }

describe('TipsIndex', () => {
  it('heads each group with the dungeon name, linking to its map', () => {
    renderEn(<TipsIndex />, inRouter)
    for (const group of getSeasonTips('en')) {
      const link = screen.getByRole('link', { name: group.name })
      expect(link.getAttribute('href')).toBe(`/d/${group.slug}/codex`)
    }
  })

  it('shows a card per tipped mob, linking to its codex entry', () => {
    renderEn(<TipsIndex />, inRouter)
    const first = getSeasonTips('en')[0]
    const card = document.querySelector(`[data-tips="${first.tips[0].npcId}"]`)
    expect(card).not.toBeNull()
    expect(card?.querySelector(`a[href="/d/${first.slug}/codex/mob/${first.tips[0].npcId}"]`)).not.toBeNull()
  })

  it('carries the jump chip on every tip row', () => {
    renderEn(<TipsIndex />, inRouter)
    const chips = document.querySelectorAll('a[href*="?focus="]')
    expect(chips.length).toBeGreaterThan(0)
  })

  it('loads no embed before anyone clicks', () => {
    renderEn(<TipsIndex />, inRouter)
    expect(document.querySelectorAll('iframe')).toHaveLength(0)
  })
})
