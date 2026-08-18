// ABOUTME: Checks a row is a mob, carries its spell chips, and links into the codex.
// ABOUTME: Runs against the real Altar of Fangs derivation, not a hand-built list.

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
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

  it('renders the rows in the order the derivation gives', () => {
    const { container } = mount()
    const ids = [...container.querySelectorAll('[data-mob]')].map((el) => el.getAttribute('data-mob'))
    expect(ids).toEqual(mobs.map((m) => String(m.npcId)))
  })

  it('names the mob and links it into the codex', () => {
    const { container } = mount()
    const twinfang = container.querySelector('[data-mob="261554"]')!
    expect(twinfang.textContent).toContain('Twinfang Harrower')
    expect(twinfang.querySelector(`a[href="/d/${SLUG}/codex/mob/261554"]`)).not.toBeNull()
  })

  it("shows the mob's portrait, from its displayId", () => {
    const { container } = mount()
    // Twinfang Harrower carries displayId 142386 (src/data/generated/altar-of-fangs.json),
    // and public/portraits/142386.webp exists among the 227 portraits fetched.
    const twinfang = container.querySelector('[data-mob="261554"]')!
    const img = twinfang.querySelector('img')
    expect(img?.getAttribute('src')).toContain('portraits/142386.webp')
  })

  it("puts every prio-1 spell of the mob on its row, linked into the mob's codex entry", () => {
    const { container } = mount()
    const twinfang = container.querySelector('[data-mob="261554"]')!
    expect(twinfang.textContent).toContain('Duostrike')
    expect(twinfang.textContent).toContain('Paralyzing Shots')
    // The briefing keeps you here: a chip opens the codex card, which carries the cast time
    // and the description the chip has no room for, and links out to Wowhead from there. The
    // hash names the spell so the card lands on it rather than at the top.
    expect(
      twinfang.querySelector(`a[href="/d/${SLUG}/codex/mob/261554#spell-1294572"]`),
    ).not.toBeNull()
  })

  it('leaves nothing on the page that navigates away from the app', () => {
    const { container } = mount()
    expect(container.querySelector('a[href*="wowhead.com"]')).toBeNull()
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

  it("folds a mob's trap under a disclosure on its own row, collapsed by default", () => {
    const { container } = mount()
    // Twinfang Harrower is `threat: medium` / `role: miniboss`, so it earns a row, and it
    // carries a written trap — the row's disclosure is what shows it.
    const twinfang = container.querySelector('[data-mob="261554"]')!
    const disclosure = twinfang.querySelector('details[data-trap]') as HTMLDetailsElement | null
    expect(disclosure).not.toBeNull()
    expect(disclosure!.open).toBe(false)
  })

  it("reveals the row's trap sentence once its disclosure is opened", () => {
    const { container } = mount()
    const twinfang = container.querySelector('[data-mob="261554"]')!
    const disclosure = twinfang.querySelector('details[data-trap]') as HTMLDetailsElement
    fireEvent.click(disclosure.querySelector('summary')!)
    expect(disclosure.open).toBe(true)
    expect(disclosure.querySelector('p')?.textContent).toContain(
      'Duostrike is a genuine tank buster',
    )
  })

  it('renders the trap sentence as markdown', () => {
    const { container } = mount()
    // Ritual Chieftain (270306) is `threat: high`, so it earns a row too, and its trap is the
    // only one in the codex written with bold markdown — around the two spells that chain
    // into a kill (content/altar-of-fangs/270306-ritual-chieftain.md).
    const chieftain = container.querySelector('[data-mob="270306"]')!
    const disclosure = chieftain.querySelector('details[data-trap]')!
    expect(disclosure.querySelector('strong')).not.toBeNull()
  })

  it('shows no trap disclosure for a row whose mob has none written', () => {
    // Ascendant Serpent (261573) is `threat: high` / `role: miniboss` with one prio-1 spell —
    // it earns a row — but its `trap:` is left empty in
    // content/altar-of-fangs/261573-ascendant-serpent.md, so its row shows no disclosure.
    const { container } = mount()
    const serpent = container.querySelector('[data-mob="261573"]')!
    expect(serpent.querySelector('details[data-trap]')).toBeNull()
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
