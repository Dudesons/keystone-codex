// ABOUTME: Extracts MDT's dungeon .lua files into versioned JSON under src/data/generated/.
// ABOUTME: Reads and writes only; the parsing lives in mdt-dungeon.mjs.

/**
 * Extracts MDT's dungeon data into versioned JSON.
 *
 * The app never reads the WoW install at runtime: this script is the only bridge between
 * `D:\jeux\...\MythicDungeonTools\Midnight\*.lua` and `src/data/generated/`. Re-run it when
 * MDT is updated (`npm run extract`).
 *
 * Reading and writing live here; the parsing lives in mdt-dungeon.mjs, where it can be tested
 * against a committed fixture without a WoW install.
 */

import fs from 'node:fs'
import path from 'node:path'
import { GENERATED_DIR, MDT_EXPANSION, MDT_PATH, SEASON_DUNGEONS } from './config.mjs'
import { parseDungeon, summarise } from './mdt-dungeon.mjs'

function readDungeonSource(file) {
  const full = path.join(MDT_PATH, MDT_EXPANSION, `${file}.lua`)
  if (!fs.existsSync(full)) {
    throw new Error(
      `MDT file not found: ${full}\n` +
        `Check that MDT is installed, or override MDT_PATH / MDT_EXPANSION.`,
    )
  }
  return fs.readFileSync(full, 'utf8')
}

function main() {
  fs.mkdirSync(GENERATED_DIR, { recursive: true })

  const index = []
  for (const file of SEASON_DUNGEONS) {
    const dungeon = parseDungeon(readDungeonSource(file), file)
    const stats = summarise(dungeon)

    fs.writeFileSync(
      path.join(GENERATED_DIR, `${dungeon.slug}.json`),
      JSON.stringify(dungeon, null, 1),
      'utf8',
    )

    // The reachable force total must cover the required total, otherwise extraction missed something.
    const coverage = dungeon.totalCount ? Math.round((stats.forces / dungeon.totalCount) * 100) : 0
    const flag = coverage < 100 ? '  <-- not enough forces' : ''
    console.log(
      `${dungeon.englishName.padEnd(22)} idx=${String(dungeon.mdtIndex).padEnd(4)} ` +
        `mobs=${String(dungeon.enemies.length).padStart(3)} clones=${String(stats.clones).padStart(4)} ` +
        `packs=${String(stats.packs).padStart(3)} boss=${stats.bosses} ` +
        `forces=${stats.forces}/${dungeon.totalCount} (${coverage}%)${flag}`,
    )

    index.push({
      slug: dungeon.slug,
      englishName: dungeon.englishName,
      mdtIndex: dungeon.mdtIndex,
      mapID: dungeon.mapID,
      totalCount: dungeon.totalCount,
      bosses: stats.bosses,
      mobCount: dungeon.enemies.length,
      packCount: stats.packs,
      textureFolder: dungeon.textureFolder,
    })
  }

  fs.writeFileSync(path.join(GENERATED_DIR, 'dungeons.json'), JSON.stringify(index, null, 2), 'utf8')
  console.log(`\n${index.length} dungeons written to ${path.relative(process.cwd(), GENERATED_DIR)}`)
}

main()
