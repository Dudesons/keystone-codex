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

/**
 * How far a pull's outline is kept clear of the positions it was drawn around.
 *
 * A position is drawn as a portrait, not as a point, so the outline has to clear the disc rather
 * than its centre: the widest an ordinary blip gets is 26.6 px. `expandPolygon` offsets the edges,
 * so this distance holds in every direction, and only the corner rounding takes any of it back.
 */
export const PULL_OUTLINE_PADDING = 40

/** How finely a corner's turn is sampled. A chord then sits at `cos(15°)` of the padding. */
const OFFSET_STEP = Math.PI / 6

/**
 * Every point `padding` px outside a convex polygon: each edge moved out along its own normal,
 * the corners joined by arcs.
 *
 * Pushing the vertices away from the polygon's centre instead would be simpler and wrong. That
 * direction has little to do with the one the outline runs in, so the distance asked for is spent
 * partly on sliding a vertex along its own edge: a square keeps only `padding * cos(45°)`, and an
 * elongated shape — a pull crossing the dungeon — barely a third of it along its flanks. Offsetting
 * the edges gives the same clearance in every direction, which is what makes `padding` mean
 * something a caller can reason about.
 *
 * A single position has no edge to offset and nothing to enclose but itself, so it is returned
 * unchanged; a pair is a segment, and comes back as a stadium around it.
 */
export function expandPolygon(points: Point[], padding: number): Point[] {
  if (points.length <= 1) return [...points]

  // Outward normal of the edge leaving each vertex, for a hull wound clockwise.
  const normals = points.map((a, i) => {
    const b = points[(i + 1) % points.length]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    return { x: (b.y - a.y) / len, y: -(b.x - a.x) / len }
  })

  const out: Point[] = []
  points.forEach((v, i) => {
    const from = normals[(i - 1 + points.length) % points.length]
    const to = normals[i]
    // The turn from one edge's normal to the next's, always taken the way the winding goes.
    let turn = Math.atan2(from.x * to.y - from.y * to.x, from.x * to.x + from.y * to.y)
    if (turn < 0) turn += 2 * Math.PI

    const steps = Math.max(1, Math.ceil(turn / OFFSET_STEP))
    for (let s = 0; s <= steps; s++) {
      const angle = (turn * s) / steps
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      out.push({
        x: v.x + (from.x * cos - from.y * sin) * padding,
        y: v.y + (from.x * sin + from.y * cos) * padding,
      })
    }
  })
  return out
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

/** Closed SVG path through the vertices, with the corners rounded. */
export function roundedPolygonPath(points: Point[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    const { x, y } = points[0]
    return `M ${x} ${y} m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0`
  }

  if (points.length === 2) {
    const [a, b] = points
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  }

  const span = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)
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
