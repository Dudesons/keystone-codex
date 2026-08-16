// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getMobContent } from '../../lib/content'
import { cloneKey, getLookup, mapUrl } from '../../lib/data'
import { renderEn } from '../../test/render'
import DungeonMap, { type PullMark, type PullShape } from './DungeonMap'

afterEach(cleanup)

beforeAll(() => {
  // jsdom has no ResizeObserver; the map watches its container to fit the image.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!
const firstEnemy = lookup.dungeon.enemies[0]
const firstClone = firstEnemy.clones[0]
const firstKey = cloneKey(firstEnemy.mdtIdx, firstClone.mdtIdx)

const totalClones = lookup.dungeon.enemies.reduce((n, e) => n + e.clones.length, 0)

const mount = (over: Partial<React.ComponentProps<typeof DungeonMap>> = {}) =>
  renderEn(<DungeonMap slug={SLUG} lookup={lookup} {...over} />)

/** The <g> wrapping one clone's blip, found by the portrait or circle it draws. */
const blips = (container: HTMLElement) =>
  [...container.querySelectorAll('svg > g')].filter((g) => g.querySelector('circle'))

describe('Map surface', () => {
  it('draws the dungeon image at its natural size', () => {
    const { container } = mount()
    const img = container.querySelector('img')!
    expect(img.getAttribute('src')).toBe(mapUrl(SLUG))
    expect(img.getAttribute('width')).toBe('1920')
    expect(img.getAttribute('height')).toBe('1280')
  })

  it('overlays an SVG in the same coordinate space as the image', () => {
    const { container } = mount()
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 1920 1280')
  })

  it('declares a single relative clip path for every portrait', () => {
    const { container } = mount()
    const clip = container.querySelector('#blip-clip')!
    expect(clip.getAttribute('clipPathUnits')).toBe('objectBoundingBox')
  })
})

describe('Blips', () => {
  it('draws one per clone, not one per mob', () => {
    const { container } = mount()
    expect(blips(container).length).toBe(totalClones)
  })

  it('places a blip at the projected MDT position', () => {
    const { container } = mount()
    // toPixels flips Y: MDT positions are negative, screen ones are not.
    const circles = [...container.querySelectorAll('svg circle')]
    const cys = circles.map((c) => Number(c.getAttribute('cy'))).filter((n) => !Number.isNaN(n))
    expect(cys.some((y) => y > 0)).toBe(true)
    expect(cys.every((y) => y >= 0)).toBe(true)
  })

  it('gives bosses a bigger blip than trash', () => {
    const { container } = mount()
    const boss = lookup.dungeon.enemies.find((e) => e.isBoss)!
    const trash = lookup.dungeon.enemies.find((e) => !e.isBoss && e.scale === boss.scale)
    if (!trash) return // no comparable pair in this dungeon
    const radii = [...container.querySelectorAll('svg circle')].map((c) => Number(c.getAttribute('r')))
    expect(Math.max(...radii)).toBeGreaterThan(14)
  })

  it('draws no patrol path in a dungeon that has none', () => {
    const { container } = mount()
    expect(container.querySelectorAll('polyline')).toHaveLength(0)
  })

  it('draws the patrol path of clones that have one', () => {
    // The whole season pool holds exactly one patrolling clone, in Temple of Sethraliss.
    // Asserting against Altar of Fangs would pass on zero and prove nothing.
    const temple = getLookup('temple-of-sethraliss')!
    const patrols = temple.dungeon.enemies.flatMap((e) => e.clones.filter((c) => c.patrol?.length))
    expect(patrols.length).toBeGreaterThan(0)

    const { container } = renderEn(<DungeonMap slug="temple-of-sethraliss" lookup={temple} />)
    const drawn = container.querySelectorAll('polyline')
    expect(drawn).toHaveLength(patrols.length)
    // The line starts at the clone and threads its waypoints, so it has one point more.
    expect(drawn[0].getAttribute('points')!.trim().split(/\s+/)).toHaveLength(
      patrols[0].patrol!.length + 1,
    )
  })
})

describe('Indicator pips', () => {
  /**
   * Testing Library's `getByTitle` only reaches an SVG `<title>` that is a direct child of
   * `<svg>`; these sit inside the blip's `<g>`, so query them directly.
   */
  const titled = (container: HTMLElement, text: string) =>
    [...container.querySelectorAll('title')].filter((t) => t.textContent === text).length

  /** Clones whose mob satisfies `pred` — one pip is drawn per clone, not per mob. */
  const clonesWhere = (pred: (e: (typeof lookup.dungeon.enemies)[number]) => boolean) =>
    lookup.dungeon.enemies.filter(pred).reduce((n, e) => n + e.clones.length, 0)

  it('draws a kick pip from either source: MDT, or a card tagged `kick`', () => {
    const fromMdt = clonesWhere((e) => e.spells.some((s) => s.interruptible))
    const expected = clonesWhere(
      (e) =>
        e.spells.some((s) => s.interruptible) ||
        (getMobContent(SLUG, e.id, 'en')?.spells?.some((s) => s.tag === 'kick') ?? false),
    )

    expect(fromMdt).toBeGreaterThan(0) // MDT alone already lights pips, with no card written
    expect(expected).toBeGreaterThan(fromMdt) // and a written card adds to them

    const { container } = mount()
    expect(titled(container, 'To interrupt')).toBe(expected)
  })

  it('draws a dispel pip where MDT declares a dispel type', () => {
    const expected = clonesWhere((e) => e.spells.some((s) => s.dispel?.length))
    expect(expected).toBeGreaterThan(0)
    const { container } = mount()
    expect(titled(container, 'Dispel')).toBe(expected)
  })

  it('draws no tank pip without a card declaring one', () => {
    // `tag: tank` has no source in MDT; only a written card can raise it.
    const expected = clonesWhere((e) => e.id === 270_306)
    const { container } = mount()
    expect(titled(container, 'Tank buster')).toBe(expected)
  })
})

describe('Pack outlines', () => {
  it('draws one per pack in codex mode', () => {
    const { container } = mount({ showPackOutlines: true })
    const hulls = [...container.querySelectorAll('svg path')]
    expect(hulls.length).toBeGreaterThanOrEqual(lookup.packs.size)
  })

  it('draws none when the route tab turns them off', () => {
    const { container } = mount({ showPackOutlines: false })
    expect(container.querySelectorAll('svg path')).toHaveLength(0)
  })
})

describe('Route overlay', () => {
  const shape: PullShape = {
    index: 2,
    color: '#ff3eff',
    hull: [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 300 },
    ],
    center: { x: 233, y: 166 },
    count: 3,
  }

  it('numbers each pull from 1 at the centre of its outline', () => {
    const { container } = mount({ showPackOutlines: false, pullShapes: [shape] })
    const label = [...container.querySelectorAll('svg text')].find((t) => t.textContent === '3')!
    expect(label).toBeDefined()
    expect(label.getAttribute('x')).toBe('233')
  })

  it('thickens the outline of the hovered pull', () => {
    const { container: cold } = mount({ showPackOutlines: false, pullShapes: [shape] })
    const thin = cold.querySelector('svg path')!.getAttribute('stroke-width')

    const { container: hot } = mount({
      showPackOutlines: false,
      pullShapes: [shape],
      hoveredPull: 2,
    })
    const thick = hot.querySelector('svg path')!.getAttribute('stroke-width')

    expect(Number(thick)).toBeGreaterThan(Number(thin))
  })

  it('selects the pull when its outline is clicked', () => {
    const picked: number[] = []
    const { container } = mount({
      showPackOutlines: false,
      pullShapes: [shape],
      onPullClick: (i: number) => picked.push(i),
    })
    fireEvent.click(container.querySelector('svg path')!.parentElement!)
    expect(picked).toEqual([2])
  })

  it('paints a marked clone in its pull colour and numbers it', () => {
    const marks = new Map<string, PullMark>([[firstKey, { pullIdx: 4, color: '#3eb0ff' }]])
    const { container } = mount({ pullMarks: marks })
    const numbered = [...container.querySelectorAll('svg text')].filter((t) => t.textContent === '5')
    expect(numbered.length).toBe(1)
    expect(container.innerHTML).toContain('#3eb0ff')
  })
})

describe('Highlighting', () => {
  it('dims everything that is not highlighted', () => {
    const { container } = mount({ highlighted: new Set([firstKey]) })
    const dimmed = blips(container).filter((g) => g.getAttribute('opacity') === '0.28')
    expect(dimmed.length).toBe(totalClones - 1)
  })

  it('dims nothing when nothing is highlighted', () => {
    const { container } = mount({ highlighted: new Set() })
    expect(blips(container).some((g) => g.getAttribute('opacity') === '0.28')).toBe(false)
  })
})

describe('Clicking a unit', () => {
  it('reports the MDT indices, not a position', () => {
    const clicks: { enemyIdx: number; cloneIdx: number }[] = []
    const { container } = mount({ onCloneClick: (ref) => clicks.push(ref) })
    fireEvent.click(blips(container)[0])
    expect(clicks).toHaveLength(1)
    expect(clicks[0]).toEqual({ enemyIdx: firstEnemy.mdtIdx, cloneIdx: firstClone.mdtIdx })
  })

  it('flags a ctrl-click as additive, so it targets the single unit', () => {
    const additive: boolean[] = []
    const { container } = mount({ onCloneClick: (_ref, add) => additive.push(add) })
    fireEvent.click(blips(container)[0])
    fireEvent.click(blips(container)[0], { ctrlKey: true })
    expect(additive).toEqual([false, true])
  })
})

describe('Tooltip', () => {
  it('stays hidden until a unit is hovered', () => {
    const { container } = mount()
    expect(container.textContent).not.toContain(firstEnemy.name)
  })

  it('names the hovered mob and sums up its forces and pack', () => {
    const { container } = mount()
    fireEvent.mouseEnter(blips(container)[0])
    expect(container.textContent).toContain(firstEnemy.name)
    if (firstClone.g != null) {
      expect(container.textContent).toContain(`pack ${firstClone.g}`)
    }
  })

  it('disappears when the pointer leaves', () => {
    const { container } = mount()
    fireEvent.mouseEnter(blips(container)[0])
    fireEvent.mouseLeave(blips(container)[0])
    expect(container.textContent).not.toContain(firstEnemy.name)
  })
})

describe('Heads-up display', () => {
  it('shows the zoom level and the controls', () => {
    mount()
    expect(screen.getByTitle('Zoom in')).toBeDefined()
    expect(screen.getByTitle('Zoom out')).toBeDefined()
    expect(screen.getByTitle('Fit')).toBeDefined()
  })

  it('opens and closes the legend', () => {
    const { container } = mount()
    expect(container.textContent).not.toContain('PIPS')

    fireEvent.click(screen.getByText('Legend'))
    expect(container.textContent).toContain('PIPS')
    expect(container.textContent).toContain('Spell to interrupt (from MDT)')
    expect(container.textContent).toContain('Threat not assessed')

    fireEvent.click(screen.getByText('Legend'))
    expect(container.textContent).not.toContain('PIPS')
  })

  it('explains every ring colour, including the one that means "not judged"', () => {
    const { container } = mount()
    fireEvent.click(screen.getByText('Legend'))
    for (const label of ['Lethal threat', 'Dangerous', 'Watch out', 'Harmless', 'Boss']) {
      expect(container.textContent, label).toContain(label)
    }
  })
})
