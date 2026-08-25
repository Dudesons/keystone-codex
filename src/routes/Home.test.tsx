// ABOUTME: Tests the home page against the real season pool.
// ABOUTME: Covers the dungeon cards, the codex progress bar and the language switcher.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { contentProgress, getDungeonContent } from '../lib/content'
import { dungeonList, getDungeon } from '../lib/data'
import { getHighlights } from '../lib/highlights'
import { renderEn } from '../test/render'
import Home from './Home'
import { SearchProvider } from '../components/SearchPalette'
import { mdtRelease } from '../lib/data'

afterEach(cleanup)

/**
 * `Home` calls `useSearch`, which throws outside a provider — so every test in this file reads
 * through a mount that supplies one. Written as nested elements rather than the `wrapper` option
 * because two wrappers do not fit it; `renderIn` nests a caller's wrapper inside the locale
 * provider, so this is equivalent.
 */
const mount = () =>
  renderEn(
    <MemoryRouter>
      <SearchProvider>
        <Home />
      </SearchProvider>
    </MemoryRouter>,
  )

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
    const bosses = getHighlights(first.slug).bosses.length
    expect(text.getByText(`${bosses} ${bosses === 1 ? 'boss' : 'bosses'}`)).toBeDefined()
    expect(text.getByText(`${first.packCount} packs`)).toBeDefined()
    expect(text.getByText(`${first.totalCount} forces`)).toBeDefined()
  })

  /**
   * Counted where `rank` is resolved, not from the `bosses` field the extraction writes out of
   * MDT's `isBoss`. Asserted for every dungeon rather than the first, because the first one in
   * the pool is a dungeon where the two happen to agree — which is why the assertion above
   * could never have caught this on its own.
   */
  it('counts a demoted mob as no boss, on every dungeon in the pool', () => {
    const { container } = mount()
    for (const d of dungeonList) {
      const card = container.querySelector(`a[href="/d/${d.slug}"]`) as HTMLElement
      const n = getHighlights(d.slug).bosses.length
      expect(within(card).getByText(`${n} ${n === 1 ? 'boss' : 'bosses'}`), d.slug).toBeDefined()
    }
  })

  /**
   * The concrete regression, named so it cannot be silently generalised away. MDT 6.2.8 flags
   * eight bosses in Ruby Life Pools; four of them carry `rank: miniboss`, and its own briefing
   * lists four. The home card used to be the one page that said eight.
   */
  it('says four bosses for Ruby Life Pools, where MDT flags eight', () => {
    expect(dungeonList.find((d) => d.slug === 'ruby-life-pools')!.bosses).toBe(8)
    expect(getHighlights('ruby-life-pools').bosses).toHaveLength(4)

    const { container } = mount()
    const card = container.querySelector('a[href="/d/ruby-life-pools"]') as HTMLElement
    expect(within(card).getByText('4 bosses')).toBeDefined()
    expect(within(card).queryByText('8 bosses')).toBeNull()
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

describe('Search', () => {
  it('offers a way in, since a shortcut nobody knows is a feature nobody has', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.getByRole('combobox')).toBeDefined()
  })
})
