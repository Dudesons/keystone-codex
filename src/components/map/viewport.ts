/**
 * The map's arithmetic, separated from its rendering.
 *
 * Pan, zoom and blip layout are the parts of DungeonMap that can be wrong without anything
 * looking broken — a map that is merely off-centre, or pips that drift off their portrait.
 * They are pure functions here so they can be pinned without a DOM.
 */

import { MAP_HEIGHT, MAP_WIDTH, type Point } from '../../lib/geometry'

export const MIN_SCALE = 0.4
export const MAX_SCALE = 6

/** Zoom step per wheel notch, and per click on the +/− buttons. */
export const WHEEL_STEP = 1.15
export const BUTTON_STEP = 1.25

export interface Transform {
  scale: number
  tx: number
  ty: number
}

export interface Size {
  width: number
  height: number
}

/** The transform that fits the whole map inside `size` and centres it. */
export function fitTransform({ width, height }: Size): Transform {
  const scale = Math.min(width / MAP_WIDTH, height / MAP_HEIGHT)
  return {
    scale,
    tx: (width - MAP_WIDTH * scale) / 2,
    ty: (height - MAP_HEIGHT * scale) / 2,
  }
}

/**
 * Zoom by `factor` around a pivot given in container pixels.
 *
 * The pivot stays put under the cursor: that is the whole point, and it is why the
 * translation has to move too. Scale is clamped, and when the clamp bites the translation
 * must not move either — hence deriving `k` from the clamped scale rather than from `factor`.
 */
export function zoomAt(current: Transform, factor: number, pivot: Point): Transform {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor))
  const k = scale / current.scale
  return {
    scale,
    tx: pivot.x - (pivot.x - current.tx) * k,
    ty: pivot.y - (pivot.y - current.ty) * k,
  }
}

/** Radius of a mob's blip. Bosses read bigger, and MDT's own scale is capped. */
export function blipRadius(enemy: { isBoss?: true; scale?: number }): number {
  return (enemy.isBoss ? 22 : 14) * Math.min(enemy.scale || 1, 1.9)
}

export interface BadgePlacement {
  x: number
  y: number
  r: number
}

/**
 * Lays the indicator pips out on an arc above the blip, centred whatever their number.
 *
 * One pip sits straight above; two straddle that position; three fan out around it. Centring
 * on the count is what keeps them from sliding sideways as a mob gains an indicator.
 */
export function badgeArc(count: number, centre: Point, radius: number): BadgePlacement[] {
  const SPREAD_DEGREES = 46
  const GAP = 5
  const r = Math.max(6, radius * 0.42)

  return Array.from({ length: count }, (_, i) => {
    const angle = (-90 + (i - (count - 1) / 2) * SPREAD_DEGREES) * (Math.PI / 180)
    return {
      x: centre.x + Math.cos(angle) * (radius + GAP),
      y: centre.y + Math.sin(angle) * (radius + GAP),
      r,
    }
  })
}
