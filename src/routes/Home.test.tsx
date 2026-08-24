// ABOUTME: Tests the home page against the real season pool.
// ABOUTME: Covers the dungeon cards, the codex progress bar and the language switcher.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { contentProgress, getDungeonContent } from '../lib/content'
import { dungeonList, getDungeon } from '../lib/data'
import { renderEn } from '../test/render'
import Home from './Home'
import { mdtRelease } from '../lib/data'

afterEach(cleanup)

const mount = () => renderEn(<Home />, { wrapper: MemoryRouter })

describe('Dungeon list', () => {
  it('shows one card per dungeon in the pool', () => {
    const { container } = mount()
    expect(container.querySelectorAll('a[href^="/d/"]')).toHaveLength(dungeonList.length)
  })

  it('links to every dungeon page', () => {
    const { container } = mount()
    for (const d of dungeonList) {
      expect(container.querySelector(`a[href="/d/${d.slug}"]`), d.slug).not.toBeNull()
    }
  })

  it('names every dungeon', () => {
    mount()
    for (const d of dungeonList) {
      expect(screen.getByText(d.englishName)).toBeDefined()
    }
  })

  it('summarizes bosses, packs and forces', () => {
    const { container } = mount()
    const first = dungeonList[0]
    const card = container.querySelector(`a[href="/d/${first.slug}"]`) as HTMLElement
    const text = within(card)
    expect(text.getByText(`${first.bosses} ${first.bosses === 1 ? 'boss' : 'bosses'}`)).toBeDefined()
    expect(text.getByText(`${first.packCount} packs`)).toBeDefined()
    expect(text.getByText(`${first.totalCount} forces`)).toBeDefined()
  })
})

describe('Codex progress', () => {
  it('counts written entries against the number of distinct mobs', () => {
    const { container } = mount()
    const first = dungeonList[0]
    const dungeon = getDungeon(first.slug)!
    const expected = contentProgress(first.slug, [...new Set(dungeon.enemies.map((e) => e.id))])
    const card = container.querySelector(`a[href="/d/${first.slug}"]`) as HTMLElement
    expect(within(card).getByText(`${expected.written}/${expected.total} cards`)).toBeDefined()
  })

  it('reflects the progress in the bar width', () => {
    const { container } = mount()
    const first = dungeonList[0]
    const dungeon = getDungeon(first.slug)!
    const { written, total } = contentProgress(
      first.slug,
      [...new Set(dungeon.enemies.map((e) => e.id))],
    )
    const card = container.querySelector(`a[href="/d/${first.slug}"]`) as HTMLElement
    const bar = card.querySelector<HTMLElement>('.bg-gold-500')!
    expect(bar.style.width).toBe(`${total ? (written / total) * 100 : 0}%`)
  })
})

describe('Dungeon metadata', () => {
  it('shows timer and summary only once they are filled in', () => {
    const { container } = mount()
    for (const d of dungeonList) {
      const content = getDungeonContent(d.slug)
      const card = container.querySelector(`a[href="/d/${d.slug}"]`) as HTMLElement
      if (!content?.timer) {
        expect(within(card).queryByText(/ min$/), d.slug).toBeNull()
      }
      if (content?.summary) {
        expect(within(card).getByText(content.summary), d.slug).toBeDefined()
      }
    }
  })
})

describe('Page landmarks', () => {
  it('announces which season it covers', () => {
    mount()
    expect(screen.getByText('MIDNIGHT · SEASON 2')).toBeDefined()
    expect(screen.getByText('Mythic+ Codex')).toBeDefined()
  })

  it('offers the language switcher and flips the whole chrome', () => {
    mount()
    const enButton = screen.getByRole('button', { name: 'EN' })
    expect(enButton.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'FR' }))
    expect(screen.getByText('MIDNIGHT · SAISON 2')).toBeDefined()
    expect(screen.getByText('Codex Mythique+')).toBeDefined()
  })

  it('points at `content/` for writing', () => {
    const { container } = mount()
    expect(container.textContent).toContain('content/')
  })
})

describe('Credits', () => {
  it('credits MDT and Wowhead, and says the project is not Blizzard’s', () => {
    mount()
    expect(screen.getByRole('link', { name: 'Mythic Dungeon Tools' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Wowhead' })).toBeDefined()
    expect(screen.getByText(/neither affiliated with nor endorsed by/i)).toBeDefined()
  })

  it('names the MDT release the map and the forces came out of', () => {
    const { container } = mount()
    expect(container.textContent).toContain(mdtRelease.version)
  })
})
