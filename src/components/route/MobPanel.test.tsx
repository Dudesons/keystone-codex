// ABOUTME: Tests the route tab's left column: empty state, statistics, codex entry, pin.
// ABOUTME: The panel owns no state — the page decides what it shows and whether it is held.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getLookup } from '../../lib/data'
import { renderEn } from '../../test/render'
import MobPanel from './MobPanel'
import type { Enemy } from '../../lib/types'

afterEach(cleanup)

// `MobCard` scrolls its own card into view; jsdom implements neither of these.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

const { dungeon } = getLookup('murder-row')!
const byName = (name: string): Enemy => dungeon.enemies.find((e) => e.name === name)!

const mount = (over: Partial<React.ComponentProps<typeof MobPanel>> = {}) =>
  renderEn(
    <MobPanel
      slug="murder-row"
      dungeon={dungeon}
      enemy={byName('Bribed Captain')}
      frozen={false}
      onUnfreeze={() => {}}
      {...over}
    />,
  )

describe('MobPanel', () => {
  it('tells you what to do when nothing is hovered yet', () => {
    mount({ enemy: null })
    expect(screen.getByText(/Hover a mob on the map/)).toBeDefined()
  })

  it('names the mob and shows what it is worth', () => {
    mount()
    expect(screen.getByText('Bribed Captain')).toBeDefined()
    expect(screen.getByTestId('mob-score').textContent).toBe('4.2')
  })

  it('shows the same codex entry the codex tab shows', () => {
    const { container } = mount()
    // MobCard renders the mob's portrait; its absence means the card is not mounted.
    expect(container.querySelector('img')).toBeTruthy()
  })

  it('offers no pin while it is following the hover', () => {
    mount()
    expect(screen.queryByRole('button', { name: 'Stop holding this mob' })).toBeNull()
  })

  it('offers a pin once it is holding a mob, and reports the click', () => {
    let released = 0
    mount({ frozen: true, onUnfreeze: () => (released += 1) })
    fireEvent.click(screen.getByRole('button', { name: 'Stop holding this mob' }))
    expect(released).toBe(1)
  })
})
