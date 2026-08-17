// ABOUTME: Tests a dungeon page with the map and both side panels mounted together.
// ABOUTME: Covers the header, the tab switch, and an unknown dungeon.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getLookup } from '../lib/data'
import { renderEn, renderFr } from '../test/render'
import DungeonPage from './DungeonPage'

afterEach(cleanup)

beforeAll(() => {
  // jsdom implements neither of these. The codex panel scrolls to the clicked unit, and the
  // map watches its container to size the viewBox. Both are inert here: jsdom lays
  // everything out at zero, so there is nothing to observe and nowhere to scroll.
  Element.prototype.scrollIntoView = () => {}
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

beforeEach(() => {
  // The route lives in localStorage between mounts, which would leak across tests.
  localStorage.clear()
})

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!

/**
 * DungeonPage reads its slug from the URL, so it has to be mounted behind a real router.
 * Mounting it also mounts the map and whichever side panel the tab selects — this is the
 * seam where the three come together.
 */
const at = (path: string) => (
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/d/:slug" element={<DungeonPage />} />
      <Route path="/d/:slug/mob/:npcId" element={<DungeonPage />} />
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

  it('mounts neither map nor panel', () => {
    const { container } = renderEn(at('/d/no-such-dungeon'))
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('article')).toBeNull()
  })
})

describe('Header', () => {
  it('names the dungeon and sums up its forces and packs', () => {
    const { container } = renderEn(at(`/d/${SLUG}`))
    const header = container.querySelector('header')!
    expect(within(header).getByText(lookup.dungeon.englishName)).toBeDefined()
    expect(header.textContent).toContain(`${lookup.dungeon.totalCount} forces`)
    expect(header.textContent).toContain(`${lookup.packs.size} packs`)
  })

  it('shows no timer while `_dungeon.md` leaves it empty', () => {
    const { container } = renderEn(at(`/d/${SLUG}`))
    expect(container.querySelector('header')!.textContent).not.toMatch(/\d+ min/)
  })

  it('mentions no route until one holds clones', () => {
    const { container } = renderEn(at(`/d/${SLUG}`))
    expect(container.querySelector('header')!.textContent).not.toContain('route')
  })

  it('shows no collaboration badge while the session is off', () => {
    const { container } = renderEn(at(`/d/${SLUG}`))
    // The badge renders the room code next to the peer count.
    expect(container.querySelector('header')!.textContent).not.toMatch(/·\s*\d+$/)
  })

  it('carries the language switcher', () => {
    renderEn(at(`/d/${SLUG}`))
    expect(screen.getByRole('button', { name: 'EN' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'FR' })).toBeDefined()
  })

  it('translates the chrome without touching the dungeon name', () => {
    renderFr(at(`/d/${SLUG}`))
    // englishName comes from MDT, not from the dictionary: it stays as extracted.
    expect(screen.getByText(lookup.dungeon.englishName)).toBeDefined()
    expect(screen.getByRole('button', { name: 'Codex' })).toBeDefined()
  })
})

describe('Codex and Route tabs', () => {
  it('opens on the codex', () => {
    const { container } = renderEn(at(`/d/${SLUG}`))
    expect(screen.getByRole('heading', { name: 'BOSSES' })).toBeDefined()
    expect(container.querySelectorAll('article').length).toBeGreaterThan(0)
  })

  it('switches to the route panel and back', () => {
    renderEn(at(`/d/${SLUG}`))

    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    expect(screen.queryByRole('heading', { name: 'BOSSES' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Codex' }))
    expect(screen.getByRole('heading', { name: 'BOSSES' })).toBeDefined()
  })

  it('keeps the map mounted across both tabs', () => {
    const { container } = renderEn(at(`/d/${SLUG}`))
    expect(container.querySelector('svg')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    expect(container.querySelector('svg')).not.toBeNull()
  })
})

describe('Arriving with an invitation link', () => {
  it('opens on the route panel and shows the invitation, not the codex', () => {
    const { container } = renderEn(at(`/d/${SLUG}?room=ABC123`))
    expect(screen.queryByRole('heading', { name: 'BOSSES' })).toBeNull()
    expect(container.textContent).toContain('ABC123')
    expect(container.textContent).toMatch(/set aside/i)
  })
})

describe('Deep link to a mob', () => {
  const enemy = lookup.dungeon.enemies.find((e) => !e.isBoss)!

  it('opens straight on that entry, alone', () => {
    const { container } = renderEn(at(`/d/${SLUG}/mob/${enemy.id}`))
    const aside = container.querySelector('aside')!
    expect(aside.querySelectorAll('article')).toHaveLength(1)
    expect(aside.textContent).toContain(enemy.name)
  })

  it('offers a way back to the full list', () => {
    renderEn(at(`/d/${SLUG}/mob/${enemy.id}`))
    expect(screen.getByText('← Back')).toBeDefined()
  })

  it('falls back to the list for a mob the dungeon does not have', () => {
    renderEn(at(`/d/${SLUG}/mob/999999`))
    expect(screen.getByRole('heading', { name: 'BOSSES' })).toBeDefined()
  })
})

describe('Remounting per dungeon', () => {
  it('starts a separate document for each dungeon', () => {
    // The `key={slug}` on DungeonView is what guarantees this: mob indices mean different
    // things from one dungeon to the next, so no state may survive the switch.
    const other = lookup.dungeon.slug === 'altar-of-fangs' ? 'kings-rest' : 'altar-of-fangs'
    const { container: first } = renderEn(at(`/d/${SLUG}`))
    expect(first.querySelector('h1')!.textContent).toBe(lookup.dungeon.englishName)

    cleanup()
    const { container: second } = renderEn(at(`/d/${other}`))
    expect(second.querySelector('h1')!.textContent).toBe(getLookup(other)!.dungeon.englishName)
  })
})
