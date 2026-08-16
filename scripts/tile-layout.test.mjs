import { describe, expect, it } from 'vitest'
import { MDT_GEOMETRY } from './config.mjs'
import { tileLayout, tilePosition } from './tile-layout.mjs'

const { tileCols, tileRows, tileSize, pixelWidth, pixelHeight } = MDT_GEOMETRY
const TOTAL = tileCols * tileRows

describe('tilePosition', () => {
  it('puts the first tile at the origin', () => {
    expect(tilePosition(1)).toEqual({ left: 0, top: 0 })
  })

  it('fills a row before moving to the next', () => {
    expect(tilePosition(2)).toEqual({ left: tileSize, top: 0 })
    expect(tilePosition(tileCols)).toEqual({ left: (tileCols - 1) * tileSize, top: 0 })
    expect(tilePosition(tileCols + 1)).toEqual({ left: 0, top: tileSize })
  })

  it('puts the last tile in the bottom-right corner', () => {
    expect(tilePosition(TOTAL)).toEqual({
      left: pixelWidth - tileSize,
      top: pixelHeight - tileSize,
    })
  })

  it('keeps every tile inside the image', () => {
    for (let n = 1; n <= TOTAL; n++) {
      const { left, top } = tilePosition(n)
      expect(left).toBeGreaterThanOrEqual(0)
      expect(top).toBeGreaterThanOrEqual(0)
      expect(left + tileSize).toBeLessThanOrEqual(pixelWidth)
      expect(top + tileSize).toBeLessThanOrEqual(pixelHeight)
    }
  })

  it('never hands out the same position twice', () => {
    const seen = new Set()
    for (let n = 1; n <= TOTAL; n++) {
      const { left, top } = tilePosition(n)
      seen.add(`${left}:${top}`)
    }
    expect(seen.size).toBe(TOTAL)
  })

  it('accepts a different geometry', () => {
    const geometry = { tileCols: 4, tileRows: 3, tileSize: 10 }
    expect(tilePosition(5, geometry)).toEqual({ left: 0, top: 10 })
    expect(tilePosition(12, geometry)).toEqual({ left: 30, top: 20 })
  })
})

describe('tileLayout', () => {
  it('places all 150 tiles of a complete floor', () => {
    const { placements, missing, total } = tileLayout(() => true)
    expect(total).toBe(TOTAL)
    expect(placements).toHaveLength(TOTAL)
    expect(missing).toEqual([])
  })

  it('covers the image exactly, with no gap and no overlap', () => {
    const { placements } = tileLayout(() => true)
    const area = placements.length * tileSize * tileSize
    expect(area).toBe(pixelWidth * pixelHeight)
  })

  it('reports missing tiles instead of staying silent about them', () => {
    const absent = new Set([1, 42, TOTAL])
    const { placements, missing } = tileLayout((n) => !absent.has(n))
    expect(missing).toEqual([1, 42, TOTAL])
    expect(placements).toHaveLength(TOTAL - 3)
  })

  it('does not shift the remaining tiles when some are missing', () => {
    const { placements } = tileLayout((n) => n !== 1)
    const second = placements.find((p) => p.n === 2)
    expect(second).toMatchObject(tilePosition(2))
  })

  it('handles a floor with no tiles at all', () => {
    const { placements, missing } = tileLayout(() => false)
    expect(placements).toEqual([])
    expect(missing).toHaveLength(TOTAL)
  })
})

describe('MDT geometry', () => {
  it('derives the image dimensions from the tile grid', () => {
    expect(pixelWidth).toBe(tileCols * tileSize)
    expect(pixelHeight).toBe(tileRows * tileSize)
  })
})
