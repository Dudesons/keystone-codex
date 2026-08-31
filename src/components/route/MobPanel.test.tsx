// ABOUTME: Tests the route tab's left column: empty state, statistics, codex entry, pin.
// ABOUTME: The panel owns no state — the page decides what it shows and whether it is held.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen, type RenderOptions } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { getLookup } from '../../lib/data'
import { renderEn as renderEnBare } from '../../test/render'
import MobPanel from './MobPanel'
import type { Enemy } from '../../lib/types'

afterEach(cleanup)

// MobPanel mounts MobCard, which mounts MobTips, whose pack chip is now a `Link`: every
// render in this file needs a router around it. Every call site keeps calling `renderEn`
// unchanged; only the binding gains the router.
const renderEn = (ui: ReactElement, options?: RenderOptions) =>
  renderEnBare(ui, { ...options, wrapper: MemoryRouter })

// `MobCard` scrolls its own card into view; jsdom implements neither of these.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

const { dungeon } = getLookup('murder-row')!
const byName = (name: string): Enemy => dungeon.enemies.find((e) => e.name === name)!

/** Ula'tek's Chosen, from altar-of-fangs: the real enemy the `__fixtures__` tips content names. */
const chosen = getLookup('altar-of-fangs')!.dungeon.enemies.find((e) => e.id === 263_109)!

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
    expect(screen.getByTestId('mob-score').textContent).toBe('4.5')
  })

  it('does not repeat the forces count `MobCard`’s own header already gives, just below', () => {
    mount()
    expect(screen.queryByText('35 forces')).toBeNull()
    // The share and the score are still `MobStats`'s business — only the raw count moves.
    expect(screen.getByTestId('mob-share')).toBeDefined()
    expect(screen.getByTestId('mob-score')).toBeDefined()
  })

  it('says a mob gives nothing only once, in `MobCard`’s header, not twice', () => {
    mount({ enemy: byName('Xathuux the Annihilator') })
    // `MobCard`'s header folds "no forces" into one longer sentence, so a substring match
    // (not `getByText`'s default exact match) is what finds it there.
    expect(screen.getAllByText(/no forces/)).toHaveLength(1)
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

  it('carries a mob tip into the route builder, which is where a router reads it', () => {
    renderEn(
      <MobPanel slug="__fixtures__" dungeon={dungeon} enemy={chosen} frozen={false} onUnfreeze={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Fixture video' })).toBeTruthy()
  })
})
