// ABOUTME: Checks the boss cards appear in order, each with its trap and its own spells.
// ABOUTME: Order is unit-tested on the derivation; this file checks rendering, including dispel.

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BossStrip from './BossStrip'
import { getHighlights } from '../../lib/highlights'
import { renderEn } from '../../test/render'

afterEach(cleanup)

const SLUG = 'altar-of-fangs'

const mount = (slug: string) =>
  renderEn(<BossStrip slug={slug} bosses={getHighlights(slug).bosses} />, {
    wrapper: MemoryRouter,
  })

describe('BossStrip', () => {
  it('shows one card per boss, in the order the derivation gives', () => {
    const { container } = mount(SLUG)
    const names = [...container.querySelectorAll('[data-boss]')].map(
      (el) => el.querySelector('h3')!.textContent,
    )
    expect(names).toEqual(["Rav'i", 'The Writhing Coil', "Zul'jan"])
  })

  it('links each boss into its codex entry', () => {
    const { container } = mount(SLUG)
    expect(container.querySelector(`a[href="/d/${SLUG}/codex/mob/259445"]`)).not.toBeNull()
  })

  it('gives a boss its own prio-1 spells, each landing on that spell in the codex', () => {
    const { container } = mount(SLUG)
    const ravi = container.querySelector('[data-boss="259445"]')!
    expect(
      ravi.querySelector(`a[href="/d/${SLUG}/codex/mob/259445#spell-1298683"]`),
    ).not.toBeNull()
    // Wowhead is the codex card's link to make, not the briefing's.
    expect(ravi.querySelector('a[href*="wowhead.com"]')).toBeNull()
  })

  it('renders nothing at all for a dungeon with no bosses in the derivation', () => {
    const { container } = renderEn(<BossStrip slug={SLUG} bosses={[]} />, {
      wrapper: MemoryRouter,
    })
    expect(container.querySelector('[data-boss]')).toBeNull()
  })

  // Altar of Fangs' own three bosses all carry an empty `trap:`, so their trapHtml is
  // undefined; King's Rest' Golden Serpent is the real, written case for this branch.
  it("renders a boss's trap sentence when the derivation gives one", () => {
    const { container } = mount('kings-rest')
    const serpent = container.querySelector('[data-boss="135322"]')!
    expect(serpent.textContent).toContain('Control where the gold lands')
  })

  // Kula the Butcher's Whirling Axe and Severing Axe are both prio: 1, tagged `dispel`, and
  // MDT reports a `bleed` dispel type on both — the exact field MobTable first shipped
  // dropping. This pins that BossStrip carries it through instead of only the hand-written tag.
  it("carries through the dispel type MDT reports on a boss's spell, not only its hand-written tag", () => {
    const { container } = mount('kings-rest')
    const kula = container.querySelector('[data-boss="269811"]')!
    expect(kula.textContent).toContain('DISPEL')
    expect(kula.textContent).toContain('bleed')
  })
})
