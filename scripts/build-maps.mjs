// ABOUTME: Assembles MDT's 150 map tiles per floor into one WebP image per dungeon.
// ABOUTME: Reads and writes; the tile placement arithmetic lives in tile-layout.mjs.

/**
 * Assembles MDT's map tiles into one image per dungeon.
 *
 * MDT slices each floor into 150 PNGs of 128×128 laid out on a 15×10 grid (see
 * tile-layout.mjs for the placement arithmetic). We recompose them at 1920×1280 and emit
 * WebP: ~16 MB of raw PNG becomes ~5 MB, which is what makes the build deployable.
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { GENERATED_DIR, MDT_EXPANSION, MDT_GEOMETRY, MDT_PATH, PUBLIC_DIR } from './config.mjs'
import { tileLayout } from './tile-layout.mjs'

const { pixelWidth, pixelHeight } = MDT_GEOMETRY
const QUALITY = Number(process.env.MAP_QUALITY || 82)

async function buildMap(dungeon) {
  const tileDir = path.join(MDT_PATH, MDT_EXPANSION, 'Textures', dungeon.textureFolder)
  if (!fs.existsSync(tileDir)) {
    throw new Error(`No tiles found for ${dungeon.englishName}: ${tileDir}`)
  }

  const tileFile = (n) => path.join(tileDir, `1_${n}.png`)
  const { placements, missing } = tileLayout((n) => fs.existsSync(tileFile(n)))
  const composites = placements.map(({ n, left, top }) => ({ input: tileFile(n), left, top }))

  if (missing.length) {
    console.warn(`  ! ${dungeon.englishName}: ${missing.length} missing tiles (${missing.slice(0, 8).join(', ')}…)`)
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
    throw new Error('Run `npm run extract` first: src/data/generated/dungeons.json is missing.')
  }
  const dungeons = JSON.parse(fs.readFileSync(indexFile, 'utf8'))

  let total = 0
  for (const dungeon of dungeons) {
    const r = await buildMap(dungeon)
    total += r.size
    const ok = r.width === pixelWidth && r.height === pixelHeight ? '' : '  <-- unexpected dimensions'
    console.log(
      `${dungeon.englishName.padEnd(22)} ${r.width}×${r.height}  ` +
        `${String(r.tiles).padStart(3)} tiles  ${(r.size / 1024).toFixed(0).padStart(4)} KB${ok}`,
    )
  }
  console.log(`\nMaps total: ${(total / 1024 / 1024).toFixed(1)} MB`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
