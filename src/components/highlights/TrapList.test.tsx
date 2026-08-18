// ABOUTME: Checks the trap sentences of mobs that earned no row reach the page, each with its
// ABOUTME: mob. Runs against the real Murder Row derivation, whose shortlist leaves 16 of them.

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TrapList from './TrapList'
import { getHighlights } from '../../lib/highlights'
import { renderEn } from '../../test/render'

afterEach(cleanup)

// Altar of Fangs was the derivation's landmark dungeon before every one of its non-boss traps
// started earning a row: it now has zero leftover traps, so its trap list would render nothing
// at all. Murder Row keeps 16, and Unleashed Imp (234849, `threat: low`) is one of them — a
// mob rated harmless earns no row, but its written trap must still surface here.
const SLUG = 'murder-row'
const UNLEASHED_IMP = 234849
const traps = getHighlights(SLUG).traps

const mount = () => renderEn(<TrapList slug={SLUG} traps={traps} />, { wrapper: MemoryRouter })

describe('TrapList', () => {
  it('shows every trap of a mob that earned no row', () => {
    const { container } = mount()
    expect(traps.length).toBeGreaterThan(0)
    expect(container.querySelectorAll('[data-trap]')).toHaveLength(traps.length)
  })

  it('renders the traps in the order the derivation gives', () => {
    const { container } = mount()
    const ids = [...container.querySelectorAll('[data-trap]')].map((el) => el.getAttribute('data-trap'))
    expect(ids).toEqual(traps.map((t) => String(t.npcId)))
  })

  it('names the mob and links it into the codex', () => {
    const { container } = mount()
    const imp = container.querySelector(`[data-trap="${UNLEASHED_IMP}"]`)!
    expect(imp.textContent).toContain('Unleashed Imp')
    expect(imp.querySelector(`a[href="/d/${SLUG}/codex/mob/${UNLEASHED_IMP}"]`)).not.toBeNull()
  })

  it('renders nothing at all when nothing is written', () => {
    const { container } = renderEn(<TrapList slug={SLUG} traps={[]} />, { wrapper: MemoryRouter })
    expect(container.querySelector('[data-trap]')).toBeNull()
  })

  it('collapses every row by default', () => {
    const { container } = mount()
    const rows = [...container.querySelectorAll('[data-trap]')] as HTMLDetailsElement[]
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.tagName === 'DETAILS' && !row.open)).toBe(true)
  })

  it('reveals its sentence once its summary is clicked', () => {
    // jsdom does implement the native disclosure toggle: clicking <summary> flips the parent
    // <details>'s `open`, confirmed against a standalone case before writing this assertion.
    const { container } = mount()
    const imp = container.querySelector(`[data-trap="${UNLEASHED_IMP}"]`) as HTMLDetailsElement
    expect(imp.open).toBe(false)
    fireEvent.click(imp.querySelector('summary')!)
    expect(imp.open).toBe(true)
    expect(imp.querySelector('p')?.textContent).not.toHaveLength(0)
  })
})
