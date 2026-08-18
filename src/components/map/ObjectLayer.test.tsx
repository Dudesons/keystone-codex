// ABOUTME: Tests how a stroke is drawn: its polyline, its width, its caps, its arrow head.
// ABOUTME: Geometry is asserted on attributes, which is the one thing jsdom reports faithfully.

// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MAP_SCALE } from '../../lib/geometry'
import type { MdtStroke } from '../../lib/mdt/objects'
import { renderEn } from '../../test/render'
import ObjectLayer from './ObjectLayer'

afterEach(cleanup)

const svg = ({ children }: { children: ReactNode }) => <svg>{children}</svg>

const line: MdtStroke = {
  kind: 'stroke',
  points: [
    { x: 10, y: 20 },
    { x: 30, y: 40 },
  ],
  sublevel: 1,
  color: 'ff3eff',
  size: 5,
  smooth: true,
  layer: 0,
  isArrow: false,
}

describe('ObjectLayer', () => {
  it('draws a stroke as one polyline through its points, in order', () => {
    const { container } = renderEn(<ObjectLayer strokes={[line]} />, { wrapper: svg })
    const polyline = container.querySelector('polyline')!
    expect(polyline.getAttribute('points')).toBe('10,20 30,40')
    expect(polyline.getAttribute('stroke')).toBe('#ff3eff')
  })

  it("takes its width from MDT's own 0.3 factor, in map pixels", () => {
    const { container } = renderEn(<ObjectLayer strokes={[line]} />, { wrapper: svg })
    expect(container.querySelector('polyline')!.getAttribute('stroke-width')).toBe(
      String(5 * 0.3 * MAP_SCALE),
    )
  })

  it('rounds the caps of a smooth stroke, the way MDT circles its joints', () => {
    const { container } = renderEn(<ObjectLayer strokes={[line]} />, { wrapper: svg })
    expect(container.querySelector('polyline')!.getAttribute('stroke-linecap')).toBe('round')
  })

  it('leaves the caps square when the stroke is not smooth', () => {
    const { container } = renderEn(<ObjectLayer strokes={[{ ...line, smooth: false }]} />, { wrapper: svg })
    expect(container.querySelector('polyline')!.getAttribute('stroke-linecap')).toBe('butt')
  })

  it('gives an arrow a head, and a plain line none', () => {
    const { container } = renderEn(<ObjectLayer strokes={[line, { ...line, isArrow: true }]} />, {
      wrapper: svg,
    })
    expect(container.querySelectorAll('polygon')).toHaveLength(1)
  })

  it('points the head along the last segment, not along a stored angle', () => {
    // Straight to the right: the head's tip is the last point, whatever MDT recorded.
    const right: MdtStroke = { ...line, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], isArrow: true }
    const { container } = renderEn(<ObjectLayer strokes={[right]} />, { wrapper: svg })
    const [tip] = container.querySelector('polygon')!.getAttribute('points')!.split(' ')
    expect(tip).toBe('100,0')
  })

  it('draws nothing at all when there is no stroke', () => {
    const { container } = renderEn(<ObjectLayer strokes={[]} />, { wrapper: svg })
    expect(container.querySelector('polyline')).toBeNull()
  })
})
