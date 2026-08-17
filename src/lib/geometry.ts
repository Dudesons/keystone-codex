// ABOUTME: Converts MDT's coordinate space to map pixels, and traces the pack outlines.
// ABOUTME: One scale factor: MDT's 840x560 frame and our 1920x1280 images share an aspect ratio.

/**
 * Going from MDT's coordinate space to map pixels, and drawing pack outlines.
 *
 * MDT works in an 840×560 frame whose origin is top-left, with a Y axis pointing up (the WoW
 * anchor convention): mob positions are therefore all negative. Our images are 1920×1280,
 * exactly the same aspect ratio, hence a single scale factor.
 */

export const MDT_COORD_WIDTH = 840
export const MDT_COORD_HEIGHT = 560
export const MAP_WIDTH = 1920
export const MAP_HEIGHT = 1280

export const MAP_SCALE = MAP_WIDTH / MDT_COORD_WIDTH // 2.2857…

export interface Point {
  x: number
  y: number
}

/** A clone's MDT coordinates -> pixels in the map image. */
export function toPixels(x: number, y: number): Point {
  return { x: x * MAP_SCALE, y: -y * MAP_SCALE }
}

/** Pixels -> MDT coordinates, for editing (note placement, future drawings). */
export function toMdtCoords(x: number, y: number): Point {
  return { x: x / MAP_SCALE, y: -y / MAP_SCALE }
}

/** Convex hull (monotone chain). Returns the points in clockwise order. */
export function convexHull(points: Point[]): Point[] {
  if (points.length <= 2) return [...points]

  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

  const build = (pts: Point[]) => {
    const stack: Point[] = []
    for (const p of pts) {
      while (stack.length >= 2 && cross(stack[stack.length - 2], stack[stack.length - 1], p) <= 0) {
        stack.pop()
      }
      stack.push(p)
    }
    stack.pop()
    return stack
  }

  return [...build(sorted), ...build([...sorted].reverse())]
}

/** Pushes a polygon's vertices `padding` px out from its centre, for a legible outline. */
export function expandPolygon(points: Point[], padding: number): Point[] {
  if (!points.length) return points
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length
  return points.map((p) => {
    const dx = p.x - cx
    const dy = p.y - cy
    const len = Math.hypot(dx, dy) || 1
    return { x: p.x + (dx / len) * padding, y: p.y + (dy / len) * padding }
  })
}

/**
 * How far from a vertex a corner starts bending, in map pixels.
 *
 * A quadratic curve passes at `radius * cos(half the corner's angle) / 2` from its control
 * point, so the corner is cut by at most half the radius, whatever the shape. Every hull drawn
 * here is pushed at least 26 px clear of the positions it was built from, so that cut can never
 * reach one of them.
 */
const CORNER_RADIUS = 24

/**
 * Half the width given to a hull that has no width of its own.
 *
 * Two positions — or any number of them in a straight line — have a convex hull with no
 * interior, and a shape with no interior encloses nothing. Widening it perpendicular to itself is
 * what makes the outline read as an outline rather than as a line joining two mobs. The same
 * distance as the radius drawn around a lone position, so a pair and a single look alike.
 */
const DEGENERATE_WIDTH = 18

/** Closed SVG path through the vertices, with the corners rounded. */
export function roundedPolygonPath(points: Point[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    const { x, y } = points[0]
    return `M ${x} ${y} m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0`
  }

  const span = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

  if (points.length === 2) {
    const [a, b] = points
    const len = span(a, b) || 1
    const nx = (-(b.y - a.y) / len) * DEGENERATE_WIDTH
    const ny = ((b.x - a.x) / len) * DEGENERATE_WIDTH
    points = [
      { x: a.x + nx, y: a.y + ny },
      { x: b.x + nx, y: b.y + ny },
      { x: b.x - nx, y: b.y - ny },
      { x: a.x - nx, y: a.y - ny },
    ]
  }
  const along = (from: Point, to: Point, by: number): Point => {
    const len = span(from, to) || 1
    return { x: from.x + ((to.x - from.x) / len) * by, y: from.y + ((to.y - from.y) / len) * by }
  }

  let d = ''
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length]
    const cur = points[i]
    const next = points[(i + 1) % points.length]
    // Half an edge at most, or the corners at both its ends would fight over the same pixels.
    const radius = Math.min(CORNER_RADIUS, span(prev, cur) / 2, span(cur, next) / 2)
    const enter = along(cur, prev, radius)
    const leave = along(cur, next, radius)
    d += `${i === 0 ? 'M' : 'L'} ${enter.x} ${enter.y} `
    d += `Q ${cur.x} ${cur.y} ${leave.x} ${leave.y} `
  }
  return `${d}Z`
}
