// ABOUTME: The drawing gesture over the map: press, move, release, in map pixels.
// ABOUTME: Deliberately a hit target — mounted only while a tool needs one, and it stops the pan.

import { useRef } from 'react'
import type { Point } from '../../lib/geometry'
import { toMapPoint, type Transform } from './viewport'

/**
 * How far the pointer must travel, in container pixels, before a freehand gesture keeps another
 * point. MDT's own freehand strokes run to well over a hundred points, so this is not about
 * matching the game — it is about a slow hand not producing ten times what a fast one does.
 */
const MIN_SAMPLE_DISTANCE = 6

export default function DrawSurface({
  transform,
  mode,
  onProgress,
  onCommit,
}: {
  transform: Transform
  /** 'point' reports one position on release; 'line' reports two; 'freehand' reports many. */
  mode: 'point' | 'line' | 'freehand'
  /** Fires while the gesture is live, in map pixels. Empty until the pointer moves. */
  onProgress?: (points: Point[]) => void
  /** Fires once on release, with the whole gesture. */
  onCommit: (points: Point[]) => void
}) {
  /** The gesture in flight. Null between gestures, which is also how a cancel is remembered. */
  const gesture = useRef<{ points: Point[]; last: Point } | null>(null)

  const at = (e: React.PointerEvent): { map: Point; container: Point } => {
    const rect = e.currentTarget.getBoundingClientRect()
    const container = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    return { map: toMapPoint(transform, container), container }
  }

  return (
    <div
      data-testid="draw-surface"
      className="absolute inset-0"
      style={{ cursor: 'crosshair' }}
      onPointerDown={(e) => {
        // Matches the map's own pan starter (`DungeonMap`'s `onPointerDown`): only a left press
        // starts a gesture. A right or middle press is not an escape hatch from whatever tool is
        // active — it falls through untouched, the same as it does when no tool is active at all.
        if (e.button !== 0) return
        // The container above owns panning and takes pointer capture past 4px of movement. Stopping
        // here is what keeps a stroke from becoming a pan — and it is why drag-to-pan is gone while
        // a tool is active. Escape drops the tool, which is the way back.
        e.stopPropagation()
        // Unlike the container, this surface captures from the first press rather than after some
        // travel: it exists only while a tool is active, so there is no click it would otherwise
        // need to let through. Without this, a hand fast enough to carry the pointer past the
        // surface's edge (the map view is only ever as big as the viewport) leaves the browser to
        // route the eventual `pointerup` to whatever element is now underneath it instead — and
        // with the surface never hearing its own release, the gesture neither commits nor clears,
        // leaving an abandoned preview on screen and, since the previous task, on every peer's too.
        e.currentTarget.setPointerCapture(e.pointerId)
        const { map, container } = at(e)
        gesture.current = { points: [map], last: container }
        onProgress?.([map])
      }}
      onPointerMove={(e) => {
        const g = gesture.current
        if (!g) return
        e.stopPropagation()
        const { map, container } = at(e)
        if (mode === 'point') return
        if (mode === 'line') {
          // Two points, whatever the hand did in between: the second is wherever it is now.
          g.points = [g.points[0], map]
        } else {
          if (Math.hypot(container.x - g.last.x, container.y - g.last.y) < MIN_SAMPLE_DISTANCE) return
          g.points = [...g.points, map]
        }
        g.last = container
        onProgress?.(g.points)
      }}
      onPointerUp={(e) => {
        const g = gesture.current
        if (!g) return
        e.stopPropagation()
        gesture.current = null
        onProgress?.([])
        onCommit(g.points)
      }}
      onPointerCancel={() => {
        // A cancelled gesture commits nothing: the browser took the pointer away mid-stroke, and
        // guessing what the hand meant is worse than losing it.
        gesture.current = null
        onProgress?.([])
      }}
    />
  )
}
