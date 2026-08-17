// ABOUTME: Tests a mob card against real MDT data and real content/ entries.
// ABOUTME: Covers the header, trap, CC, spell ordering, Wowhead links and interactions.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

// Without `globals: true`, Testing Library does not register its automatic cleanup: renders
// would pile up in the document and skew the `screen` queries.
afterEach(cleanup)
import type { Enemy } from '../../lib/types'
import { getMobContent, inlineMarkdown } from '../../lib/content'
import { dungeonList, getDungeon, getLookup } from '../../lib/data'
import { renderEn, renderFr } from '../../test/render'
import MobCard from './MobCard'

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!

/** Ritual Chieftain: threat "high", a trap, and spells tagged kick / tank / dodge. */
const chieftain = lookup.dungeon.enemies.find((e) => e.id === 270_306)!
const boss = lookup.dungeon.enemies.find((e) => e.isBoss)!
const withoutCc = lookup.dungeon.enemies.find((e) => e.cc.length === 0)!

/** No mob in altar-of-fangs declares any CC, so look across the whole pool. */
const withCc = dungeonList
  .flatMap((d) => (getDungeon(d.slug)?.enemies ?? []).map((enemy) => ({ slug: d.slug, enemy })))
  .find(({ enemy }) => enemy.cc.length > 0)!

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

/**
 * The trap paragraph, found without depending on the label's language: it is the paragraph
 * inside the block that carries the lethal-threat accent.
 */
const trapText = (container: HTMLElement) =>
  container.querySelector('.border-threat-lethal p')?.innerHTML

/** Reads markdown back as the browser would, so entity escaping does not skew a comparison. */
const asRendered = (markdown: string) => {
  const el = document.createElement('p')
  el.innerHTML = inlineMarkdown(markdown)
  return el.innerHTML
}

describe('The trap', () => {
  // The trap sentence is judgement and gets rewritten as entries are revised, so these read
  // the expected text out of the entry rather than hardcoding it.
  it('puts the written trap up front', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText('THE TRAP')).toBeDefined()
    const trap = getMobContent(SLUG, chieftain.id, 'en')!.trap!
    expect(trapText(container)).toBe(asRendered(trap))
  })

  it('serves the trap and the notes in the chosen language', () => {
    cleanup()
    const french = getMobContent(SLUG, chieftain.id, 'fr')!.trap!
    expect(french).not.toBe(getMobContent(SLUG, chieftain.id, 'en')!.trap)
    const { container } = renderFr(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText('LE PIÈGE')).toBeDefined()
    expect(trapText(container)).toBe(asRendered(french))
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

  it('says outright that a mob with no CC is immune', () => {
    renderEn(<MobCard slug={SLUG} enemy={withoutCc} />)
    expect(screen.getByText('Immune to every CC listed by MDT.')).toBeDefined()
  })

  it('hides the section in compact mode', () => {
    const { container } = renderEn(<MobCard slug={withCc.slug} enemy={withCc.enemy} compact />)
    expect(container.textContent).not.toContain('APPLICABLE CC')
  })
})

describe('Spells', () => {
  it('floats what needs an immediate reaction: kick before tank', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    // Read the order off the spell links rather than off the prose: the notes and the trap
    // are rewritten as entries are revised, and they quote the same figures.
    const ids = [...container.querySelectorAll<HTMLAnchorElement>('a[href*="wowhead.com/spell="]')]
      .map((a) => Number(a.href.split('spell=')[1]))
    const spells = getMobContent(SLUG, chieftain.id, 'en')!.spells!
    const kick = spells.find((s) => s.tag === 'kick')!.id
    const tank = spells.find((s) => s.tag === 'tank')!.id
    expect(ids.indexOf(kick)).toBeGreaterThan(-1)
    expect(ids.indexOf(kick)).toBeLessThan(ids.indexOf(tank))
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

/**
 * `trap` and a spell's `note` are authored markdown, like the prose body — a written entry
 * should not have to choose between emphasis and rendering correctly. A spell's Wowhead
 * description is *not* ours and stays plain text.
 */
describe('Markdown in the one-line fields', () => {
  it('renders emphasis in the trap', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(trapText(container)).toContain('<strong>Blood Sacrifice</strong>')
  })

  it('renders emphasis in the trap in every language', () => {
    cleanup()
    const { container } = renderFr(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(trapText(container)).toContain('<strong>Blood Sacrifice</strong>')
  })

  it('leaves a Wowhead description alone: it is data, not our writing', () => {
    const { container } = renderEn(<MobCard slug="dungeon-without-content" enemy={unknown} />)
    expect(container.innerHTML).not.toContain('<strong>')
  })
})
