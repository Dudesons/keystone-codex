// ABOUTME: Tests how a stroke is drawn: its polyline, its width, its caps, its arrow head.
// ABOUTME: Geometry is asserted on attributes, which is the one thing jsdom reports faithfully.

// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { cleanup, fireEvent } from '@testing-library/react'
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

  it('draws nothing at all when there is no stroke', () => {
    const { container } = renderEn(<ObjectLayer strokes={[]} />, { wrapper: svg })
    expect(container.querySelector('polyline')).toBeNull()
  })
})

describe('An arrow’s head', () => {
  const arrow: MdtStroke = { ...line, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], isArrow: true }

  /** The head's three corners, tip first, as numbers rather than as an attribute string. */
  const corners = (stroke: MdtStroke) => {
    const { container } = renderEn(<ObjectLayer strokes={[stroke]} />, { wrapper: svg })
    return container
      .querySelector('polygon')!
      .getAttribute('points')!
      .split(' ')
      .map((pair) => {
        const [x, y] = pair.split(',').map(Number)
        return { x, y }
      })
  }

  it('is as wide as MDT’s triangle box, not as wide as the shaft it caps', () => {
    // MDT draws the head from `d[1] * scale` and the shaft from `d[1] * 0.3 * scale`
    // (`Modules/PresetObjects.lua`, `DrawTriangle` on a size × size texture), so the head is
    // more than three times the width of its own line. Deriving it from the shaft width is what
    // made it read as a nub on a stick.
    const [, left, right] = corners(arrow)
    expect(Math.hypot(right.x - left.x, right.y - left.y)).toBeCloseTo(5 * MAP_SCALE, 6)
  })

  it('is centred on the last point, so its tip overhangs the line', () => {
    // MDT anchors the texture "CENTER" on the stroke's end rather than resting its tip there.
    const [tip, left, right] = corners(arrow)
    const base = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 }
    expect((tip.x + base.x) / 2).toBeCloseTo(100, 6)
    expect((tip.y + base.y) / 2).toBeCloseTo(0, 6)
    expect(tip.x).toBeGreaterThan(100)
  })

  it('points along the last segment, not along a stored angle', () => {
    const [tip] = corners(arrow)
    expect(tip.y).toBeCloseTo(0, 6)
    expect(tip.x).toBeGreaterThan(100)
  })

  it('turns with the line, so a head is never left pointing the old way', () => {
    const down: MdtStroke = { ...arrow, points: [{ x: 0, y: 0 }, { x: 0, y: 100 }] }
    const [tip] = corners(down)
    expect(tip.x).toBeCloseTo(0, 6)
    expect(tip.y).toBeGreaterThan(100)
  })
})

describe('Selecting a stroke', () => {
  const stroke = (id: string): MdtStroke => ({
    kind: 'stroke',
    points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
    sublevel: 1,
    color: 'ff365c',
    size: 5,
    smooth: true,
    layer: -8,
    isArrow: false,
    id,
  })

  it('is inert to the pointer when nothing can select it', () => {
    const { container } = renderEn(
      <svg>
        <ObjectLayer strokes={[stroke('a')]} />
      </svg>,
    )
    expect(container.querySelector('[data-hit="a"]')).toBeNull()
  })

  it('grows a hit target once selection is possible', () => {
    const { container } = renderEn(
      <svg>
        <ObjectLayer strokes={[stroke('a')]} onSelect={() => {}} />
      </svg>,
    )
    const hit = container.querySelector('[data-hit="a"]')!
    expect(hit).toBeTruthy()
    // Wider than the stroke, or a thin line would be impossible to hit.
    expect(Number(hit.getAttribute('stroke-width'))).toBeGreaterThan(5 * 0.3)
  })

  it('reports which stroke was clicked', () => {
    const picked: string[] = []
    const { container } = renderEn(
      <svg>
        <ObjectLayer strokes={[stroke('a')]} onSelect={(id) => picked.push(id)} />
      </svg>,
    )
    fireEvent.click(container.querySelector('[data-hit="a"]')!)
    expect(picked).toEqual(['a'])
  })

  it('marks the selected stroke, so a reader can see which it is', () => {
    const { container } = renderEn(
      <svg>
        <ObjectLayer strokes={[stroke('a')]} selectedId="a" onSelect={() => {}} />
      </svg>,
    )
    expect(container.querySelector('[data-selected="true"]')).toBeTruthy()
  })

  it('does not mark a stroke with no id as selected, even when selectedId is unset', () => {
    // Covers decision 8b: an untouched preset object carries no id at all, so `selectedId ===
    // stroke.id` (`undefined === undefined`) must not read as a match.
    const untouched: MdtStroke = { ...stroke('placeholder'), id: undefined }
    const { container } = renderEn(
      <svg>
        <ObjectLayer strokes={[untouched]} onSelect={() => {}} />
      </svg>,
    )
    expect(container.querySelector('[data-selected="true"]')).toBeNull()
    expect(container.querySelector('[data-hit]')).toBeNull()
  })
})
