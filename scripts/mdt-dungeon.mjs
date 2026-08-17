// ABOUTME: Turns the text of an MDT dungeon file into the shape the app consumes.
// ABOUTME: Pure functions, so extraction can be tested against a committed fixture without WoW.

/**
 * Turns the text of an MDT dungeon file into the shape the app consumes.
 *
 * Separated from the reading and writing so it can be exercised against a committed fixture:
 * the extraction chain otherwise needs a WoW install, which CI does not have and a
 * contributor may not either. Everything here is a pure function of the source text.
 */

import { LuaExpr, parseAssignment, toPlain } from './lua-table.mjs'
import { AFFIX_SPELLS, slugify } from './config.mjs'

/** The crowd control MDT lists in `characteristics`, in the codex display order. */
export const CC_ORDER = [
  'Stun', 'Incapacitate', 'Silence', 'Fear', 'Root', 'Slow', 'Knock', 'Grip',
  'Disorient', 'Polymorph', 'Sap', 'Banish', 'Imprison', 'Hibernate', 'Repentance',
  'Shackle Undead', 'Mind Control', 'Sleep Walk', 'Mind Soothe', 'Taunt',
]

/** Dispel types MDT sets as flags on spells. */
export const DISPEL_FLAGS = ['magic', 'curse', 'disease', 'poison', 'bleed', 'enrage']

/** The POI types the map knows how to draw. An unfamiliar one is kept, and reported. */
export const POI_TYPES = ['genericItem', 'dungeonEntrance']

/**
 * Returns a Lua table's integer-keyed entries, sorted numerically.
 *
 * MDT's indices are *sparse*: deleting a mob or a clone leaves a hole
 * (`clones = { [8] = ..., [13] = ... }`). Those indices are exactly what routes reference,
 * so they must be preserved as-is and never renumbered.
 */
export function intEntries(table) {
  if (!table || typeof table !== 'object') return []
  return Object.entries(table)
    .filter(([k]) => /^\d+$/.test(k))
    .map(([k, v]) => [Number(k), v])
    .sort((a, b) => a[0] - b[0])
}

/** Resolves the value of a `local <name> = <number>` at the top of the file. */
export function readLocalNumber(src, name) {
  const m = new RegExp(`local\\s+${name}\\s*=\\s*(-?\\d+)`).exec(src)
  return m ? Number(m[1]) : undefined
}

/** Unfolds `plain(expr)`: LuaExpr values coming from `L["X"]` carry their literal. */
export function unwrap(value) {
  if (value instanceof LuaExpr) return value.literal ?? value.identifier ?? value.raw
  return value
}

export function extractTextureFolder(dungeonMaps) {
  // dungeonMaps[1].customTextures = 'Interface\\AddOns\\'..addonName..'\\Midnight\\Textures\\<Folder>'
  const level = dungeonMaps?.['1'] ?? dungeonMaps?.[1]
  const raw = level?.customTextures
  const source = raw instanceof LuaExpr ? raw.raw : typeof raw === 'string' ? raw : ''
  const segments = source.match(/[\\/]([A-Za-z0-9_]+)'/g)
  if (!segments?.length) return null
  return segments[segments.length - 1].replace(/^[\\/]/, '').replace(/'$/, '')
}

export function normaliseSpells(spells) {
  if (!spells || typeof spells !== 'object') return []
  return Object.entries(spells)
    // The seasonal affix is not a trait of the mob it happens to be recorded on — see
    // AFFIX_SPELLS. Dropped here so no re-extraction can put it back.
    .filter(([id]) => !AFFIX_SPELLS.includes(Number(id)))
    .map(([id, flags]) => {
      const dispel = DISPEL_FLAGS.filter((f) => flags?.[f] === true)
      return {
        id: Number(id),
        // MDT only sets `interruptible` when it is relevant; its absence is not a denial.
        interruptible: flags?.interruptible === true ? true : undefined,
        dispel: dispel.length ? dispel : undefined,
      }
    })
}

export function normaliseCharacteristics(characteristics, onWarn = console.warn) {
  if (!characteristics || typeof characteristics !== 'object') return []
  const known = CC_ORDER.filter((cc) => characteristics[cc] === true)
  const extra = Object.keys(characteristics).filter((k) => characteristics[k] === true && !CC_ORDER.includes(k))
  if (extra.length) onWarn(`  ! unknown characteristics, add them to CC_ORDER: ${extra.join(', ')}`)
  return [...known, ...extra]
}

export function normaliseClones(clones) {
  return intEntries(clones).map(([mdtIdx, clone]) => {
    const patrol = intEntries(clone.patrol).map(([, p]) => ({ x: p.x, y: p.y }))
    return {
      // The index as MDT references it in routes — sparse, so kept exactly as found.
      mdtIdx,
      x: clone.x,
      y: clone.y,
      g: clone.g ?? null,
      sublevel: clone.sublevel ?? 1,
      patrol: patrol.length ? patrol : undefined,
    }
  })
}

/**
 * Flattens `mapPOIs`, which MDT indexes by sublevel and then by POI.
 *
 * The sublevel lives in the outer key rather than in the entry, so it is carried down: a POI
 * that lost it could not be matched against the floor being drawn. Reading the entries as one
 * flat list — the old shape — silently stored the sublevel's whole table as a single POI.
 */
export function normalisePois(mapPOIs, onWarn = console.warn) {
  return intEntries(mapPOIs).flatMap(([sublevel, list]) =>
    intEntries(list).map(([, poi]) => {
      const type = unwrap(poi.type)
      if (!POI_TYPES.includes(type)) onWarn(`  ! unknown POI type, add it to POI_TYPES: ${type}`)
      return { ...poi, type, sublevel }
    }),
  )
}

/**
 * Parses one dungeon out of its `.lua` source.
 *
 * `file` is the MDT filename: it names the dungeon when `mapInfo.englishName` is missing, and
 * is kept in the output so the origin of every record stays traceable.
 */
export function parseDungeon(src, file, onWarn = console.warn) {
  const dungeonIndex = readLocalNumber(src, 'dungeonIndex')
  if (dungeonIndex === undefined) throw new Error(`${file}: dungeonIndex not found`)

  const mapInfo = toPlain(parseAssignment(src, 'mapInfo'), { arrays: false }) ?? {}
  const dungeonMaps = toPlain(parseAssignment(src, 'dungeonMaps'), { arrays: false }) ?? {}
  const subLevels = toPlain(parseAssignment(src, 'dungeonSubLevels'), { arrays: false }) ?? {}
  const totalCount = toPlain(parseAssignment(src, 'dungeonTotalCount'), { arrays: false }) ?? {}
  const pois = toPlain(parseAssignment(src, 'mapPOIs'), { arrays: false }) ?? {}
  const rawEnemies = toPlain(parseAssignment(src, 'dungeonEnemies'), { arrays: false })

  const englishName = unwrap(mapInfo.englishName) ?? file
  const slug = slugify(englishName)

  const enemies = intEntries(rawEnemies).map(([mdtIdx, enemy]) => ({
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
    cc: normaliseCharacteristics(enemy.characteristics, onWarn),
    spells: normaliseSpells(enemy.spells),
    clones: normaliseClones(enemy.clones),
  }))

  const sublevelCount = Object.keys(subLevels).length || 1
  if (sublevelCount !== 1) {
    onWarn(`  ! ${englishName} has ${sublevelCount} floors — the map only handles one for now`)
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
    pois: normalisePois(pois, onWarn),
  }
}

/** Counts worth printing after an extraction, and worth checking against MDT's own totals. */
export function summarise(dungeon) {
  const clones = dungeon.enemies.reduce((n, e) => n + e.clones.length, 0)
  const packs = new Set(
    dungeon.enemies.flatMap((e) => e.clones.map((c) => c.g).filter((g) => g != null)),
  )
  const bosses = dungeon.enemies.filter((e) => e.isBoss).length
  const forces = dungeon.enemies.reduce((n, e) => n + e.count * e.clones.length, 0)
  return { clones, packs: packs.size, bosses, forces }
}
