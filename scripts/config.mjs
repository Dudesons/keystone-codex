// ABOUTME: The one file to edit when the season, the machine or the spell languages change.
// ABOUTME: Holds MDT_CANDIDATES, SEASON_DUNGEONS, SPELL_LOCALES and MDT's coordinate geometry.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const ADDON_SUFFIX = path.join('Interface', 'AddOns', 'MythicDungeonTools')

/**
 * Where WoW might be, in the order we look.
 *
 * No single machine's layout should be the repository's only truth: a contributor with a
 * standard install needs no configuration, and MDT_PATH remains the escape hatch for
 * everyone else. Add a candidate rather than editing one — the list costs nothing to probe.
 */
export const MDT_CANDIDATES = [
  path.join('D:', 'jeux', 'World of Warcraft', '_retail_', ADDON_SUFFIX),
  path.join('C:', 'Program Files (x86)', 'World of Warcraft', '_retail_', ADDON_SUFFIX),
  path.join('C:', 'Program Files', 'World of Warcraft', '_retail_', ADDON_SUFFIX),
  path.join('/Applications', 'World of Warcraft', '_retail_', ADDON_SUFFIX),
]

/**
 * Root of the MDT addon. MDT_PATH overrides everything; otherwise the first candidate that
 * exists wins. When none does, we keep the standard Windows path so the "not found" error
 * names somewhere plausible rather than somewhere personal.
 */
export const MDT_PATH =
  process.env.MDT_PATH || MDT_CANDIDATES.find((p) => fs.existsSync(p)) || MDT_CANDIDATES[1]

/** Folder holding the current expansion's dungeon data, inside MDT. */
export const MDT_EXPANSION = process.env.MDT_EXPANSION || 'Midnight'

/**
 * Mythic+ pool for Midnight season 2 (started 2026-08-18).
 * The names match MDT's .lua filenames; everything else — dungeon index, total forces,
 * mapID — is read from those files. Nothing else is hardcoded here.
 */
export const SEASON_DUNGEONS = [
  'AltarOfFangs',
  'MurderRow',
  'DenOfNalorakk',
  'TheBlindingVale',
  'VoidscarArena',
  'KingsRest',
  'TempleOfSethraliss',
  'RubyLifePools',
]

/**
 * Languages we fetch spell labels for, and their locale code on nether.wowhead.com.
 *
 * These codes were **established by probing**, not read from documentation: `0` returns
 * English, `2` French. Probe before adding one; do not guess it.
 *
 * The **first** entry is the base language: its pass is what determines the meaning of every
 * tooltip line for all the others (see `parseTooltip` in fetch-assets.mjs). It must match
 * `DEFAULT_LOCALE` in `src/lib/i18n/locales.ts`.
 */
export const SPELL_LOCALES = [
  { lang: 'en', wowhead: 0 },
  { lang: 'fr', wowhead: 2 },
]

export const GENERATED_DIR = path.join(ROOT, 'src', 'data', 'generated')
export const PUBLIC_DIR = path.join(ROOT, 'public')
export const CONTENT_DIR = path.join(ROOT, 'content')

/** MDT's coordinate space (MainFrame.lua: sizex/sizey) and the tile grid. */
export const MDT_GEOMETRY = {
  coordWidth: 840,
  coordHeight: 560,
  tileCols: 15,
  tileRows: 10,
  tileSize: 128,
  get pixelWidth() {
    return this.tileCols * this.tileSize
  },
  get pixelHeight() {
    return this.tileRows * this.tileSize
  },
}

/** "Altar of Fangs" -> "altar-of-fangs", "King's Rest" -> "kings-rest" */
export function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    // Apostrophes vanish rather than becoming a separator, otherwise "King's" -> "king-s".
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
