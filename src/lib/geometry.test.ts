import { describe, expect, it } from 'vitest'
import {
  MAP_HEIGHT,
  MAP_SCALE,
  MAP_WIDTH,
  MDT_COORD_HEIGHT,
  MDT_COORD_WIDTH,
  convexHull,
  expandPolygon,
  roundedPolygonPath,
  toMdtCoords,
  toPixels,
  type Point,
} from './geometry'

/** Shoelace signed area. Positive means clockwise in a screen frame (Y pointing down). */
const signedArea = (pts: Point[]) =>
  pts.reduce((sum, a, i) => {
    const b = pts[(i + 1) % pts.length]
    return sum + (a.x * b.y - b.x * a.y)
  }, 0) / 2

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

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

  it('pushes each vertex exactly `padding` further from the centre', () => {
    const c = centroid(square)
    const grown = expandPolygon(square, 4)
    square.forEach((p, i) => {
      expect(dist(grown[i], c) - dist(p, c)).toBeCloseTo(4, 9)
    })
  })

  it('keeps the centre of a symmetric shape', () => {
    const grown = expandPolygon(square, 26)
    expect(centroid(grown).x).toBeCloseTo(centroid(square).x, 9)
    expect(centroid(grown).y).toBeCloseTo(centroid(square).y, 9)
  })

  it('produces no NaN when a vertex sits on the centre', () => {
    // A pack of a single clone: the vertex IS the centre, so the direction is undefined.
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
