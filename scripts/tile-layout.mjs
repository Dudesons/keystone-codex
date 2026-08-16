/**
 * Disposition des tuiles de carte de MDT, isolée de toute entrée-sortie.
 *
 * MDT découpe chaque plan en 150 PNG de 128×128 disposés en grille 15×10, la tuile `n`
 * occupant la ligne `ceil(n/15)` et la colonne `((n-1) % 15) + 1` (MapView.lua:584).
 * Ce calcul est la seule chose qui décide où chaque morceau atterrit : une erreur d'un
 * indice décale toute la carte sans qu'aucun build n'échoue, d'où sa séparation.
 */

import { MDT_GEOMETRY } from './config.mjs'

/** Position en pixels du coin haut-gauche de la tuile `n`, indexée depuis 1. */
export function tilePosition(n, geometry = MDT_GEOMETRY) {
  const { tileCols, tileSize } = geometry
  const row = Math.ceil(n / tileCols) - 1
  const col = (n - 1) % tileCols
  return { left: col * tileSize, top: row * tileSize }
}

/**
 * Place toutes les tuiles d'un plan.
 *
 * `hasTile(n)` dit si la tuile existe ; les manquantes sont rapportées plutôt qu'ignorées
 * silencieusement — un plan troué reste exploitable, mais on veut le savoir.
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
