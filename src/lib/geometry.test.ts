// ABOUTME: Tests the MDT-to-pixel conversion and the pack outline tracing.
// ABOUTME: Pins the frame corners, since a scale slip offsets every mob at once.

import { describe, expect, it } from 'vitest'
import {
  MAP_HEIGHT,
  MAP_SCALE,
  MAP_WIDTH,
  MDT_COORD_HEIGHT,
  MDT_COORD_WIDTH,
  PULL_OUTLINE_PADDING,
  convexHull,
  expandPolygon,
  roundedPolygonPath,
  toMdtCoords,
  toPixels,
  type Point,
} from './geometry'
import { blipRadius } from '../components/map/viewport'

/** Shoelace signed area. Positive means clockwise in a screen frame (Y pointing down). */
const signedArea = (pts: Point[]) =>
  pts.reduce((sum, a, i) => {
    const b = pts[(i + 1) % pts.length]
    return sum + (a.x * b.y - b.x * a.y)
  }, 0) / 2

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Distance from `p` to the closed boundary of `poly`, edges included, not only its corners. */
const distToBoundary = (poly: Point[], p: Point) => {
  let best = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
    best = Math.min(best, Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y))
  }
  return best
}

const centroid = (pts: Point[]): Point => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
})

describe('Scale and frame', () => {
  it("applies a single factor: the map has the MDT frame's aspect ratio", () => {
    expect(MAP_WIDTH / MDT_COORD_WIDTH).toBeCloseTo(MAP_HEIGHT / MDT_COORD_HEIGHT, 10)
    expect(MAP_SCALE).toBeCloseTo(MAP_WIDTH / MDT_COORD_WIDTH, 10)
  })

  it("puts MDT's origin at the top-left of the image", () => {
    const { x, y } = toPixels(0, 0)
    // Y comes out as -0, the negation of 0, indistinguishable from 0 in rendering and maths.
    expect(x).toBeCloseTo(0, 9)
    expect(y).toBeCloseTo(0, 9)
  })

  it('flips the Y axis: mob positions are negative in MDT, positive on screen', () => {
    expect(toPixels(0, -560).y).toBeCloseTo(MAP_HEIGHT, 6)
    // A positive Y would fall off the top of the image — that is genuinely an abnormal case.
    expect(toPixels(0, 100).y).toBeLessThan(0)
  })

  it("lands the MDT frame's bottom-right corner on the image corner", () => {
    const { x, y } = toPixels(MDT_COORD_WIDTH, -MDT_COORD_HEIGHT)
    expect(x).toBeCloseTo(MAP_WIDTH, 6)
    expect(y).toBeCloseTo(MAP_HEIGHT, 6)
  })

  it('toMdtCoords is the exact inverse of toPixels', () => {
    for (const [x, y] of [
      [0, 0],
      [123.5, -456.25],
      [MDT_COORD_WIDTH, -MDT_COORD_HEIGHT],
      [-42, 17],
    ]) {
      const px = toPixels(x, y)
      const back = toMdtCoords(px.x, px.y)
      expect(back.x).toBeCloseTo(x, 9)
      expect(back.y).toBeCloseTo(y, 9)
    }
  })
})

describe('convexHull', () => {
  it('hands back a set that cannot form a hull unchanged', () => {
    expect(convexHull([])).toEqual([])
    expect(convexHull([{ x: 1, y: 2 }])).toEqual([{ x: 1, y: 2 }])
    expect(convexHull([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ])
  })

  it('drops interior points', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    const hull = convexHull([...square, { x: 5, y: 5 }, { x: 2, y: 8 }])
    expect(hull).toHaveLength(4)
    expect(hull).toEqual(expect.arrayContaining(square))
  })

  it('drops points lying flat on an edge', () => {
    const hull = convexHull([
      { x: 0, y: 0 },
      { x: 5, y: 0 }, // halfway along the top edge
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ])
    expect(hull).toHaveLength(4)
    expect(hull).not.toContainEqual({ x: 5, y: 0 })
  })

  it('walks the vertices clockwise on screen', () => {
    expect(signedArea(convexHull([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]))).toBeGreaterThan(0)

    // Input order must not influence the output orientation.
    expect(signedArea(convexHull([
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
      { x: 0, y: 0 },
    ]))).toBeGreaterThan(0)
  })

  it('does not mutate the array it is given', () => {
    const input = [
      { x: 10, y: 10 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 5 },
    ]
    const copy = structuredClone(input)
    convexHull(input)
    expect(input).toEqual(copy)
  })
})

describe('expandPolygon', () => {
  const square: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ]

  it('leaves an empty polygon alone', () => {
    expect(expandPolygon([], 26)).toEqual([])
  })

  const needle: Point[] = [
    { x: 0, y: 0 },
    { x: 900, y: 40 },
    { x: 20, y: 30 },
  ]

  it('keeps its distance from every position, whichever way the outline runs', () => {
    // The distance that matters is to the outline itself, edges included. Pushing vertices away
    // from a centre satisfies a corner-to-corner reading of this and still runs an edge straight
    // across a position, which is what an elongated shape is made of.
    for (const [name, shape] of [
      ['square', square],
      ['needle', needle],
    ] as const) {
      const grown = expandPolygon(shape, 26)
      for (const p of shape) {
        expect(distToBoundary(grown, p), `${name}: ${p.x},${p.y}`).toBeGreaterThan(26 * 0.96)
      }
    }
  })

  it('stands off by exactly the padding asked for, no further', () => {
    const grown = expandPolygon(needle, 26)
    for (const p of needle) {
      expect(Math.min(...grown.map((g) => dist(g, p))), `${p.x},${p.y}`).toBeCloseTo(26, 6)
    }
  })

  it('gives a two-position hull a width, so it can be enclosed rather than joined', () => {
    const grown = expandPolygon(
      [
        { x: 100, y: 100 },
        { x: 300, y: 100 },
      ],
      26,
    )
    expect(Math.min(...grown.map((p) => p.y))).toBeCloseTo(74, 6)
    expect(Math.max(...grown.map((p) => p.y))).toBeCloseTo(126, 6)
  })

  it('keeps the centre of a symmetric shape', () => {
    const grown = expandPolygon(square, 26)
    expect(centroid(grown).x).toBeCloseTo(centroid(square).x, 9)
    expect(centroid(grown).y).toBeCloseTo(centroid(square).y, 9)
  })

  it('leaves a lone position where it is', () => {
    // A pack of a single clone has no edge to offset, and nothing to enclose but itself.
    const grown = expandPolygon([{ x: 7, y: -3 }], 26)
    expect(grown[0].x).toBeCloseTo(7, 9)
    expect(grown[0].y).toBeCloseTo(-3, 9)
  })

  it('does not mutate the array it is given', () => {
    const copy = structuredClone(square)
    expandPolygon(square, 26)
    expect(square).toEqual(copy)
  })
})

describe('roundedPolygonPath', () => {
  it('returns an empty string with no vertex', () => {
    expect(roundedPolygonPath([])).toBe('')
  })

  it('draws a circle around a lone vertex', () => {
    expect(roundedPolygonPath([{ x: 5, y: 7 }])).toBe(
      'M 5 7 m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0',
    )
  })

  it('draws a segment between two vertices', () => {
    // Widening a hull that has none of its own is `expandPolygon`'s job, so by the time a path
    // is drawn a pair is either already a shape or genuinely just a line.
    expect(roundedPolygonPath([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe('M 1 2 L 3 4')
  })

  it('produces a closed path with one curve per vertex', () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    const d = roundedPolygonPath(pts)
    expect(d.startsWith('M ')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect(d.match(/Q /g)).toHaveLength(pts.length)
  })

  it('starts halfway along the last edge, so the loop closes without a corner', () => {
    // Last edge: (0,10) -> (0,0), midpoint (0,5).
    const d = roundedPolygonPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ])
    expect(d.startsWith('M 0 5 ')).toBe(true)
  })
})

/** Walks a path built by `roundedPolygonPath`, sampling its curves into a polyline. */
const flatten = (d: string, steps = 24): Point[] => {
  const tok = d.trim().split(/\s+/)
  const out: Point[] = []
  let cursor: Point = { x: 0, y: 0 }
  for (let i = 0; i < tok.length; ) {
    const op = tok[i++]
    if (op === 'Z') break
    if (op === 'M' || op === 'L') {
      cursor = { x: Number(tok[i++]), y: Number(tok[i++]) }
      out.push(cursor)
      continue
    }
    if (op === 'Q') {
      const c = { x: Number(tok[i++]), y: Number(tok[i++]) }
      const end = { x: Number(tok[i++]), y: Number(tok[i++]) }
      for (let s = 1; s <= steps; s++) {
        const t = s / steps
        const u = 1 - t
        out.push({
          x: u * u * cursor.x + 2 * u * t * c.x + t * t * end.x,
          y: u * u * cursor.y + 2 * u * t * c.y + t * t * end.y,
        })
      }
      cursor = end
      continue
    }
    throw new Error(`unexpected path token: ${op}`)
  }
  return out
}

/** Ray casting: is `p` inside the closed polyline? */
const encloses = (poly: Point[], p: Point) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      hit = !hit
    }
  }
  return hit
}

/** How far `p` sits from the nearest point of a flattened outline. */
const clearance = (poly: Point[], p: Point) =>
  Math.min(...poly.map((q) => Math.hypot(q.x - p.x, q.y - p.y)))

describe('An outline encloses every mob it was drawn around', () => {
  const outlineOf = (mobs: Point[]) =>
    flatten(roundedPolygonPath(expandPolygon(convexHull(mobs), PULL_OUTLINE_PADDING)))

  it('holds for a compact group', () => {
    const mobs: Point[] = [
      { x: 300, y: 300 },
      { x: 360, y: 310 },
      { x: 330, y: 370 },
      { x: 290, y: 350 },
    ]
    const outline = outlineOf(mobs)
    for (const mob of mobs) expect(encloses(outline, mob), `${mob.x},${mob.y}`).toBe(true)
  })

  it('holds when one group sits far from the rest, which is what a long pull looks like', () => {
    // Pull 7 of the Altar of Fangs: a cluster mid-map, a group up and right, one far bottom-right.
    const mobs: Point[] = [
      { x: 620, y: 560 },
      { x: 660, y: 580 },
      { x: 640, y: 610 },
      { x: 1480, y: 340 },
      { x: 1700, y: 900 },
    ]
    const outline = outlineOf(mobs)
    for (const mob of mobs) expect(encloses(outline, mob), `${mob.x},${mob.y}`).toBe(true)
  })

  it('leaves the portraits room, not only their centres', () => {
    // A pull drawn around a mob's position has to clear the disc drawn at it, or the line runs
    // across the portrait. The widest an ordinary blip gets is `blipRadius` at its scale cap.
    const widestBlip = blipRadius({ scale: 1.9 })
    const mobs: Point[] = [
      { x: 180, y: 120 },
      { x: 230, y: 100 },
      { x: 205, y: 165 },
      { x: 1180, y: 70 },
      { x: 1230, y: 95 },
      { x: 1700, y: 620 },
    ]
    const outline = outlineOf(mobs)
    for (const mob of mobs) {
      expect(clearance(outline, mob), `${mob.x},${mob.y}`).toBeGreaterThan(widestBlip)
    }
  })

  it('holds for a pull strung out in a line, the sharpest corners there are', () => {
    const mobs: Point[] = [
      { x: 200, y: 200 },
      { x: 900, y: 260 },
      { x: 1600, y: 320 },
    ]
    const outline = outlineOf(mobs)
    for (const mob of mobs) expect(encloses(outline, mob), `${mob.x},${mob.y}`).toBe(true)
  })
})
