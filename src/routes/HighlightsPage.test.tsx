// ABOUTME: Mounts the highlights page against the real Altar of Fangs pool, in both languages.
// ABOUTME: Checks the page exists, names the dungeon, and offers the way to the codex and route.

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import HighlightsPage from './HighlightsPage'
import { getLookup } from '../lib/data'
import { renderEn, renderFr } from '../test/render'

afterEach(cleanup)

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!

const at = (path: string) => (
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/d/:slug" element={<HighlightsPage />} />
      <Route path="/" element={<p>home</p>} />
    </Routes>
  </MemoryRouter>
)

describe('Unknown dungeon', () => {
  it('says so instead of crashing, and offers a way home', () => {
    renderEn(at('/d/no-such-dungeon'))
    expect(screen.getByText('Unknown dungeon.')).toBeDefined()
    expect(screen.getByText('Back to home')).toBeDefined()
  })
})

describe('Header', () => {
  it('names the dungeon and sums up its forces and packs', () => {
    const { container } = renderEn(at(`/d/${SLUG}`))
    const header = container.querySelector('header')!
    expect(within(header).getByText(lookup.dungeon.englishName)).toBeDefined()
    expect(header.textContent).toContain(`${lookup.dungeon.totalCount} forces`)
  })

  it('offers the codex and the route, each at its own address', () => {
    const { container } = renderEn(at(`/d/${SLUG}`))
    expect(container.querySelector(`a[href="/d/${SLUG}/codex"]`)).not.toBeNull()
    expect(container.querySelector(`a[href="/d/${SLUG}/route"]`)).not.toBeNull()
  })

  it('speaks French when the reader does', () => {
    const { container } = renderFr(at(`/d/${SLUG}`))
    expect(container.querySelector('header')!.textContent).toContain('Résumé')
  })
})

describe('The three blocks', () => {
  it('assembles the headings the dungeon has content for', () => {
    // Altar of Fangs itself has no heading left to assert on here: every one of its non-boss
    // traps now sits on a mob's row instead of the trap list (0 leftovers, matching the
    // measured table), so its own page never renders "OTHER TRAPS" at all. Murder Row still
    // has 16 leftovers and proves the heading renders where content warrants it.
    renderEn(at('/d/murder-row'))
    expect(screen.getByText('MOBS TO KNOW')).toBeDefined()
    expect(screen.getByText('OTHER TRAPS')).toBeDefined()
    expect(screen.getByText('BOSSES')).toBeDefined()
  })

  it("shows no trap heading for a dungeon whose shortlist claims every trap", () => {
    renderEn(at(`/d/${SLUG}`))
    expect(screen.queryByText('OTHER TRAPS')).toBeNull()
  })
})
