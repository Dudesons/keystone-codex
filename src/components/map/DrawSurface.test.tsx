// ABOUTME: Tests the drawing gesture: what each mode reports, and that it never reaches the pan.
// ABOUTME: jsdom lays everything out at zero, so these assert what was reported, never where.

// @vitest-environment jsdom
import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderEn } from '../../test/render'
import DrawSurface from './DrawSurface'
import type { Point } from '../../lib/geometry'

afterEach(cleanup)

const transform = { scale: 1, tx: 0, ty: 0 }

const mount = (over: Partial<React.ComponentProps<typeof DrawSurface>> = {}) => {
  const commits: Point[][] = []
  const progress: Point[][] = []
  const r = renderEn(
    <DrawSurface
      transform={transform}
      mode="line"
      onProgress={(p) => progress.push(p)}
      onCommit={(p) => commits.push(p)}
      {...over}
    />,
  )
  return { ...r, commits, progress, surface: r.container.querySelector('[data-testid="draw-surface"]')! }
}

describe('DrawSurface', () => {
  it('reports one point in point mode, on release', () => {
    const { surface, commits } = mount({ mode: 'point' })
    fireEvent.pointerDown(surface, { clientX: 10, clientY: 10, pointerId: 1 })
    expect(commits).toHaveLength(0)
    fireEvent.pointerUp(surface, { clientX: 10, clientY: 10, pointerId: 1 })
    expect(commits).toHaveLength(1)
    expect(commits[0]).toHaveLength(1)
  })

  it('reports exactly two points in line mode, however far the pointer wandered', () => {
    const { surface, commits } = mount({ mode: 'line' })
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 50, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 90, clientY: 40, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 90, clientY: 40, pointerId: 1 })
    expect(commits[0]).toHaveLength(2)
  })

  it('samples a freehand gesture, and drops a move too close to the last point', () => {
    const { surface, commits } = mount({ mode: 'freehand' })
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    // Well past the threshold.
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    // A hair away from the last one: dropped.
    fireEvent.pointerMove(surface, { clientX: 41, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 80, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 80, clientY: 0, pointerId: 1 })
    expect(commits[0]).toHaveLength(3)
  })

  it('reports progress while the gesture is live', () => {
    const { surface, progress } = mount({ mode: 'freehand' })
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    expect(progress.length).toBeGreaterThan(0)
    expect(progress.at(-1)!.length).toBe(2)
  })

  it('commits nothing when a gesture is cancelled', () => {
    const { surface, commits } = mount({ mode: 'freehand' })
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    fireEvent.pointerCancel(surface, { pointerId: 1 })
    expect(commits).toHaveLength(0)
  })

  it('keeps the gesture away from whatever owns panning above it', () => {
    let panStarted = 0
    const { container } = renderEn(
      <div onPointerDown={() => (panStarted += 1)}>
        <DrawSurface transform={transform} mode="freehand" onCommit={() => {}} />
      </div>,
    )
    fireEvent.pointerDown(container.querySelector('[data-testid="draw-surface"]')!, {
      clientX: 5,
      clientY: 5,
      pointerId: 1,
    })
    expect(panStarted).toBe(0)
  })
})
