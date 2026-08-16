/**
 * Map tile layout for MDT, isolated from all I/O.
 *
 * MDT slices each floor into 150 PNGs of 128×128 laid out on a 15×10 grid, with tile `n`
 * occupying row `ceil(n/15)` and column `((n-1) % 15) + 1` (MapView.lua:584). This
 * arithmetic is the only thing deciding where each piece lands: a one-index slip offsets the
 * whole map without failing any build, which is why it lives on its own.
 */

import { MDT_GEOMETRY } from './config.mjs'

/** Pixel position of the top-left corner of tile `n`, indexed from 1. */
export function tilePosition(n, geometry = MDT_GEOMETRY) {
  const { tileCols, tileSize } = geometry
  const row = Math.ceil(n / tileCols) - 1
  const col = (n - 1) % tileCols
  return { left: col * tileSize, top: row * tileSize }
}

/**
 * Lays out every tile of one floor.
 *
 * `hasTile(n)` says whether the tile exists; missing ones are reported rather than silently
 * skipped — a floor with holes is still usable, but we want to know about it.
 */
export function tileLayout(hasTile, geometry = MDT_GEOMETRY) {
  const total = geometry.tileCols * geometry.tileRows
  const placements = []
  const missing = []

  for (let n = 1; n <= total; n++) {
    if (!hasTile(n)) {
      missing.push(n)
      continue
    }
    placements.push({ n, ...tilePosition(n, geometry) })
  }

  return { placements, missing, total }
}
