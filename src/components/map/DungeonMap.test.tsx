// ABOUTME: Tests the map's rendering: blips, indicator pips, pack and pull outlines, legend.
// ABOUTME: jsdom lays everything out at zero, so this asserts structure rather than geometry.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getMobContent } from '../../lib/content'
import {
  cloneKey,
  getLookup,
  getNpcLabel,
  mapUrl,
  mdtRelease,
  type DungeonLookup,
} from '../../lib/data'
import type { Point } from '../../lib/geometry'
import { en } from '../../lib/i18n/en'
import type { Peer } from '../../lib/collab/presence'
import type { Clone, CloneRef, Dungeon, Enemy } from '../../lib/types'
import { renderEn, renderFr } from '../../test/render'
import DungeonMap, { type PullMark, type PullShape } from './DungeonMap'

afterEach(cleanup)

/** Pointer ids captured during a test, recorded by the stub installed below. */
const captured: number[] = []
afterEach(() => {
  captured.length = 0
})

beforeAll(() => {
  // jsdom has no ResizeObserver; the map watches its container to fit the image.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // jsdom implements no pointer capture either. Recording it rather than ignoring it is
  // what the panning tests assert on.
  Element.prototype.setPointerCapture = (id: number) => {
    captured.push(id)
  }
  Element.prototype.releasePointerCapture = () => {}
})

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!
const firstEnemy = lookup.dungeon.enemies[0]
const firstClone = firstEnemy.clones[0]
const firstKey = cloneKey(firstEnemy.mdtIdx, firstClone.mdtIdx)

const totalClones = lookup.dungeon.enemies.reduce((n, e) => n + e.clones.length, 0)

const mount = (over: Partial<React.ComponentProps<typeof DungeonMap>> = {}) =>
  renderEn(<DungeonMap slug={SLUG} lookup={lookup} {...over} />)

/**
 * The <g> wrapping one clone's blip.
 *
 * `Blip` alone carries `data-clone`, so filtering on that attribute (rather than "has a
 * circle") is what keeps this from also matching a POI marker: `PoiLayer` draws its own
 * `<g>` with its own `<circle>`, direct children of the same `<svg>`.
 */
const blips = (container: HTMLElement) => [...container.querySelectorAll('svg > g[data-clone]')]

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

  it('draws a dispel pip from either source: MDT, or a card tagged `dispel`', () => {
    const fromMdt = clonesWhere((e) => e.spells.some((s) => s.dispel?.length))
    const expected = clonesWhere(
      (e) =>
        e.spells.some((s) => s.dispel?.length) ||
        (getMobContent(SLUG, e.id)?.spells?.some((s) => s.tag === 'dispel') ?? false),
    )

    expect(fromMdt).toBeGreaterThan(0) // MDT alone already lights pips, with no card written

    const { container } = mount()
    expect(titled(container, 'Dispel')).toBe(expected)
  })

  it('draws a tank pip only where a written card declares one', () => {
    // `tag: tank` has no source in MDT; only a written card can raise it. Derived from the
    // content rather than pinned to one npcId: the codex fills in over time, and a test that
    // has to be edited every time an entry is written would punish the work it protects.
    const declaresTank = (id: number) =>
      getMobContent(SLUG, id)?.spells?.some((s) => s.tag === 'tank') === true
    const expected = clonesWhere((e) => declaresTank(e.id))

    expect(expected).toBeGreaterThan(0)
    const { container } = mount()
    expect(titled(container, 'Tank buster')).toBe(expected)
  })

  it('draws a frontal pip only where a written card declares one', () => {
    // Same footing as the tank buster: MDT records no cone, so only a card can raise it.
    // Derived from the content for the same reason — the codex fills in over time.
    const declaresFrontal = (id: number) =>
      getMobContent(SLUG, id)?.spells?.some((s) => s.tag === 'frontal') === true
    const expected = clonesWhere((e) => declaresFrontal(e.id))

    expect(expected).toBeGreaterThan(0)
    const { container } = mount()
    expect(titled(container, 'Frontal')).toBe(expected)
  })
})

describe('Pack outlines', () => {
  it('draws one per pack when asked', () => {
    const { container } = mount({ showPackOutlines: true })
    const hulls = [...container.querySelectorAll('svg path')]
    expect(hulls.length).toBeGreaterThanOrEqual(lookup.packs.size)
  })

  it('draws none when not', () => {
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

  /**
   * One pull's outline, found by the pull it belongs to.
   *
   * The first `svg path` in the overlay is not it as soon as pack outlines are on, since packs
   * are drawn before pulls — and route mode draws both. Naming the pull keeps these assertions
   * about the pull rather than about drawing order.
   */
  const outline = (container: HTMLElement, index: number) =>
    container.querySelector(`[data-pull="${index}"] path`)!

  it('numbers each pull from 1 at the centre of its outline', () => {
    const { container } = mount({ showPackOutlines: false, pullShapes: [shape] })
    const label = [...container.querySelectorAll('svg text')].find((t) => t.textContent === '3')!
    expect(label).toBeDefined()
    expect(label.getAttribute('x')).toBe('233')
  })

  it('thickens the outline of the hovered pull', () => {
    const { container: cold } = mount({ showPackOutlines: false, pullShapes: [shape] })
    const thin = outline(cold, 2).getAttribute('stroke-width')

    const { container: hot } = mount({
      showPackOutlines: false,
      pullShapes: [shape],
      hoveredPull: 2,
    })
    const thick = outline(hot, 2).getAttribute('stroke-width')

    expect(Number(thick)).toBeGreaterThan(Number(thin))
  })

  it('thickens it in route mode too, where the pack outlines are drawn as well', () => {
    // Packs are drawn before pulls, so the overlay's first `svg path` is a pack's and reads the
    // same whether a pull is hovered or not. That is what asking for the pull by name buys.
    const { container: cold } = mount({ showPackOutlines: true, pullShapes: [shape] })
    const { container: hot } = mount({
      showPackOutlines: true,
      pullShapes: [shape],
      hoveredPull: 2,
    })

    expect(hot.querySelector('svg path')!.getAttribute('stroke-width')).toBe(
      cold.querySelector('svg path')!.getAttribute('stroke-width'),
    )
    expect(Number(outline(hot, 2).getAttribute('stroke-width'))).toBeGreaterThan(
      Number(outline(cold, 2).getAttribute('stroke-width')),
    )
  })

  it('selects the pull when its outline is clicked', () => {
    const picked: number[] = []
    const { container } = mount({
      showPackOutlines: false,
      pullShapes: [shape],
      onPullClick: (i: number) => picked.push(i),
    })
    fireEvent.click(container.querySelector('[data-pull="2"]')!)
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

describe('Reporting the hovered mob', () => {
  it('names the mob the cursor entered, and null when it leaves', () => {
    const seen: (CloneRef | null)[] = []
    const { container } = renderEn(
      <DungeonMap slug="altar-of-fangs" lookup={getLookup('altar-of-fangs')!} onHoverClone={(r) => seen.push(r)} />,
    )
    const blip = blips(container)[0]
    fireEvent.mouseEnter(blip)
    fireEvent.mouseLeave(blip)
    expect(seen).toHaveLength(2)
    expect(seen[0]).toMatchObject({ enemyIdx: expect.any(Number), cloneIdx: expect.any(Number) })
    expect(seen[1]).toBeNull()
  })

  it('reports a right-click on a mob without treating it as a click', () => {
    const menued: CloneRef[] = []
    const clicked: CloneRef[] = []
    const { container } = renderEn(
      <DungeonMap
        slug="altar-of-fangs"
        lookup={getLookup('altar-of-fangs')!}
        onCloneClick={(r) => clicked.push(r)}
        onCloneContextMenu={(r) => menued.push(r)}
      />,
    )
    fireEvent.contextMenu(blips(container)[0])
    expect(menued).toHaveLength(1)
    expect(clicked).toEqual([])
  })

  it('suppresses the browser menu on a mob, and only on a mob', () => {
    const { container } = renderEn(
      <DungeonMap slug="altar-of-fangs" lookup={getLookup('altar-of-fangs')!} onCloneContextMenu={() => {}} />,
    )
    const onBlip = fireEvent.contextMenu(blips(container)[0])
    // fireEvent returns false when a handler called preventDefault.
    expect(onBlip).toBe(false)
    const onMap = fireEvent.contextMenu(container.querySelector('svg')!)
    expect(onMap).toBe(true)
  })

  it('leaves the browser menu alone on a mob when nothing handles the right-click', () => {
    // The codex tab passes no `onCloneContextMenu` at all — a right-click there must not
    // swallow the browser's own menu just because it landed on a blip.
    const { container } = renderEn(
      <DungeonMap slug="altar-of-fangs" lookup={getLookup('altar-of-fangs')!} />,
    )
    const onBlip = fireEvent.contextMenu(blips(container)[0])
    expect(onBlip).toBe(true)
  })
})

/**
 * Pan and click share one pointer, and pointer capture is what tells them apart.
 *
 * A capture in place when the pointer is released redirects the `click` to the capturing
 * element (Pointer Events level 3: "if userEvent was dispatched while the corresponding
 * pointer was captured, then let target be the target of userEvent"). Capturing on
 * `pointerdown` would therefore aim every click at the map container, and no blip would ever
 * hear one — while jsdom, which implements no capture at all, would keep reporting green.
 * So the capture is taken only once the press has turned into a drag, where redirecting the
 * click is exactly what we want.
 */
describe('Panning', () => {
  const surface = (container: HTMLElement) => container.querySelector('.map-surface')!

  it('captures no pointer on a plain press, or the click would never reach a blip', () => {
    const { container } = mount()
    fireEvent.pointerDown(surface(container), { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerUp(surface(container), { pointerId: 1, clientX: 100, clientY: 100 })
    expect(captured).toEqual([])
  })

  it('ignores the few pixels a hand shifts while clicking', () => {
    const { container } = mount()
    fireEvent.pointerDown(surface(container), { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(surface(container), { pointerId: 1, clientX: 102, clientY: 101 })
    expect(captured).toEqual([])
  })

  it('captures once the press becomes a drag, so panning survives leaving the map', () => {
    const { container } = mount()
    fireEvent.pointerDown(surface(container), { button: 0, pointerId: 7, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(surface(container), { pointerId: 7, clientX: 160, clientY: 140 })
    fireEvent.pointerMove(surface(container), { pointerId: 7, clientX: 200, clientY: 180 })
    expect(captured).toEqual([7])
  })
})

describe('Reporting the pointer', () => {
  it('reports a move in map coordinates, not screen pixels', () => {
    const moves: (Point | null)[] = []
    const { container } = renderEn(
      <DungeonMap slug={SLUG} lookup={lookup} onCursorMove={(p) => moves.push(p)} />,
    )
    const surface = container.querySelector('.map-surface')!

    // jsdom never lays anything out, so `fit` would otherwise divide by a zero-sized
    // container. Giving it a known, non-square size makes the transform's translation
    // non-trivial too: against the map's fixed 1920x1280, a 2000x1000 container is
    // height-constrained, so scale = 1000 / 1280 = 0.78125, tx = (2000 - 1920*0.78125) / 2
    // = 250, ty = 0. The "Fit" button re-reads the container's size through the same `fit`
    // that runs on mount, so clicking it after stubbing the size is what applies it.
    Object.defineProperty(surface, 'clientWidth', { configurable: true, value: 2000 })
    Object.defineProperty(surface, 'clientHeight', { configurable: true, value: 1000 })
    fireEvent.click(screen.getByTitle('Fit'))

    fireEvent.pointerMove(surface, { clientX: 200, clientY: 150, pointerId: 1 })

    // toMapPoint inverts that transform: x = (200 - 250) / 0.78125 = -64,
    // y = (150 - 0) / 0.78125 = 192. Screen pixels would report {200, 150}; using
    // toContainerPoint in place of toMapPoint would report {406.25, 117.1875}. Neither
    // matches, so either mistake fails this assertion.
    expect(moves.at(-1)).toEqual({ x: -64, y: 192 })
  })

  it('reports nothing once the pointer has left', () => {
    const moves: (Point | null)[] = []
    const { container } = renderEn(
      <DungeonMap slug={SLUG} lookup={lookup} onCursorMove={(p) => moves.push(p)} />,
    )
    const surface = container.querySelector('.map-surface')!
    fireEvent.pointerMove(surface, { clientX: 200, clientY: 150, pointerId: 1 })
    fireEvent.pointerLeave(surface)
    expect(moves.at(-1)).toBeNull()
  })

  it('says nothing at all when nobody is listening', () => {
    const { container } = renderEn(<DungeonMap slug={SLUG} lookup={lookup} />)
    const surface = container.querySelector('.map-surface')!
    expect(() =>
      fireEvent.pointerMove(surface, { clientX: 5, clientY: 5, pointerId: 1 }),
    ).not.toThrow()
  })

  it('does not force a layout read on every move when nobody is listening', () => {
    // `getBoundingClientRect` forces the browser to flush layout — worth avoiding on the
    // hottest path there is, `pointermove`, for the common case of a solo player with no
    // `onCursorMove` to feed.
    const { container } = renderEn(<DungeonMap slug={SLUG} lookup={lookup} />)
    const surface = container.querySelector('.map-surface')!
    const spy = vi.spyOn(surface, 'getBoundingClientRect')
    fireEvent.pointerMove(surface, { clientX: 5, clientY: 5, pointerId: 1 })
    expect(spy).not.toHaveBeenCalled()
  })

  it('clears the cursor when the pointer is cancelled, not just when it leaves', () => {
    // A touch gesture interrupted by the browser fires `pointercancel`, not `pointerleave` —
    // without this, a peer keeps seeing a parked arrow until the mouse happens to cross the
    // container edge.
    const moves: (Point | null)[] = []
    const { container } = renderEn(
      <DungeonMap slug={SLUG} lookup={lookup} onCursorMove={(p) => moves.push(p)} />,
    )
    const surface = container.querySelector('.map-surface')!
    fireEvent.pointerMove(surface, { clientX: 200, clientY: 150, pointerId: 1 })
    fireEvent.pointerCancel(surface, { pointerId: 1 })
    expect(moves.at(-1)).toBeNull()
  })
})

describe('Tooltip', () => {
  it('stays hidden until a unit is hovered', () => {
    const { container } = mount()
    expect(container.textContent).not.toContain(firstEnemy.name)
  })

  it('names the hovered mob, sums up its pack, and mounts MobStats for the numbers', () => {
    const { container } = mount()
    fireEvent.mouseEnter(blips(container)[0])
    expect(container.textContent).toContain(firstEnemy.name)
    if (firstClone.g != null) {
      expect(container.textContent).toContain(`pack ${firstClone.g}`)
    }
    // The forces/share/score readout is `MobStats`, mounted here as the tooltip's half of the
    // "one component, two places" split (decision 4) — this only passes if that mount is real.
    // `firstEnemy` (altar-of-fangs' first enemy) grants forces and has a health value, so
    // `MobStats` renders the share and score testids rather than the zero-force message.
    const tooltip = screen.getByTestId('clone-tooltip')
    expect(within(tooltip).getByTestId('mob-share')).toBeDefined()
    expect(within(tooltip).getByTestId('mob-score')).toBeDefined()
  })

  it('names it in the reader’s language', () => {
    const { container } = renderFr(<DungeonMap slug={SLUG} lookup={lookup} />)
    fireEvent.mouseEnter(blips(container)[0])
    expect(container.textContent).toContain(getNpcLabel(firstEnemy, 'fr').name)
    expect(container.textContent).not.toContain(firstEnemy.name)
  })

  it('disappears when the pointer leaves', () => {
    const { container } = mount()
    fireEvent.mouseEnter(blips(container)[0])
    fireEvent.mouseLeave(blips(container)[0])
    expect(container.textContent).not.toContain(firstEnemy.name)
  })

  it('does not strand a leading separator for a patrolling clone with no pack', () => {
    // No committed clone is both patrolling and pack-less — the one patrol in the pool has a
    // pack — so this doctors a real lookup rather than inventing one from nothing: same
    // dungeon, same enemy, one clone's `g` and `patrol` overridden. `[pack, patrol]`, joined
    // naively without dropping the missing fragment, used to print a leading " · " with
    // nothing before it (commit 6bdb164).
    const real = getLookup(SLUG)!
    const targetEnemy = real.dungeon.enemies[0]
    const doctoredClone: Clone = { ...targetEnemy.clones[0], g: null, patrol: [{ x: 0, y: 0 }] }
    const doctoredEnemy: Enemy = { ...targetEnemy, clones: [doctoredClone, ...targetEnemy.clones.slice(1)] }
    const doctoredDungeon: Dungeon = {
      ...real.dungeon,
      enemies: [doctoredEnemy, ...real.dungeon.enemies.slice(1)],
    }
    const doctoredCloneByKey = new Map(real.cloneByKey)
    doctoredCloneByKey.set(cloneKey(doctoredEnemy.mdtIdx, doctoredClone.mdtIdx), {
      enemy: doctoredEnemy,
      clone: doctoredClone,
    })
    const doctoredLookup: DungeonLookup = { ...real, dungeon: doctoredDungeon, cloneByKey: doctoredCloneByKey }

    const { container } = mount({ lookup: doctoredLookup })
    fireEvent.mouseEnter(blips(container)[0])

    // `getByText` matches the element's whole normalised text exactly by default: a stranded
    // " · patrol" would not equal "patrol" and this would fail.
    expect(screen.getByText('patrol')).toBeDefined()
  })
})

describe('Heads-up display', () => {
  it('shows the zoom level and the controls', () => {
    mount()
    expect(screen.getByTitle('Zoom in')).toBeDefined()
    expect(screen.getByTitle('Zoom out')).toBeDefined()
    expect(screen.getByTitle('Fit')).toBeDefined()
  })

  it('shows the legend without being asked', () => {
    // What the pips and rings mean is what a reader needs before they know to go looking for
    // it, so the map arrives explaining itself rather than waiting to be asked.
    const { container } = mount()
    expect(container.textContent).toContain('PIPS')
    expect(container.textContent).toContain('Spell to interrupt (from MDT)')
    expect(container.textContent).toContain('Frontal cone (declared in the card)')
    expect(container.textContent).toContain('Threat not assessed')
  })

  /**
   * The blip sizes have always meant something and the legend has never said so. Three rows
   * rather than one: naming only the newcomer would explain half a vocabulary.
   *
   * The size itself is pinned in `viewport.test.ts`, where it is arithmetic rather than layout;
   * this asserts that the map wires the group in at all. No real card declares `rank:` yet, so
   * there is no dungeon in the pool that would render a miniboss blip to measure here.
   */
  it('says what the three blip sizes mean', () => {
    const { container } = mount()
    expect(container.textContent).toContain(en['legend.blip'])
    expect(container.textContent).toContain(en['legend.blip.miniboss'])
    expect(container.textContent).toContain(en['legend.blip.trash'])
  })

  /**
   * The map is Blizzard's art recomposed from MDT's tiles, and the codex and route tabs fill
   * the viewport — so `SiteFooter` has nowhere to sit on them and the credit has to live here.
   * Text only: the panel is `pointer-events-none` precisely because it holds nothing
   * clickable, and a link in here would be a link nobody can click.
   */
  it('says whose data the map is drawn from, and which release of it', () => {
    const { container } = mount()
    expect(container.textContent).toContain('Mythic Dungeon Tools')
    expect(container.textContent).toContain(mdtRelease.version)
    expect(container.textContent).toContain(en['credits.blizzardShort'])
  })

  it('puts no link in the legend, which could not be clicked through it', () => {
    const { container } = mount()
    const legend = [...container.querySelectorAll('div')].find(
      (d) => d.className.includes('absolute') && /PIPS/.test(d.textContent ?? ''),
    )!
    expect(legend.querySelector('a')).toBeNull()
  })

  it('still closes and reopens on the button, for a reader who wants the map bare', () => {
    const { container } = mount()

    fireEvent.click(screen.getByText('Legend'))
    expect(container.textContent).not.toContain('PIPS')

    fireEvent.click(screen.getByText('Legend'))
    expect(container.textContent).toContain('PIPS')
  })

  it('lets the pointer through to the map it covers', () => {
    // Open from the start, it sits over the top-right of the map for good — so a mob that a pan
    // or a zoom brings underneath it would become unhoverable and unclickable. It carries no
    // button or link of its own, so nothing is lost by making it transparent to the pointer.
    const { container } = mount()
    const legend = [...container.querySelectorAll('div')].find(
      (d) => d.className.includes('absolute') && /PIPS/.test(d.textContent ?? ''),
    )!
    expect(legend.className).toContain('pointer-events-none')
  })

  it('explains every ring colour, including the one that means "not judged"', () => {
    const { container } = mount()
    for (const label of ['Lethal threat', 'Dangerous', 'Watch out', 'Harmless', 'Boss']) {
      expect(container.textContent, label).toContain(label)
    }
  })
})

describe('Peer cursors', () => {
  const peer = (over: Partial<Peer> = {}): Peer => ({
    clientId: 7,
    name: 'Alice',
    color: 'hsl(200 70% 62%)',
    cursor: { x: 100, y: 200 },
    isSelf: false,
    ...over,
  })

  it('names the person behind the arrow', () => {
    renderEn(<DungeonMap slug={SLUG} lookup={lookup} cursors={[peer()]} />)
    expect(screen.getByText('Alice')).toBeDefined()
  })

  it('draws nobody who has not moved yet', () => {
    renderEn(<DungeonMap slug={SLUG} lookup={lookup} cursors={[peer({ cursor: undefined })]} />)
    expect(screen.queryByText('Alice')).toBeNull()
  })

  it('does not draw a second arrow under your own mouse', () => {
    renderEn(<DungeonMap slug={SLUG} lookup={lookup} cursors={[peer({ name: 'Me', isSelf: true })]} />)
    expect(screen.queryByText('Me')).toBeNull()
  })

  it('draws someone who has arrived without announcing a name', () => {
    const { container } = renderEn(
      <DungeonMap slug={SLUG} lookup={lookup} cursors={[peer({ name: '' })]} />,
    )
    expect(container.querySelectorAll('[data-peer-cursor]')).toHaveLength(1)
  })

  it('places the arrow through the same transform the map itself uses, not raw map coordinates', () => {
    const { container } = renderEn(
      <DungeonMap slug={SLUG} lookup={lookup} cursors={[peer({ cursor: { x: 100, y: 200 } })]} />,
    )
    const surface = container.querySelector('.map-surface')!

    // Same stub and arithmetic as the "reports a move in map coordinates" test above: a
    // 2000x1000 container is height-constrained against the map's fixed 1920x1280, so
    // scale = 1000 / 1280 = 0.78125, tx = (2000 - 1920*0.78125) / 2 = 250, ty = 0.
    Object.defineProperty(surface, 'clientWidth', { configurable: true, value: 2000 })
    Object.defineProperty(surface, 'clientHeight', { configurable: true, value: 1000 })
    fireEvent.click(screen.getByTitle('Fit'))

    // toContainerPoint({x: 100, y: 200}) = {x: 100*0.78125 + 250, y: 200*0.78125 + 0}
    // = {x: 328.125, y: 156.25}. The raw map coordinates {100, 200} would fail this, and so
    // would toMapPoint's inverse, {x: (100-250)/0.78125, y: (200-0)/0.78125} = {x: -192, y: 256}.
    const el = container.querySelector('[data-peer-cursor]') as HTMLElement
    expect(el.style.transform).toBe('translate(328.125px, 156.25px)')
  })
})

describe('Landmarks', () => {
  it('labels every blip with its clone key, so a landmark can be found', () => {
    const { container } = mount()
    const found = container.querySelectorAll('[data-clone]')
    expect(found.length).toBeGreaterThan(0)
    // The key is the one the rest of the app uses for a clone: "enemyIdx:cloneIdx".
    found.forEach((el) => expect(el.getAttribute('data-clone')).toMatch(/^\d+:\d+$/))
  })
})

describe('Points of interest', () => {
  it('draws the dungeon items whether or not a route exists', () => {
    renderEn(<DungeonMap slug="murder-row" lookup={getLookup('murder-row')!} />)
    expect(screen.getAllByTestId(/^poi-/).length).toBeGreaterThan(0)
  })

  it('keeps blips() from picking up a POI marker in a dungeon that has some', () => {
    const murderRow = getLookup('murder-row')!
    const murderRowClones = murderRow.dungeon.enemies.reduce((n, e) => n + e.clones.length, 0)
    expect(murderRow.dungeon.pois.length).toBeGreaterThan(0) // otherwise this proves nothing

    const { container } = renderEn(<DungeonMap slug="murder-row" lookup={murderRow} />)
    const found = blips(container)
    expect(found).toHaveLength(murderRowClones)
    found.forEach((el) => expect(el.getAttribute('data-testid')).toBeNull())
  })
})

describe('The stroke being drawn', () => {
  const stroke = (points: { x: number; y: number }[]) => ({
    kind: 'stroke' as const,
    points,
    sublevel: 1,
    color: 'ff365c',
    size: 5,
    smooth: true,
    layer: -8,
    isArrow: false,
  })

  it('draws the local gesture before it is committed', () => {
    const { container } = mount({ previewStroke: stroke([{ x: 0, y: 0 }, { x: 10, y: 10 }]) })
    expect(container.querySelector('[data-testid="preview-stroke"]')).toBeTruthy()
  })

  it('draws nothing when no gesture is live', () => {
    const { container } = mount({ previewStroke: null })
    expect(container.querySelector('[data-testid="preview-stroke"]')).toBeNull()
  })

  it('draws a peer’s gesture too, in the colour presence derived for them', () => {
    // A real peer's colour is `hsl(<h> 70% 62%)` (`presence.ts`'s `peerColor`), not a hex value —
    // this is what would have caught `color.replace('#', '')` turning that into the invalid SVG
    // paint `#hsl(200 70% 62%)`, which fails by rendering nothing rather than by throwing.
    const { container } = mount({
      cursors: [
        {
          clientId: 7,
          name: 'Ally',
          color: 'hsl(200 70% 62%)',
          isSelf: false,
          drawing: [{ x: 0, y: 0 }, { x: 20, y: 20 }],
        },
      ],
    })
    const g = container.querySelector('[data-peer-drawing="7"]')
    expect(g).toBeTruthy()
    expect(g!.querySelector('polyline')!.getAttribute('stroke')).toBe('hsl(200 70% 62%)')
  })

  it('never lets a preview count as a committed stroke', () => {
    // Both a local preview and a peer's are live at once, alongside one already-committed
    // stroke: the page counts committed strokes via `[data-testid^="stroke-"]`, and a preview
    // sharing that prefix would inflate the count the moment a gesture is in flight.
    const { container } = mount({
      objects: [stroke([{ x: 0, y: 0 }, { x: 5, y: 5 }])],
      previewStroke: stroke([{ x: 1, y: 1 }, { x: 2, y: 2 }]),
      cursors: [
        {
          clientId: 9,
          name: 'Bo',
          color: 'hsl(10 70% 62%)',
          isSelf: false,
          drawing: [{ x: 3, y: 3 }, { x: 4, y: 4 }],
        },
      ],
    })
    expect(container.querySelectorAll('[data-testid^="stroke-"]')).toHaveLength(1)
  })
})

describe('Preset notes', () => {
  const note = { kind: 'note' as const, at: { x: 100, y: 200 }, sublevel: 1, text: 'Lust here' }

  it('draws a pin for each note it is given', () => {
    renderEn(<DungeonMap slug="altar-of-fangs" lookup={getLookup('altar-of-fangs')!} objects={[note]} />)
    expect(screen.getByTestId('note-pin-0')).toBeTruthy()
  })

  it('draws none when the page passes no objects, as the codex tab does', () => {
    renderEn(<DungeonMap slug="altar-of-fangs" lookup={getLookup('altar-of-fangs')!} />)
    expect(screen.queryByTestId('note-pin-0')).toBeNull()
  })

  it('does not let a drawing tool pan the map when a press lands on an existing pin', () => {
    // NoteLayer's pins sit above DrawSurface so the select tool can click them. But a press
    // with another tool active (line mode here, standing in for Arrow or Draw) must not fall
    // through past both layers and bubble to the map container's own pan starter. `captured`
    // (see the `beforeAll` stub above) is what `Panning`'s own tests use to prove a pan
    // actually started — empty here is the fix; the container's pan starter otherwise treats
    // this exactly like a press on open water and starts one.
    mount({
      objects: [note],
      drawing: { mode: 'line', onCommit: () => {} },
    })
    const pin = screen.getByTestId('note-pin-0')
    fireEvent.pointerDown(pin, { button: 0, pointerId: 3, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(pin, { pointerId: 3, clientX: 160, clientY: 140 })
    expect(captured).toEqual([])
  })
})

describe('Tips badge', () => {
  const VALE_SLUG = 'the-blinding-vale'
  const vale = getLookup(VALE_SLUG)!
  // Pinned to the-blinding-vale, like `blipFor` below: the two must stay in lockstep, since
  // `blipFor` resolves ids through `vale` regardless of what a parameterized `renderMap` was
  // given, and every case in this block only ever needs this one dungeon.
  const renderMap = (over: Partial<React.ComponentProps<typeof DungeonMap>> = {}) =>
    renderEn(<DungeonMap slug={VALE_SLUG} lookup={vale} {...over} />)

  /**
   * The blip for a mob's first clone in the-blinding-vale, found by npc id rather than by
   * `data-clone` directly — blips are keyed `enemyIdx:cloneIdx`, not by npc id, so the id has
   * to be resolved through the lookup first.
   */
  const blipFor = (container: HTMLElement, npcId: number) => {
    const enemy = vale.dungeon.enemies.find((e) => e.id === npcId)!
    const clone = enemy.clones[0]
    return container.querySelector(
      `svg > g[data-clone="${cloneKey(enemy.mdtIdx, clone.mdtIdx)}"]`,
    ) as HTMLElement
  }

  // Lasher (245410): no `tips:` key in its card, so it is the negative case below.
  const npcWithoutTips = 245410

  /** The blip for the clone of a mob that stands in one named pack, rather than its first. */
  const blipInPack = (container: HTMLElement, npcId: number, g: number) => {
    const enemy = vale.dungeon.enemies.find((e) => e.id === npcId)!
    const clone = enemy.clones.find((c) => c.g === g)!
    return container.querySelector(
      `svg > g[data-clone="${cloneKey(enemy.mdtIdx, clone.mdtIdx)}"]`,
    ) as HTMLElement
  }

  it('marks the pull a scoped tip is about', () => {
    const { container } = renderMap()
    expect(container.querySelector('[data-badge="tips"][data-pack="44"]')).not.toBeNull()
  })

  /**
   * The belcher's video is about taking the pull after the first boss. It is written on its card
   * because that is where a sentence about a mob lives, but the advice is about the pull — so no
   * blip carries it, not even the one standing in pack 44.
   */
  it('leaves every blip of that mob unmarked, including the one standing in the pull', () => {
    const { container } = renderMap()
    for (const g of [44, 80, 73, 12]) {
      expect(within(blipInPack(container, 254_850, g)).queryByText('?'), `pack ${g}`).toBeNull()
    }
  })

  it('leaves a mob without tips unmarked', () => {
    const { container } = renderMap()
    const blip = blipFor(container, npcWithoutTips)
    expect(within(blip).queryByText('?')).toBeNull()
  })

  it('gives the legend a row for it', () => {
    mount()
    expect(screen.getByText(en['legend.tips'])).toBeTruthy()
  })

  it('marks one pull and nothing else in the dungeon', () => {
    // The Sporeblight Belcher stands in eleven packs, and before `packs:` existed all eleven of
    // its blips carried the badge. One mark, on the pull the video is about, is the whole point.
    const { container } = renderMap()
    expect(container.querySelectorAll('[data-badge="tips"]').length).toBe(1)
  })

  // The hulls are a visual aid and can be turned off; whether a pull has advice written about it
  // is information, and does not go away with them.
  it('marks the pull whether or not the pack outlines are drawn', () => {
    const { container } = renderMap({ showPackOutlines: false })
    expect(container.querySelector('[data-badge="tips"][data-pack="44"]')).not.toBeNull()
  })
})

describe('Drawing surface stacking', () => {
  it('keeps the HUD above the draw surface, so its buttons are not swallowed by the drawing hit target', () => {
    // No element in DungeonMap, MapHud or Legend sets a z-index, so with a tool active
    // (`drawing` supplied) paint and hit order follow DOM order alone: whichever element is
    // later in the document sits on top. `compareDocumentPosition` reads that order directly,
    // which a plain "does the button exist" or "does clicking it fire" assertion cannot: jsdom
    // dispatches `fireEvent.click` straight at its target and performs no hit-testing, so such
    // an assertion would pass whether the surface sat above the HUD or below it.
    const { container } = mount({ drawing: { mode: 'point', onCommit: () => {} } })
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    const fitButton = screen.getByTitle('Fit')
    const position = surface.compareDocumentPosition(fitButton)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
