// ABOUTME: Assembles MDT's 150 map tiles per floor into one WebP image per dungeon.
// ABOUTME: Reads and writes; placement lives in tile-layout.mjs, the skip rule in map-cache.mjs.

/**
 * Assembles MDT's map tiles into one image per dungeon.
 *
 * MDT slices each floor into 150 PNGs of 128×128 laid out on a 15×10 grid (see
 * tile-layout.mjs for the placement arithmetic). We recompose them at 1920×1280 and emit
 * WebP: ~16 MB of raw PNG becomes ~5 MB, which is what makes the build deployable.
 *
 * **A dungeon whose tiles have not moved is left alone.** The WebP encoder is not byte-stable,
 * so re-encoding every map on every run rewrote most of them for nothing — six of eight on one
 * measured run, two of those at identical size — and left someone to sort real artwork from
 * encoder noise by hand. The digest of each map's tiles is committed beside the maps, and
 * map-cache.mjs decides from it. `FORCE=1` re-encodes regardless, for a new encoder.
 */

import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { GENERATED_DIR, MDT_EXPANSION, MDT_GEOMETRY, MDT_PATH, PUBLIC_DIR } from './config.mjs'
import { rebuildReason, sourceDigest } from './map-cache.mjs'
import { tileLayout } from './tile-layout.mjs'

const { pixelWidth, pixelHeight } = MDT_GEOMETRY
const QUALITY = Number(process.env.MAP_QUALITY || 82)
const FORCE = process.env.FORCE === '1'
const MAP_DIR = path.join(PUBLIC_DIR, 'maps')
/**
 * The digest of the tiles each committed map was built from, beside the maps themselves so the
 * two cannot drift apart in a checkout. Committed: without it every clone rebuilds everything
 * once, which is the churn this file exists to avoid.
 */
const DIGEST_FILE = path.join(MAP_DIR, 'source-digests.json')

function loadDigests() {
  return fs.existsSync(DIGEST_FILE) ? JSON.parse(fs.readFileSync(DIGEST_FILE, 'utf8')) : {}
}

/** What this dungeon's map would be built from, and the digest that identifies it. */
function mapSource(dungeon) {
  const tileDir = path.join(MDT_PATH, MDT_EXPANSION, 'Textures', dungeon.textureFolder)
  if (!fs.existsSync(tileDir)) {
    throw new Error(`No tiles found for ${dungeon.englishName}: ${tileDir}`)
  }

  const tileFile = (n) => path.join(tileDir, `1_${n}.png`)
  const { placements, missing } = tileLayout((n) => fs.existsSync(tileFile(n)))
  const composites = placements.map(({ n, left, top }) => ({ input: tileFile(n), left, top }))

  // The tiles' own bytes, not their names or timestamps: a re-export that rewrote every file
  // without changing a pixel must not read as new artwork, and a touched mtime is not a change.
  const tiles = placements.map(({ n }) => ({
    n,
    hash: createHash('sha256').update(fs.readFileSync(tileFile(n))).digest('hex'),
  }))

  return {
    composites,
    missing,
    outFile: path.join(MAP_DIR, `${dungeon.slug}.webp`),
    digest: sourceDigest({ quality: QUALITY, width: pixelWidth, height: pixelHeight, tiles }),
  }
}

async function encodeMap(dungeon, { composites, missing, outFile }) {
  if (missing.length) {
    console.warn(`  ! ${dungeon.englishName}: ${missing.length} missing tiles (${missing.slice(0, 8).join(', ')}…)`)
  }

  fs.mkdirSync(MAP_DIR, { recursive: true })

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
}

/** What the report line needs about a map, whether this run encoded it or left it alone. */
async function describeMap(outFile, tiles) {
  const meta = await sharp(outFile).metadata()
  return { size: fs.statSync(outFile).size, width: meta.width, height: meta.height, tiles }
}

async function main() {
  const indexFile = path.join(GENERATED_DIR, 'dungeons.json')
  if (!fs.existsSync(indexFile)) {
    throw new Error('Run `npm run extract` first: src/data/generated/dungeons.json is missing.')
  }
  const dungeons = JSON.parse(fs.readFileSync(indexFile, 'utf8'))

  const previous = loadDigests()
  const digests = {}
  let total = 0
  let built = 0

  for (const dungeon of dungeons) {
    const source = mapSource(dungeon)
    digests[dungeon.slug] = source.digest

    const reason = rebuildReason({
      digest: source.digest,
      previous: previous[dungeon.slug],
      outputExists: fs.existsSync(source.outFile),
      force: FORCE,
    })
    if (reason) {
      await encodeMap(dungeon, source)
      built++
    }

    const r = await describeMap(source.outFile, source.composites.length)
    total += r.size
    const ok = r.width === pixelWidth && r.height === pixelHeight ? '' : '  <-- unexpected dimensions'
    console.log(
      `${dungeon.englishName.padEnd(22)} ${r.width}×${r.height}  ` +
        `${String(r.tiles).padStart(3)} tiles  ${(r.size / 1024).toFixed(0).padStart(4)} KB  ` +
        `${reason ? `rebuilt: ${reason}` : 'unchanged'}${ok}`,
    )
  }

  // Written whatever happened, so a run that changed nothing still records the digests it
  // measured — otherwise a first run after this landed would re-encode on every invocation.
  fs.writeFileSync(DIGEST_FILE, `${JSON.stringify(digests, null, 2)}\n`, 'utf8')

  console.log(
    `\nMaps total: ${(total / 1024 / 1024).toFixed(1)} MB — ` +
      `${built} rebuilt, ${dungeons.length - built} left alone`,
  )
  if (built && !FORCE) {
    console.log('Commit public/maps/ together with source-digests.json: they are one fact.')
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
