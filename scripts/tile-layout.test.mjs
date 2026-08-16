import { describe, expect, it } from 'vitest'
import { MDT_GEOMETRY } from './config.mjs'
import { tileLayout, tilePosition } from './tile-layout.mjs'

const { tileCols, tileRows, tileSize, pixelWidth, pixelHeight } = MDT_GEOMETRY
const TOTAL = tileCols * tileRows

describe('tilePosition', () => {
  it('place la première tuile à l\'origine', () => {
    expect(tilePosition(1)).toEqual({ left: 0, top: 0 })
  })

  it('remplit une ligne avant de passer à la suivante', () => {
    expect(tilePosition(2)).toEqual({ left: tileSize, top: 0 })
    expect(tilePosition(tileCols)).toEqual({ left: (tileCols - 1) * tileSize, top: 0 })
    expect(tilePosition(tileCols + 1)).toEqual({ left: 0, top: tileSize })
  })

  it('place la dernière tuile dans le coin bas-droit', () => {
    expect(tilePosition(TOTAL)).toEqual({
      left: pixelWidth - tileSize,
      top: pixelHeight - tileSize,
    })
  })

  it('garde toutes les tuiles dans l\'image', () => {
    for (let n = 1; n <= TOTAL; n++) {
      const { left, top } = tilePosition(n)
      expect(left).toBeGreaterThanOrEqual(0)
      expect(top).toBeGreaterThanOrEqual(0)
      expect(left + tileSize).toBeLessThanOrEqual(pixelWidth)
      expect(top + tileSize).toBeLessThanOrEqual(pixelHeight)
    }
  })

  it('n\'attribue jamais deux fois la même position', () => {
    const vues = new Set()
    for (let n = 1; n <= TOTAL; n++) {
      const { left, top } = tilePosition(n)
      vues.add(`${left}:${top}`)
    }
    expect(vues.size).toBe(TOTAL)
  })

  it('accepte une autre géométrie', () => {
    const geometry = { tileCols: 4, tileRows: 3, tileSize: 10 }
    expect(tilePosition(5, geometry)).toEqual({ left: 0, top: 10 })
    expect(tilePosition(12, geometry)).toEqual({ left: 30, top: 20 })
  })
})

describe('tileLayout', () => {
  it('place les 150 tuiles d\'un plan complet', () => {
    const { placements, missing, total } = tileLayout(() => true)
    expect(total).toBe(TOTAL)
    expect(placements).toHaveLength(TOTAL)
    expect(missing).toEqual([])
  })

  it('couvre exactement l\'image sans trou ni recouvrement', () => {
    const { placements } = tileLayout(() => true)
    const aire = placements.length * tileSize * tileSize
    expect(aire).toBe(pixelWidth * pixelHeight)
  })

  it('rapporte les tuiles manquantes au lieu de les taire', () => {
    const absentes = new Set([1, 42, TOTAL])
    const { placements, missing } = tileLayout((n) => !absentes.has(n))
    expect(missing).toEqual([1, 42, TOTAL])
    expect(placements).toHaveLength(TOTAL - 3)
  })

  it('ne décale pas les tuiles restantes quand il en manque', () => {
    const { placements } = tileLayout((n) => n !== 1)
    const deuxieme = placements.find((p) => p.n === 2)
    expect(deuxieme).toMatchObject(tilePosition(2))
  })

  it('gère un plan entièrement absent', () => {
    const { placements, missing } = tileLayout(() => false)
    expect(placements).toEqual([])
    expect(missing).toHaveLength(TOTAL)
  })
})

describe('Géométrie de MDT', () => {
  it('dérive les dimensions de l\'image de la grille de tuiles', () => {
    expect(pixelWidth).toBe(tileCols * tileSize)
    expect(pixelHeight).toBe(tileRows * tileSize)
  })
})
