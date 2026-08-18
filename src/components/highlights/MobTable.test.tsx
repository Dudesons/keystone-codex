// ABOUTME: Checks a row is a mob, carries its spell chips, and links into the codex.
// ABOUTME: Runs against the real Altar of Fangs derivation, not a hand-built list.

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MobTable from './MobTable'
import { getHighlights } from '../../lib/highlights'
import { renderEn, renderFr } from '../../test/render'

afterEach(cleanup)

const SLUG = 'altar-of-fangs'
const mobs = getHighlights(SLUG).mobs

const mount = () =>
  renderEn(<MobTable slug={SLUG} mobs={mobs} />, { wrapper: MemoryRouter })

describe('MobTable', () => {
  it('shows one row per mob', () => {
    const { container } = mount()
    expect(container.querySelectorAll('[data-mob]')).toHaveLength(mobs.length)
  })

  it('names the mob and links it into the codex', () => {
    const { container } = mount()
    const twinfang = container.querySelector('[data-mob="261554"]')!
    expect(twinfang.textContent).toContain('Twinfang Harrower')
    expect(twinfang.querySelector(`a[href="/d/${SLUG}/map/mob/261554"]`)).not.toBeNull()
  })

  it('puts every prio-1 spell of the mob on its row, linked to Wowhead', () => {
    const { container } = mount()
    const twinfang = container.querySelector('[data-mob="261554"]')!
    expect(twinfang.textContent).toContain('Duostrike')
    expect(twinfang.textContent).toContain('Paralyzing Shots')
    expect(twinfang.querySelector('a[href*="wowhead.com"]')).not.toBeNull()
  })

  it('shows the threat as a badge', () => {
    mount()
    expect(screen.getAllByText('Watch out').length).toBeGreaterThan(0)
  })

  it('names the dispel type MDT declares for a dispellable spell', () => {
    const { container } = mount()
    const twinfang = container.querySelector('[data-mob="261554"]')!
    // Twinfang's Paralyzing Shots (1294569) carries tag: dispel and MDT's own
    // dispel: ['magic'] — the DISPEL tag alone would not say which school clears it.
    expect(twinfang.textContent).toContain('magic')
  })

  it('renders nothing at all when there is nothing to show', () => {
    const { container } = renderEn(<MobTable slug={SLUG} mobs={[]} />, { wrapper: MemoryRouter })
    expect(container.querySelector('[data-mob]')).toBeNull()
  })

  it('speaks French when the reader does, spell names and tags alike', () => {
    // The derivation is keyed by locale, so the French rows are a different object graph.
    const fr = getHighlights(SLUG, 'fr').mobs
    const { container } = renderFr(<MobTable slug={SLUG} mobs={fr} />, { wrapper: MemoryRouter })
    const twinfang = container.querySelector('[data-mob="261554"]')!
    expect(twinfang.textContent).toContain('À surveiller')
    // tag.dodge is DODGE in English and ESQUIVE in French — the chips go through i18n too.
    expect(container.textContent).toContain('ESQUIVE')
  })
})
