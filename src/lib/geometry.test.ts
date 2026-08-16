import { describe, expect, it } from 'vitest'
import {
  MAP_HEIGHT,
  MAP_SCALE,
  MAP_WIDTH,
  MDT_COORD_HEIGHT,
  MDT_COORD_WIDTH,
  convexHull,
  expandPolygon,
  roundedPolygonPath,
  toMdtCoords,
  toPixels,
  type Point,
} from './geometry'

/** Aire signée (lacet). Positive = sens horaire dans un repère écran (Y vers le bas). */
const signedArea = (pts: Point[]) =>
  pts.reduce((sum, a, i) => {
    const b = pts[(i + 1) % pts.length]
    return sum + (a.x * b.y - b.x * a.y)
  }, 0) / 2

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

const centroid = (pts: Point[]): Point => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
})

describe('Échelle et repère', () => {
  it('applique un facteur unique : la carte a le rapport d\'aspect du repère MDT', () => {
    expect(MAP_WIDTH / MDT_COORD_WIDTH).toBeCloseTo(MAP_HEIGHT / MDT_COORD_HEIGHT, 10)
    expect(MAP_SCALE).toBeCloseTo(MAP_WIDTH / MDT_COORD_WIDTH, 10)
  })

  it('place l\'origine MDT au coin haut-gauche de l\'image', () => {
    const { x, y } = toPixels(0, 0)
    // Y vaut -0 (la négation de 0), indistinguable de 0 au rendu comme en arithmétique.
    expect(x).toBeCloseTo(0, 9)
    expect(y).toBeCloseTo(0, 9)
  })

  it('retourne l\'axe Y : les positions de mobs sont négatives en MDT, positives à l\'écran', () => {
    expect(toPixels(0, -560).y).toBeCloseTo(MAP_HEIGHT, 6)
    // Une coordonnée Y positive sortirait de l'image par le haut — c'est bien un cas anormal.
    expect(toPixels(0, 100).y).toBeLessThan(0)
  })

  it('fait tomber le coin bas-droit du repère MDT sur le coin de l\'image', () => {
    const { x, y } = toPixels(MDT_COORD_WIDTH, -MDT_COORD_HEIGHT)
    expect(x).toBeCloseTo(MAP_WIDTH, 6)
    expect(y).toBeCloseTo(MAP_HEIGHT, 6)
  })

  it('toMdtCoords est l\'inverse exact de toPixels', () => {
    for (const [x, y] of [
      [0, 0],
      [123.5, -456.25],
      [MDT_COORD_WIDTH, -MDT_COORD_HEIGHT],
      [-42, 17],
    ]) {
      const px = toPixels(x, y)
      const back = toMdtCoords(px.x, px.y)
      expect(back.x).toBeCloseTo(x, 9)
      expect(back.y).toBeCloseTo(y, 9)
    }
  })
})

describe('convexHull', () => {
  it('renvoie tel quel un ensemble qui ne peut pas former d\'enveloppe', () => {
    expect(convexHull([])).toEqual([])
    expect(convexHull([{ x: 1, y: 2 }])).toEqual([{ x: 1, y: 2 }])
    expect(convexHull([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ])
  })

  it('écarte les points intérieurs', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    const hull = convexHull([...square, { x: 5, y: 5 }, { x: 2, y: 8 }])
    expect(hull).toHaveLength(4)
    expect(hull).toEqual(expect.arrayContaining(square))
  })

  it('écarte les points alignés sur une arête', () => {
    const hull = convexHull([
      { x: 0, y: 0 },
      { x: 5, y: 0 }, // au milieu de l'arête du haut
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ])
    expect(hull).toHaveLength(4)
    expect(hull).not.toContainEqual({ x: 5, y: 0 })
  })

  it('parcourt les sommets dans le sens horaire à l\'écran', () => {
    expect(signedArea(convexHull([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]))).toBeGreaterThan(0)

    // L'ordre d'entrée ne doit pas influer sur l'orientation de sortie.
    expect(signedArea(convexHull([
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
      { x: 0, y: 0 },
    ]))).toBeGreaterThan(0)
  })

  it('ne modifie pas le tableau reçu', () => {
    const input = [
      { x: 10, y: 10 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 5 },
    ]
    const copy = structuredClone(input)
    convexHull(input)
    expect(input).toEqual(copy)
  })
})

describe('expandPolygon', () => {
  const square: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ]

  it('laisse un polygone vide intact', () => {
    expect(expandPolygon([], 26)).toEqual([])
  })

  it('éloigne chaque sommet du centre de exactement `padding`', () => {
    const c = centroid(square)
    const grown = expandPolygon(square, 4)
    square.forEach((p, i) => {
      expect(dist(grown[i], c) - dist(p, c)).toBeCloseTo(4, 9)
    })
  })

  it('conserve le centre d\'une figure symétrique', () => {
    const grown = expandPolygon(square, 26)
    expect(centroid(grown).x).toBeCloseTo(centroid(square).x, 9)
    expect(centroid(grown).y).toBeCloseTo(centroid(square).y, 9)
  })

  it('ne produit pas de NaN quand un sommet est confondu avec le centre', () => {
    // Un pack d'un seul clone : le sommet EST le centre, la direction est indéfinie.
    const grown = expandPolygon([{ x: 7, y: -3 }], 26)
    expect(grown[0].x).toBeCloseTo(7, 9)
    expect(grown[0].y).toBeCloseTo(-3, 9)
  })

  it('ne modifie pas le tableau reçu', () => {
    const copy = structuredClone(square)
    expandPolygon(square, 26)
    expect(square).toEqual(copy)
  })
})

describe('roundedPolygonPath', () => {
  it('renvoie une chaîne vide sans sommet', () => {
    expect(roundedPolygonPath([])).toBe('')
  })

  it('dessine un cercle autour d\'un sommet isolé', () => {
    expect(roundedPolygonPath([{ x: 5, y: 7 }])).toBe(
      'M 5 7 m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0',
    )
  })

  it('dessine un segment entre deux sommets', () => {
    expect(roundedPolygonPath([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe('M 1 2 L 3 4')
  })

  it('produit un chemin fermé, une courbe par sommet', () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    const d = roundedPolygonPath(pts)
    expect(d.startsWith('M ')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect(d.match(/Q /g)).toHaveLength(pts.length)
  })

  it('démarre au milieu de la dernière arête, pour que la boucle se referme sans angle', () => {
    // Dernière arête : (0,10) -> (0,0), milieu (0,5).
    const d = roundedPolygonPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ])
    expect(d.startsWith('M 0 5 ')).toBe(true)
  })
})
