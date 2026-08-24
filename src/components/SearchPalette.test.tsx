// @vitest-environment jsdom
// ABOUTME: The search palette: what it lists, and where a chosen row goes.
// ABOUTME: Mounted inside a real router, so a navigation is a real navigation.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { SearchProvider, useSearch } from './SearchPalette'
import { dungeonList, getLookup, getNpcLabel } from '../lib/data'
import { renderEn } from '../test/render'

afterEach(cleanup)

/**
 * `fireEvent` rather than `user-event`: this repository does not carry that package, and every
 * other component test here drives the DOM the same way. A keyboard command therefore has to be
 * dispatched at the element that handles it, which is the input.
 */

/** Shows the current address, so a navigation is observable without a real browser. */
function Address() {
  return <span data-testid="address">{useLocation().pathname}</span>
}

function OpenButton() {
  const { open } = useSearch()
  return <button onClick={open}>open it</button>
}

const mount = () =>
  renderEn(
    <MemoryRouter initialEntries={['/']}>
      <SearchProvider>
        <OpenButton />
        <Address />
      </SearchProvider>
    </MemoryRouter>,
  )

const openPalette = () => {
  fireEvent.click(screen.getByRole('button', { name: 'open it' }))
  // Typed as the input it is: `getByRole` returns `HTMLElement`, which carries no `value`.
  return screen.getByRole('combobox') as HTMLInputElement
}

const type = (value: string) => {
  const box = screen.getByRole('combobox')
  fireEvent.change(box, { target: { value } })
  return box
}

const firstMob = () => {
  const slug = dungeonList[0].slug
  const enemy = [...getLookup(slug)!.enemyById.values()][0]
  return { slug, npcId: enemy.id, name: getNpcLabel(enemy, 'en').name }
}

describe('Opening and closing', () => {
  it('shows no palette until something opens it', () => {
    mount()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('opens when a consumer calls open()', () => {
    mount()
    expect(openPalette()).toBeDefined()
  })

  it('closes on Escape', () => {
    mount()
    const box = openPalette()
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('closes when the backdrop is clicked', () => {
    const { container } = mount()
    openPalette()
    fireEvent.click(container.querySelector('[data-search-backdrop]')!)
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('forgets the previous query when reopened', () => {
    mount()
    openPalette()
    type('abc')
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    expect(openPalette().value).toBe('')
  })
})

describe('Listing results', () => {
  it('lists a mob searched by name, with its dungeon', () => {
    const { name, npcId } = firstMob()
    mount()
    openPalette()
    type(name)
    const row = screen.getByTestId(`hit-${npcId}`)
    expect(within(row).getByText(name)).toBeDefined()
    expect(within(row).getByText(dungeonList[0].englishName)).toBeDefined()
  })

  it('says which spell put a mob in the list', () => {
    const slug = dungeonList[0].slug
    const enemy = [...getLookup(slug)!.enemyById.values()].find((e) => e.spells.length > 0)!
    mount()
    openPalette()
    type(String(enemy.spells[0].id))
    expect(within(screen.getByTestId(`hit-${enemy.id}`)).getByText(/casts /)).toBeDefined()
  })

  it('says so when nothing matches, rather than showing an empty box', () => {
    mount()
    openPalette()
    type('zzzzqqqqxxxx')
    expect(screen.getByText(/Nothing matches/)).toBeDefined()
  })

  it('reports the true total when the cap bites', () => {
    mount()
    openPalette()
    type('a')
    expect(screen.getByText(/Showing \d+ of \d+/)).toBeDefined()
  })

  it('shows no count when everything found is on screen', () => {
    const { npcId } = firstMob()
    mount()
    openPalette()
    type(String(npcId))
    expect(screen.queryByText(/Showing/)).toBeNull()
  })
})

describe('Choosing a result', () => {
  it('goes to the mob’s card on click', () => {
    const { slug, npcId, name } = firstMob()
    mount()
    openPalette()
    type(name)
    fireEvent.click(screen.getByTestId(`hit-${npcId}`))
    expect(screen.getByTestId('address').textContent).toBe(`/d/${slug}/codex/mob/${npcId}`)
  })

  it('goes to the first result on Enter', () => {
    const { name } = firstMob()
    mount()
    const box = openPalette()
    type(name)
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(screen.getByTestId('address').textContent).toMatch(/\/codex\/mob\//)
  })

  it('moves the selection with the arrow keys before Enter takes it', () => {
    mount()
    const box = openPalette()
    type('a')
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    const rows = screen.getAllByTestId(/^hit-/)
    expect(rows[1].getAttribute('aria-selected')).toBe('true')
    expect(rows[0].getAttribute('aria-selected')).toBe('false')
  })

  it('does not walk the selection off either end of the list', () => {
    mount()
    const box = openPalette()
    type('a')
    fireEvent.keyDown(box, { key: 'ArrowUp' })
    fireEvent.keyDown(box, { key: 'ArrowUp' })
    expect(screen.getAllByTestId(/^hit-/)[0].getAttribute('aria-selected')).toBe('true')
  })

  it('starts again from the top when the query changes', () => {
    // A new query is a new list, and Enter takes whatever is selected — so a stale index would
    // open a mob the reader never saw.
    mount()
    const box = openPalette()
    type('a')
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    type('ab')
    expect(screen.getAllByTestId(/^hit-/)[0].getAttribute('aria-selected')).toBe('true')
  })

  it('closes once a result has been taken', () => {
    const { npcId, name } = firstMob()
    mount()
    openPalette()
    type(name)
    fireEvent.click(screen.getByTestId(`hit-${npcId}`))
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('does nothing on Enter when nothing matched', () => {
    mount()
    const box = openPalette()
    type('zzzzqqqqxxxx')
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(screen.getByTestId('address').textContent).toBe('/')
    expect(screen.getByRole('combobox')).toBeDefined()
  })
})
