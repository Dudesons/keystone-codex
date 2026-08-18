// ABOUTME: The strokes and arrows an MDT preset carries, drawn over the map.
// ABOUTME: Inert to the pointer: decoration must never eat a click meant for a blip.

import { MAP_SCALE } from '../../lib/geometry'
import type { MdtStroke } from '../../lib/mdt/objects'

/** MDT draws a stroke at `size * 0.3`; the scale carries that from its frame to our image. */
const widthOf = (stroke: MdtStroke) => stroke.size * 0.3 * MAP_SCALE

/** How much longer than wide an arrow head reads. */
const HEAD_RATIO = 1.6

/**
 * The head, as a triangle at the stroke's last point.
 *
 * Its direction comes from the last segment rather than from MDT's stored rotation: that angle
 * was measured in a frame whose Y axis points up, and transposing it is sign-juggling nothing
 * but the eye could check. The geometry says the same thing, in the axis we already converted.
 */
function arrowHead(stroke: MdtStroke): string {
  const [from, to] = stroke.points.slice(-2)
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const length = widthOf(stroke) * HEAD_RATIO
  const half = widthOf(stroke)
  const back = { x: to.x - Math.cos(angle) * length, y: to.y - Math.sin(angle) * length }
  const normal = { x: -Math.sin(angle) * half, y: Math.cos(angle) * half }
  return [
    `${to.x},${to.y}`,
    `${back.x + normal.x},${back.y + normal.y}`,
    `${back.x - normal.x},${back.y - normal.y}`,
  ].join(' ')
}

export default function ObjectLayer({
  strokes,
  colorOverride,
  testIdPrefix = 'stroke',
}: {
  strokes: MdtStroke[]
  /**
   * A full CSS colour, replacing what each stroke's own `color` field would otherwise produce.
   * For a preview whose colour comes from a peer's identity — `Peer.color` is a full CSS value,
   * e.g. `hsl(137 70% 62%)` — rather than from MDT's own hex, which `stroke.color` is documented
   * to hold without a leading hash.
   */
  colorOverride?: string
  /**
   * Distinguishes a preview's `data-testid` from a committed stroke's `stroke-${index}` — the
   * only source of that prefix a committed layer produces, and what two page tests count via
   * `[data-testid^="stroke-"]` to know how many strokes are actually on the map. A preview
   * reusing that prefix would make the count ambiguous the moment a gesture is in flight.
   */
  testIdPrefix?: string
}) {
  return (
    <g className="pointer-events-none">
      {strokes.map((stroke, index) => {
        const color = colorOverride ?? `#${stroke.color}`
        return (
          <g key={`${testIdPrefix}-${index}`} data-testid={`${testIdPrefix}-${index}`}>
            <polyline
              points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={widthOf(stroke)}
              strokeLinecap={stroke.smooth ? 'round' : 'butt'}
              strokeLinejoin={stroke.smooth ? 'round' : 'miter'}
            />
            {stroke.isArrow && <polygon points={arrowHead(stroke)} fill={color} />}
          </g>
        )
      })}
    </g>
  )
}
