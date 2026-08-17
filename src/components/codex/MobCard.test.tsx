// ABOUTME: Tests a mob card against real MDT data and real content/ entries.
// ABOUTME: Covers the header, trap, CC, spell ordering, Wowhead links and interactions.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

// Without `globals: true`, Testing Library does not register its automatic cleanup: renders
// would pile up in the document and skew the `screen` queries.
afterEach(cleanup)
import type { Enemy } from '../../lib/types'
import { dungeonList, getDungeon, getLookup } from '../../lib/data'
import { renderEn, renderFr } from '../../test/render'
import MobCard from './MobCard'

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!

/** Ritual Chieftain: threat "high", a trap, and spells tagged kick / tank / dodge. */
const chieftain = lookup.dungeon.enemies.find((e) => e.id === 270_306)!
const boss = lookup.dungeon.enemies.find((e) => e.isBoss)!
const withoutCc = lookup.dungeon.enemies.find((e) => e.cc.length === 0)!

const pool = dungeonList.flatMap((d) =>
  (getDungeon(d.slug)?.enemies ?? []).map((enemy) => ({ slug: d.slug, enemy })),
)

/** No mob in altar-of-fangs declares any CC, so look across the whole pool. */
const withCc = pool.find(({ enemy }) => enemy.cc.length > 0)!

/**
 * A mob with an empty CC list inside a dungeon MDT *did* fill in — the only case where the
 * empty list carries a meaning of its own. Derived here rather than through `hasCcData`, so
 * the fixture does not rest on the flag it is meant to exercise.
 */
const dungeonHasCc = (slug: string) => (getDungeon(slug)?.enemies ?? []).some((e) => e.cc.length > 0)
const immune = pool.find(({ slug, enemy }) => enemy.cc.length === 0 && dungeonHasCc(slug))!

/** A synthetic mob of the real type: covers cases the pool data does not contain. */
const unknown: Enemy = {
  mdtIdx: 1,
  id: 888_001,
  name: 'Mob with no entry',
  count: 0,
  health: 1000,
  level: 80,
  scale: 1,
  cc: [],
  spells: [{ id: 999_777 }],
  clones: [{ mdtIdx: 1, x: 0, y: 0, g: null, sublevel: 1 }],
}

describe('Header', () => {
  it('carries the npcId, so the map can scroll to the entry', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(container.querySelector(`[data-npc="${chieftain.id}"]`)).not.toBeNull()
  })

  it('shows the mob name', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText(chieftain.name)).toBeDefined()
  })

  it('flags bosses', () => {
    renderEn(<MobCard slug={SLUG} enemy={boss} />)
    expect(screen.getByText('BOSS')).toBeDefined()
  })

  it('takes the threat from the written entry', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText('Dangerous')).toBeDefined()
  })

  it('shows the KICK and TANK pills derived from the indicators', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    const header = container.querySelector('header')!
    expect(header.textContent).toContain('KICK')
    expect(header.textContent).toContain('TANK')
  })

  it('translates the role, a closed vocabulary like the threat level', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(container.textContent).toContain('Melee')

    cleanup()
    expect(renderFr(<MobCard slug={SLUG} enemy={chieftain} />).container.textContent).toContain(
      'Mêlée',
    )
  })

  it('announces forces and unit count', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(container.textContent).toContain(`${chieftain.count} forces`)
    expect(container.textContent).toMatch(/\d+ units?/)
  })

  it('writes "no forces" rather than "0 forces"', () => {
    const { container } = renderEn(<MobCard slug="dungeon-without-content" enemy={unknown} />)
    expect(container.textContent).toContain('no forces')
  })

  it('shows the pull number when the route holds one', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} pullIndex={2} pullColor="ff3eff" />)
    expect(screen.getByTitle('Pull 3').textContent).toBe('3')
  })

  it('shows no pull number without a route', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.queryByTitle(/^Pull /)).toBeNull()
  })
})

describe('The trap', () => {
  it('puts the written trap up front', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText('THE TRAP')).toBeDefined()
    // Matches a fragment from the middle: the prose opens on the words of `mob.ccImmune`.
    expect(screen.getByText(/no stun, no fear/)).toBeDefined()
  })

  it('serves the trap and the notes in the chosen language', () => {
    cleanup()
    renderFr(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText('LE PIÈGE')).toBeDefined()
    expect(screen.getByText(/aucun stun, aucune peur/)).toBeDefined()
  })

  it('shows no trap block when nothing is written', () => {
    renderEn(<MobCard slug="dungeon-without-content" enemy={unknown} />)
    expect(screen.queryByText('THE TRAP')).toBeNull()
  })
})

describe('Applicable crowd control', () => {
  it('lists the crowd control MDT declares', () => {
    const { container } = renderEn(<MobCard slug={withCc.slug} enemy={withCc.enemy} />)
    expect(container.textContent).toContain('APPLICABLE CC')
    expect(container.textContent).toContain(withCc.enemy.cc[0])
  })

  it('says outright that a mob with no CC is immune, when its dungeon has CC data', () => {
    renderEn(<MobCard slug={immune.slug} enemy={immune.enemy} />)
    expect(screen.getByText('Immune to every CC listed by MDT.')).toBeDefined()
  })

  it('claims no immunity for a dungeon MDT never filled in', () => {
    renderEn(<MobCard slug={SLUG} enemy={withoutCc} />)
    expect(screen.queryByText('Immune to every CC listed by MDT.')).toBeNull()
    expect(screen.getByText('MDT has no CC data for this dungeon.')).toBeDefined()
  })

  it('says the same in French', () => {
    renderFr(<MobCard slug={SLUG} enemy={withoutCc} />)
    expect(screen.getByText('MDT n’a pas de données de CC pour ce donjon.')).toBeDefined()
  })

  it('treats a dungeon it knows nothing about as missing data, not as immunity', () => {
    renderEn(<MobCard slug="dungeon-without-content" enemy={unknown} />)
    expect(screen.getByText('MDT has no CC data for this dungeon.')).toBeDefined()
  })

  it('hides the section in compact mode', () => {
    const { container } = renderEn(<MobCard slug={withCc.slug} enemy={withCc.enemy} compact />)
    expect(container.textContent).not.toContain('APPLICABLE CC')
  })
})

describe('Spells', () => {
  it('floats what needs an immediate reaction: kick before tank', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    const text = container.textContent!
    // Ritual Chieftain's notes: "87k" on the spell to kick, "581k" on the tank buster.
    expect(text.indexOf('87k')).toBeGreaterThan(-1)
    expect(text.indexOf('87k')).toBeLessThan(text.indexOf('581k'))
  })

  it('links every spell to Wowhead', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    const link = container.querySelector<HTMLAnchorElement>('a[href*="wowhead.com/spell="]')!
    expect(link).not.toBeNull()
    expect(link.target).toBe('_blank')
    expect(link.rel).toBe('noreferrer')
  })

  it('names a spell missing from spells.json by its identifier', () => {
    renderEn(<MobCard slug="dungeon-without-content" enemy={unknown} />)
    expect(screen.getByText('Spell 999777')).toBeDefined()
  })

  it('renders no spell row for a mob that has none', () => {
    const { container } = renderEn(
      <MobCard slug="dungeon-without-content" enemy={{ ...unknown, id: 888_002, spells: [] }} />,
    )
    expect(container.querySelector('a[href*="wowhead.com/spell="]')).toBeNull()
  })
})

describe('Prose', () => {
  it('renders the free-form writing of the entry', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(container.querySelector('.prose-codex')).not.toBeNull()
  })

  it('hides it in compact mode', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} compact />)
    expect(container.querySelector('.prose-codex')).toBeNull()
  })
})

describe('Interactions', () => {
  it('reports hover, then the pointer leaving', () => {
    const seen: (number | null)[] = []
    const { container } = renderEn(
      <MobCard slug={SLUG} enemy={chieftain} onHover={(id) => seen.push(id)} />,
    )
    const article = container.querySelector('article')!
    fireEvent.mouseEnter(article)
    fireEvent.mouseLeave(article)
    expect(seen).toEqual([chieftain.id, null])
  })

  it('reports the selection when the header is clicked', () => {
    const seen: number[] = []
    const { container } = renderEn(
      <MobCard slug={SLUG} enemy={chieftain} onSelect={(id) => seen.push(id)} />,
    )
    fireEvent.click(container.querySelector('header')!)
    expect(seen).toEqual([chieftain.id])
  })

  it('only looks clickable when a handler is supplied', () => {
    const { container: without } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(without.querySelector('header')!.className).not.toContain('cursor-pointer')

    const { container: with_ } = renderEn(
      <MobCard slug={SLUG} enemy={chieftain} onSelect={() => {}} />,
    )
    expect(with_.querySelector('header')!.className).toContain('cursor-pointer')
  })
})
