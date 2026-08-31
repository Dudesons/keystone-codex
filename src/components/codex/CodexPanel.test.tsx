// ABOUTME: Tests the codex panel against the real dungeon pool.
// ABOUTME: Covers the default list, a selected pack, a selected mob, and following the map.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen, type RenderOptions } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { getLookup } from '../../lib/data'
import { getIndicators } from '../../lib/indicators'
import { renderEn as renderEnBare } from '../../test/render'
import CodexPanel, { type PullRef } from './CodexPanel'

afterEach(cleanup)

// CodexPanel mounts MobCard, which mounts MobTips, whose pack chip is now a `Link`: every
// render in this file needs a router around it. Every call site keeps calling `renderEn`
// unchanged; only the binding gains the router.
const renderEn = (ui: ReactElement, options?: RenderOptions) =>
  renderEnBare(ui, { ...options, wrapper: MemoryRouter })

beforeAll(() => {
  // jsdom does not implement scrollIntoView; the panel calls it to follow the map.
  Element.prototype.scrollIntoView = () => {}
})

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!

const props = (over: Partial<React.ComponentProps<typeof CodexPanel>> = {}) => ({
  slug: SLUG,
  lookup,
  selectedPack: null,
  selectedMob: null,
  focusNpc: null,
  pullByNpc: new Map<number, PullRef>(),
  onSelectMob: () => {},
  onHoverMob: () => {},
  onClearSelection: () => {},
  ...over,
})

describe('Default view', () => {
  it("shows the dungeon's route plan", () => {
    const { container } = renderEn(<CodexPanel {...props()} />)
    expect(container.textContent).toContain('Route plan')
  })

  it('separates bosses from trash', () => {
    renderEn(<CodexPanel {...props()} />)
    // "BOSS" is also the marker each entry carries, so target the section heading.
    expect(screen.getByRole('heading', { name: 'BOSSES' })).toBeDefined()
    expect(screen.getByRole('heading', { name: /^TRASH ·/ })).toBeDefined()
  })

  it('deduplicates trash by npcId: a mob in ten packs appears once', () => {
    renderEn(<CodexPanel {...props()} />)
    const expected = new Set(lookup.dungeon.enemies.filter((e) => !e.isBoss).map((e) => e.id)).size
    expect(screen.getByText(`TRASH · ${expected} mobs`)).toBeDefined()
  })

  it('reports the selection when an entry is clicked', () => {
    const seen: (number | null)[] = []
    const { container } = renderEn(<CodexPanel {...props({ onSelectMob: (id) => seen.push(id) })} />)
    fireEvent.click(container.querySelector('article header')!)
    expect(seen).toHaveLength(1)
    expect(typeof seen[0]).toBe('number')
  })
})

describe('Selected pack', () => {
  const pack = [...lookup.packs.entries()][0]
  const [g, data] = pack

  it('titles the pack and sums up its forces', () => {
    renderEn(<CodexPanel {...props({ selectedPack: g })} />)
    expect(screen.getByText(`Pack ${g}`)).toBeDefined()
    expect(screen.getByText(`${data.count} forces · ${data.members.length} units`)).toBeDefined()
  })

  it('flags mobs appearing more than once in the pack', () => {
    // Pack 5 of altar-of-fangs: 4 units for 3 distinct mobs.
    const { container } = renderEn(<CodexPanel {...props({ selectedPack: 5 })} />)
    expect(container.textContent).toMatch(/×\d+ in this pack/)
  })

  it('closes the selection', () => {
    let closed = false
    renderEn(<CodexPanel {...props({ selectedPack: g, onClearSelection: () => { closed = true } })} />)
    fireEvent.click(screen.getByText('Close'))
    expect(closed).toBe(true)
  })

  it('still renders for an unknown pack, with no forces', () => {
    renderEn(<CodexPanel {...props({ selectedPack: 99_999 })} />)
    expect(screen.getByText('Pack 99999')).toBeDefined()
    expect(screen.getByText('0 forces · 0 units')).toBeDefined()
  })
})

describe('Selected mob', () => {
  const enemy = lookup.dungeon.enemies[0]

  it('shows its entry alone, in full', () => {
    const { container } = renderEn(<CodexPanel {...props({ selectedMob: enemy.id })} />)
    expect(container.querySelectorAll('article')).toHaveLength(1)
    expect(container.textContent).toContain(enemy.name)
  })

  it('offers a way back to the list', () => {
    const seen: (number | null)[] = []
    renderEn(<CodexPanel {...props({ selectedMob: enemy.id, onSelectMob: (id) => seen.push(id) })} />)
    fireEvent.click(screen.getByText('← Back'))
    expect(seen).toEqual([null])
  })

  it('falls back to the full list when the mob cannot be found', () => {
    renderEn(<CodexPanel {...props({ selectedMob: 999_999 })} />)
    expect(screen.getByRole('heading', { name: 'BOSSES' })).toBeDefined()
  })
})

describe('Current route', () => {
  it('marks every mob with the number of the pull holding it', () => {
    const enemy = lookup.dungeon.enemies.find((e) => !e.isBoss)!
    const pullByNpc = new Map<number, PullRef>([[enemy.id, { index: 2, color: 'ff3eff' }]])
    renderEn(<CodexPanel {...props({ pullByNpc })} />)
    expect(screen.getAllByTitle('Pull 3').length).toBeGreaterThan(0)
  })

  it('shows no number without a route', () => {
    renderEn(<CodexPanel {...props()} />)
    expect(screen.queryByTitle(/^Pull /)).toBeNull()
  })
})

describe('Following the map', () => {
  it('accepts a focus on a mob without breaking the render', () => {
    const enemy = lookup.dungeon.enemies[0]
    const { container } = renderEn(<CodexPanel {...props({ focusNpc: enemy.id })} />)
    expect(container.querySelector(`[data-npc="${enemy.id}"]`)).not.toBeNull()
  })

  it('accepts a focus on a mob the panel does not show', () => {
    const { container } = renderEn(<CodexPanel {...props({ focusNpc: 999_999 })} />)
    expect(container.textContent).toContain('BOSSES')
  })
})

/**
 * A chip on the briefing links to `…/codex/mob/<npc>#spell-<id>`. The browser cannot act on
 * that fragment — under a hash router the whole route already lives in the document's one
 * fragment — so the panel is what brings the named row into view.
 */
describe('Landing on a spell', () => {
  /** Records which elements were scrolled, in place of the `beforeAll` no-op stub. */
  function recordScrolls(run: () => HTMLElement) {
    const scrolled: Element[] = []
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function () {
      scrolled.push(this as Element)
    }
    try {
      return { container: run(), scrolled }
    } finally {
      Element.prototype.scrollIntoView = original
    }
  }

  it('scrolls to the named spell inside the selected mob', () => {
    const { container, scrolled } = recordScrolls(
      () =>
        renderEn(<CodexPanel {...props({ selectedMob: 261554, focusSpell: 1294572 })} />)
          .container,
    )
    const row = container.querySelector('[data-spell="1294572"]')
    expect(row).not.toBeNull()
    expect(scrolled).toContain(row)
  })

  it('scrolls nothing when the spell is not on the card', () => {
    const { scrolled } = recordScrolls(
      () =>
        renderEn(<CodexPanel {...props({ selectedMob: 261554, focusSpell: 999_999 })} />)
          .container,
    )
    expect(scrolled).toEqual([])
  })
})

describe('The boss group reads rank, not MDT', () => {
  /**
   * No card in the pool declares `rank:` yet, so today this group holds exactly MDT's flagged
   * bosses — the same set as before. What it pins is *where the question is asked*: the panel
   * now reads the derived rank, so a card that demotes a mob will move it out of this group
   * without anything here changing. The demotion itself is asserted where the content lands.
   */
  it('holds the mobs whose derived rank is boss', () => {
    const { container } = renderEn(<CodexPanel {...props()} />)
    const group = [...container.querySelectorAll('section')].find((s) =>
      /BOSSES/.test(s.querySelector('h2')?.textContent ?? ''),
    )!
    const shown = [...group.querySelectorAll('[data-npc]')].map((el) =>
      Number(el.getAttribute('data-npc')),
    )
    const byRank = lookup.dungeon.enemies
      .filter((e) => getIndicators(SLUG, e).rank === 'boss')
      .map((e) => e.id)

    expect(shown.length).toBeGreaterThan(0)
    expect(shown.sort()).toEqual(byRank.sort())
  })
})

describe('A mob its card demotes', () => {
  const NALORAKK = 'den-of-nalorakk'
  const ECHO = 247_301

  const nalorakkProps = () => ({
    ...props(),
    slug: NALORAKK,
    lookup: getLookup(NALORAKK)!,
  })

  it('drops out of the boss group and into the trash list, marked in place', () => {
    const { container } = renderEn(<CodexPanel {...nalorakkProps()} />)
    const sections = [...container.querySelectorAll('section')]
    const group = (heading: RegExp) =>
      sections.find((s) => heading.test(s.querySelector('h2')?.textContent ?? ''))

    const inBosses = [...(group(/BOSSES/)?.querySelectorAll('[data-npc]') ?? [])].map((el) =>
      Number(el.getAttribute('data-npc')),
    )
    const inTrash = [...(group(/TRASH/)?.querySelectorAll('[data-npc]') ?? [])].map((el) =>
      Number(el.getAttribute('data-npc')),
    )

    expect(inBosses).not.toContain(ECHO)
    expect(inTrash).toContain(ECHO)
    expect(screen.getAllByText('MINIBOSS').length).toBeGreaterThan(0)
  })
})
