/**
 * Extrait les données de donjon de MDT vers du JSON versionné.
 *
 * L'app ne lit jamais l'installation WoW à l'exécution : ce script est le seul pont entre
 * `D:\jeux\...\MythicDungeonTools\Midnight\*.lua` et `src/data/generated/`. À relancer
 * quand MDT est mis à jour (`npm run extract`).
 */

import fs from 'node:fs'
import path from 'node:path'
import { LuaExpr, parseAssignment, toPlain } from './lua-table.mjs'
import { GENERATED_DIR, MDT_EXPANSION, MDT_PATH, SEASON_DUNGEONS, slugify } from './config.mjs'

/** Les CC que MDT référence dans `characteristics`, dans l'ordre d'affichage du codex. */
const CC_ORDER = [
  'Stun', 'Incapacitate', 'Silence', 'Fear', 'Root', 'Slow', 'Knock', 'Grip',
  'Disorient', 'Polymorph', 'Sap', 'Banish', 'Imprison', 'Hibernate', 'Repentance',
  'Shackle Undead', 'Mind Control', 'Sleep Walk', 'Mind Soothe', 'Taunt',
]

/**
 * Renvoie les entrées à clé entière d'une table Lua, triées numériquement.
 *
 * Les index de MDT sont *sparses* : supprimer un mob ou un clone laisse un trou
 * (`clones = { [8] = ..., [13] = ... }`). Or cet index est exactement ce que les routes
 * référencent, donc il doit être préservé tel quel et jamais renuméroté.
 */
function intEntries(table) {
  if (!table || typeof table !== 'object') return []
  return Object.entries(table)
    .filter(([k]) => /^\d+$/.test(k))
    .map(([k, v]) => [Number(k), v])
    .sort((a, b) => a[0] - b[0])
}

/** Types de dispel que MDT pose comme drapeaux sur les sorts. */
const DISPEL_FLAGS = ['magic', 'curse', 'disease', 'poison', 'bleed', 'enrage']

function readDungeonSource(file) {
  const full = path.join(MDT_PATH, MDT_EXPANSION, `${file}.lua`)
  if (!fs.existsSync(full)) {
    throw new Error(
      `Fichier MDT introuvable : ${full}\n` +
        `Vérifie que MDT est installé, ou surcharge MDT_PATH / MDT_EXPANSION.`,
    )
  }
  return fs.readFileSync(full, 'utf8')
}

/** Résout la valeur d'un `local <name> = <nombre>` en tête de fichier. */
function readLocalNumber(src, name) {
  const m = new RegExp(`local\\s+${name}\\s*=\\s*(-?\\d+)`).exec(src)
  return m ? Number(m[1]) : undefined
}

/** Déplie `plain(expr)` : les LuaExpr issues de `L["X"]` portent leur littéral. */
function unwrap(value) {
  if (value instanceof LuaExpr) return value.literal ?? value.identifier ?? value.raw
  return value
}

function extractTextureFolder(dungeonMaps) {
  // dungeonMaps[1].customTextures = 'Interface\\AddOns\\'..addonName..'\\Midnight\\Textures\\<Dossier>'
  const level = dungeonMaps?.['1'] ?? dungeonMaps?.[1]
  const raw = level?.customTextures
  const source = raw instanceof LuaExpr ? raw.raw : typeof raw === 'string' ? raw : ''
  const segments = source.match(/[\\/]([A-Za-z0-9_]+)'/g)
  if (!segments?.length) return null
  return segments[segments.length - 1].replace(/^[\\/]/, '').replace(/'$/, '')
}

function normaliseSpells(spells) {
  if (!spells || typeof spells !== 'object') return []
  return Object.entries(spells).map(([id, flags]) => {
    const dispel = DISPEL_FLAGS.filter((f) => flags?.[f] === true)
    return {
      id: Number(id),
      // MDT ne pose `interruptible` que quand c'est pertinent ; l'absence n'est pas une négation.
      interruptible: flags?.interruptible === true ? true : undefined,
      dispel: dispel.length ? dispel : undefined,
    }
  })
}

function normaliseCharacteristics(characteristics) {
  if (!characteristics || typeof characteristics !== 'object') return []
  const known = CC_ORDER.filter((cc) => characteristics[cc] === true)
  const extra = Object.keys(characteristics).filter((k) => characteristics[k] === true && !CC_ORDER.includes(k))
  if (extra.length) console.warn(`  ! characteristics inconnues, ajoute-les à CC_ORDER : ${extra.join(', ')}`)
  return [...known, ...extra]
}

function normaliseClones(clones) {
  return intEntries(clones).map(([mdtIdx, clone]) => {
    const patrol = intEntries(clone.patrol).map(([, p]) => ({ x: p.x, y: p.y }))
    return {
      // Index tel que MDT le référence dans les routes — sparse, donc conservé à l'identique.
      mdtIdx,
      x: clone.x,
      y: clone.y,
      g: clone.g ?? null,
      sublevel: clone.sublevel ?? 1,
      patrol: patrol.length ? patrol : undefined,
    }
  })
}

function extractDungeon(file) {
  const src = readDungeonSource(file)
  const dungeonIndex = readLocalNumber(src, 'dungeonIndex')
  if (dungeonIndex === undefined) throw new Error(`${file}: dungeonIndex introuvable`)

  const mapInfo = toPlain(parseAssignment(src, 'mapInfo'), { arrays: false }) ?? {}
  const dungeonMaps = toPlain(parseAssignment(src, 'dungeonMaps'), { arrays: false }) ?? {}
  const subLevels = toPlain(parseAssignment(src, 'dungeonSubLevels'), { arrays: false }) ?? {}
  const totalCount = toPlain(parseAssignment(src, 'dungeonTotalCount'), { arrays: false }) ?? {}
  const pois = toPlain(parseAssignment(src, 'mapPOIs'), { arrays: false }) ?? {}
  const rawEnemies = toPlain(parseAssignment(src, 'dungeonEnemies'), { arrays: false })

  const englishName = unwrap(mapInfo.englishName) ?? file
  const slug = slugify(englishName)

  const enemies = intEntries(rawEnemies).map(([mdtIdx, enemy]) => {
    return {
      mdtIdx,
      id: enemy.id,
      name: enemy.name,
      count: enemy.count ?? 0,
      health: enemy.health,
      level: enemy.level,
      scale: enemy.scale ?? 1,
      displayId: enemy.displayId,
      creatureType: enemy.creatureType,
      isBoss: enemy.isBoss === true ? true : undefined,
      encounterID: enemy.encounterID,
      instanceID: enemy.instanceID,
      stealth: enemy.stealth === true ? true : undefined,
      stealthDetect: enemy.stealthDetect === true ? true : undefined,
      cc: normaliseCharacteristics(enemy.characteristics),
      spells: normaliseSpells(enemy.spells),
      clones: normaliseClones(enemy.clones),
    }
  })

  const sublevelCount = Object.keys(subLevels).length || 1
  if (sublevelCount !== 1) {
    console.warn(`  ! ${englishName} a ${sublevelCount} étages — la carte n'en gère qu'un pour l'instant`)
  }

  return {
    slug,
    file,
    mdtIndex: dungeonIndex,
    englishName,
    mapID: mapInfo.mapID,
    teleportId: mapInfo.teleportId,
    textureFolder: extractTextureFolder(dungeonMaps),
    totalCount: totalCount.normal ?? 0,
    sublevelCount,
    enemies,
    pois: intEntries(pois).map(([, poi]) => poi),
  }
}

function summarise(d) {
  const clones = d.enemies.reduce((n, e) => n + e.clones.length, 0)
  const packs = new Set(d.enemies.flatMap((e) => e.clones.map((c) => c.g).filter((g) => g != null)))
  const bosses = d.enemies.filter((e) => e.isBoss).length
  const forces = d.enemies.reduce((n, e) => n + e.count * e.clones.length, 0)
  return { clones, packs: packs.size, bosses, forces }
}

function main() {
  fs.mkdirSync(GENERATED_DIR, { recursive: true })

  const index = []
  for (const file of SEASON_DUNGEONS) {
    const dungeon = extractDungeon(file)
    const stats = summarise(dungeon)

    fs.writeFileSync(
      path.join(GENERATED_DIR, `${dungeon.slug}.json`),
      JSON.stringify(dungeon, null, 1),
      'utf8',
    )

    // Le total de forces atteignable doit couvrir le total requis, sinon l'extraction a raté.
    const coverage = dungeon.totalCount ? Math.round((stats.forces / dungeon.totalCount) * 100) : 0
    const flag = coverage < 100 ? '  <-- forces insuffisantes' : ''
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
  console.log(`\n${index.length} donjons écrits dans ${path.relative(process.cwd(), GENERATED_DIR)}`)
}

main()
