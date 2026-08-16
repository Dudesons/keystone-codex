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

/** Closed, rounded SVG path through the vertices (quadratic Catmull-Rom curves). */
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

  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  let d = ''
  for (let i = 0; i < points.length; i++) {
    const cur = points[i]
    const next = points[(i + 1) % points.length]
    const m = mid(cur, next)
    if (i === 0) {
      const prev = points[points.length - 1]
      const start = mid(prev, cur)
      d += `M ${start.x} ${start.y} `
    }
    d += `Q ${cur.x} ${cur.y} ${m.x} ${m.y} `
  }
  return `${d}Z`
}
