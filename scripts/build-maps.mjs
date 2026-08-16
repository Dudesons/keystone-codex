/**
 * Assemble les tuiles de carte de MDT en une image par donjon.
 *
 * MDT découpe chaque plan en 150 PNG de 128×128 disposés en grille 15×10, la tuile `n`
 * occupant la ligne `ceil(n/15)` et la colonne `((n-1) % 15) + 1` (MapView.lua:584).
 * On les recompose en 1920×1280 et on sort du WebP : ~16 Mo de PNG bruts deviennent ~5 Mo,
 * ce qui rend le build déployable.
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { GENERATED_DIR, MDT_EXPANSION, MDT_GEOMETRY, MDT_PATH, PUBLIC_DIR } from './config.mjs'

const { tileCols, tileRows, tileSize, pixelWidth, pixelHeight } = MDT_GEOMETRY
const TILE_COUNT = tileCols * tileRows
const QUALITY = Number(process.env.MAP_QUALITY || 82)

async function buildMap(dungeon) {
  const tileDir = path.join(MDT_PATH, MDT_EXPANSION, 'Textures', dungeon.textureFolder)
  if (!fs.existsSync(tileDir)) {
    throw new Error(`Tuiles introuvables pour ${dungeon.englishName} : ${tileDir}`)
  }

  const composites = []
  const missing = []
  for (let n = 1; n <= TILE_COUNT; n++) {
    const file = path.join(tileDir, `1_${n}.png`)
    if (!fs.existsSync(file)) {
      missing.push(n)
      continue
    }
    const row = Math.ceil(n / tileCols) - 1
    const col = ((n - 1) % tileCols)
    composites.push({ input: file, left: col * tileSize, top: row * tileSize })
  }

  if (missing.length) {
    console.warn(`  ! ${dungeon.englishName}: ${missing.length} tuiles manquantes (${missing.slice(0, 8).join(', ')}…)`)
  }

  const outDir = path.join(PUBLIC_DIR, 'maps')
  fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, `${dungeon.slug}.webp`)

  await sharp({
    create: {
      width: pixelWidth,
      height: pixelHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp({ quality: QUALITY })
    .toFile(outFile)

  const size = fs.statSync(outFile).size
  const meta = await sharp(outFile).metadata()
  return { outFile, size, width: meta.width, height: meta.height, tiles: composites.length }
}

async function main() {
  const indexFile = path.join(GENERATED_DIR, 'dungeons.json')
  if (!fs.existsSync(indexFile)) {
    throw new Error("Lance d'abord `npm run extract` : src/data/generated/dungeons.json est absent.")
  }
  const dungeons = JSON.parse(fs.readFileSync(indexFile, 'utf8'))

  let total = 0
  for (const dungeon of dungeons) {
    const r = await buildMap(dungeon)
    total += r.size
    const ok = r.width === pixelWidth && r.height === pixelHeight ? '' : '  <-- dimensions inattendues'
    console.log(
      `${dungeon.englishName.padEnd(22)} ${r.width}×${r.height}  ` +
        `${String(r.tiles).padStart(3)} tuiles  ${(r.size / 1024).toFixed(0).padStart(4)} Ko${ok}`,
    )
  }
  console.log(`\nTotal cartes : ${(total / 1024 / 1024).toFixed(1)} Mo`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
