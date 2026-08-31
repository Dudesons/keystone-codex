// ABOUTME: Tests the map's pan, zoom and blip layout arithmetic without a DOM.
// ABOUTME: These are the parts that can be wrong while still looking plausible.

import { describe, expect, it } from 'vitest'
import { MAP_HEIGHT, MAP_WIDTH, type Point } from '../../lib/geometry'
import {
  BUTTON_STEP,
  MAX_SCALE,
  MIN_SCALE,
  WHEEL_STEP,
  badgeArc,
  blipRadius,
  fitTransform,
  focusTransform,
  toContainerPoint,
  toMapPoint,
  zoomAt,
  type Transform,
} from './viewport'

/** Where a container pixel lands in map coordinates under a given transform. */
const toMap = (t: Transform, p: Point): Point => ({
  x: (p.x - t.tx) / t.scale,
  y: (p.y - t.ty) / t.scale,
})

describe('fitTransform', () => {
  it('fits by the tighter of the two axes', () => {
    // Taller than the map's ratio: width is the constraint.
    const t = fitTransform({ width: 960, height: 2000 })
    expect(t.scale).toBeCloseTo(960 / MAP_WIDTH, 9)
  })

  it('centres the leftover space', () => {
    const t = fitTransform({ width: 960, height: 2000 })
    expect(t.tx).toBeCloseTo(0, 9)
    expect(t.ty).toBeCloseTo((2000 - MAP_HEIGHT * t.scale) / 2, 9)
  })

  it('leaves no margin when the container has the map ratio', () => {
    const t = fitTransform({ width: MAP_WIDTH / 2, height: MAP_HEIGHT / 2 })
    expect(t.scale).toBeCloseTo(0.5, 9)
    expect(t.tx).toBeCloseTo(0, 9)
    expect(t.ty).toBeCloseTo(0, 9)
  })

  it('keeps the whole map inside the container', () => {
    for (const size of [
      { width: 800, height: 600 },
      { width: 2400, height: 400 },
      { width: 300, height: 3000 },
    ]) {
      const t = fitTransform(size)
      expect(MAP_WIDTH * t.scale).toBeLessThanOrEqual(size.width + 1e-9)
      expect(MAP_HEIGHT * t.scale).toBeLessThanOrEqual(size.height + 1e-9)
    }
  })
})

describe('zoomAt', () => {
  const start: Transform = { scale: 1, tx: 120, ty: -40 }

  it('keeps the pivot pinned to the same point of the map', () => {
    // This is the whole contract: whatever is under the cursor stays under the cursor.
    const pivot = { x: 500, y: 300 }
    const before = toMap(start, pivot)
    const after = toMap(zoomAt(start, WHEEL_STEP, pivot), pivot)
    expect(after.x).toBeCloseTo(before.x, 9)
    expect(after.y).toBeCloseTo(before.y, 9)
  })

  it('pins the pivot when zooming out too', () => {
    const pivot = { x: 40, y: 900 }
    const before = toMap(start, pivot)
    const after = toMap(zoomAt(start, 1 / BUTTON_STEP, pivot), pivot)
    expect(after.x).toBeCloseTo(before.x, 9)
    expect(after.y).toBeCloseTo(before.y, 9)
  })

  it('multiplies the scale by the factor', () => {
    expect(zoomAt(start, 2, { x: 0, y: 0 }).scale).toBeCloseTo(2, 9)
  })

  it('comes back where it started after zooming in then out', () => {
    const pivot = { x: 333, y: 222 }
    const round = zoomAt(zoomAt(start, WHEEL_STEP, pivot), 1 / WHEEL_STEP, pivot)
    expect(round.scale).toBeCloseTo(start.scale, 9)
    expect(round.tx).toBeCloseTo(start.tx, 9)
    expect(round.ty).toBeCloseTo(start.ty, 9)
  })

  it('clamps the scale at both ends', () => {
    expect(zoomAt({ ...start, scale: MAX_SCALE }, 4, { x: 0, y: 0 }).scale).toBe(MAX_SCALE)
    expect(zoomAt({ ...start, scale: MIN_SCALE }, 0.1, { x: 0, y: 0 }).scale).toBe(MIN_SCALE)
  })

  it('does not drift the view once the clamp bites', () => {
    // The translation is derived from the clamped scale, not from the requested factor.
    // Otherwise holding the wheel at max zoom would slide the map sideways for free.
    const pinned: Transform = { scale: MAX_SCALE, tx: 77, ty: -13 }
    const after = zoomAt(pinned, 3, { x: 500, y: 300 })
    expect(after.tx).toBeCloseTo(pinned.tx, 9)
    expect(after.ty).toBeCloseTo(pinned.ty, 9)
  })
})

describe('blipRadius', () => {
  it('draws a boss bigger than a miniboss, and a miniboss bigger than trash', () => {
    expect(blipRadius({ scale: 1 }, 'boss')).toBeGreaterThan(blipRadius({ scale: 1 }, 'miniboss'))
    expect(blipRadius({ scale: 1 }, 'miniboss')).toBeGreaterThan(blipRadius({ scale: 1 }))
  })

  it('scales a miniboss like any other blip', () => {
    expect(blipRadius({ scale: 1.5 }, 'miniboss')).toBeCloseTo(18 * 1.5, 9)
  })

  it('follows MDT scale', () => {
    expect(blipRadius({ scale: 1.5 })).toBeCloseTo(14 * 1.5, 9)
  })

  it('caps the scale, so one huge mob cannot swallow the map', () => {
    expect(blipRadius({ scale: 12 })).toBeCloseTo(14 * 1.9, 9)
  })

  it('treats a missing or zero scale as 1', () => {
    expect(blipRadius({})).toBeCloseTo(14, 9)
    expect(blipRadius({ scale: 0 })).toBeCloseTo(14, 9)
  })
})

describe('badgeArc', () => {
  const centre = { x: 100, y: 100 }

  it('places nothing for no badge', () => {
    expect(badgeArc(0, centre, 14)).toEqual([])
  })

  it('puts a lone badge straight above the blip', () => {
    const [only] = badgeArc(1, centre, 14)
    expect(only.x).toBeCloseTo(centre.x, 9)
    expect(only.y).toBeLessThan(centre.y)
  })

  it('keeps the arc centred as badges are added', () => {
    for (const count of [1, 2, 3]) {
      const placements = badgeArc(count, centre, 14)
      const middle = placements.reduce((s, p) => s + p.x, 0) / count
      expect(middle, `count ${count}`).toBeCloseTo(centre.x, 6)
    }
  })

  it('keeps every badge above the blip', () => {
    // Up to 5: DungeonMap never pushes more than one badge per indicator (kick, frontal, tank
    // buster, dispel, tips), so 5 is the real ceiling, not an arbitrary round number.
    for (const count of [3, 4, 5]) {
      for (const p of badgeArc(count, centre, 14)) {
        expect(p.y, `count ${count}`).toBeLessThan(centre.y)
      }
    }
  })

  it('orders them left to right', () => {
    const xs = badgeArc(3, centre, 14).map((p) => p.x)
    expect(xs[0]).toBeLessThan(xs[1])
    expect(xs[1]).toBeLessThan(xs[2])
  })

  it('sits them just outside the blip', () => {
    const radius = 22
    for (const p of badgeArc(3, centre, radius)) {
      const distance = Math.hypot(p.x - centre.x, p.y - centre.y)
      expect(distance).toBeCloseTo(radius + 5, 6)
    }
  })

  it('never shrinks a badge below a legible size', () => {
    expect(badgeArc(1, centre, 2)[0].r).toBe(6)
    expect(badgeArc(1, centre, 40)[0].r).toBeCloseTo(40 * 0.42, 9)
  })
})

describe('toMapPoint and toContainerPoint', () => {
  const transforms: Transform[] = [
    { scale: 1, tx: 0, ty: 0 },
    { scale: 0.5, tx: 120, ty: -40 },
    { scale: 3.25, tx: -900, ty: 615 },
  ]

  it('reads the top-left of an untransformed map as the origin', () => {
    expect(toMapPoint({ scale: 1, tx: 0, ty: 0 }, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })

  it('undoes the translation before the scale', () => {
    expect(toMapPoint({ scale: 2, tx: 100, ty: 50 }, { x: 300, y: 250 })).toEqual({ x: 100, y: 100 })
  })

  it('places a map point back where the container draws it', () => {
    expect(toContainerPoint({ scale: 2, tx: 100, ty: 50 }, { x: 100, y: 100 })).toEqual({
      x: 300,
      y: 250,
    })
  })

  it('round-trips at every transform, which is what keeps two zoom levels agreeing', () => {
    for (const t of transforms) {
      for (const p of [{ x: 0, y: 0 }, { x: 640, y: 480 }, { x: 1919, y: 1279 }]) {
        const back = toMapPoint(t, toContainerPoint(t, p))
        expect(back.x).toBeCloseTo(p.x, 9)
        expect(back.y).toBeCloseTo(p.y, 9)
      }
    }
  })
})

describe('focusTransform', () => {
  const size = { width: 1000, height: 800 }
  const box = [
    { x: 400, y: 300 },
    { x: 600, y: 500 },
  ]

  it('puts the centre of the points at the centre of the container', () => {
    const t = focusTransform(box, size)
    // The centre of the box is (500, 400) in map pixels.
    expect(500 * t.scale + t.tx).toBeCloseTo(size.width / 2)
    expect(400 * t.scale + t.ty).toBeCloseTo(size.height / 2)
  })

  it('leaves the padding clear on the tighter axis', () => {
    const t = focusTransform(box, size, 100)
    // 200 map pixels wide, into 800 usable: the height is tighter (200 into 600).
    expect(200 * t.scale).toBeLessThanOrEqual(600 + 0.001)
  })

  it('goes as close as the map allows for a single point', () => {
    const t = focusTransform([{ x: 400, y: 300 }], size)
    expect(t.scale).toBe(MAX_SCALE)
  })

  it('does not zoom out past the floor for a box larger than the container', () => {
    const t = focusTransform(
      [
        { x: 0, y: 0 },
        { x: 100_000, y: 100_000 },
      ],
      size,
    )
    expect(t.scale).toBe(MIN_SCALE)
  })

  it('falls back to fitting the whole map when given no points', () => {
    expect(focusTransform([], size)).toEqual(fitTransform(size))
  })
})
