// ABOUTME: Tests the codex panel against the real dungeon pool.
// ABOUTME: Covers the default list, a selected pack, a selected mob, and following the map.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getLookup } from '../../lib/data'
import { renderEn } from '../../test/render'
import CodexPanel, { type PullRef } from './CodexPanel'

afterEach(cleanup)

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
