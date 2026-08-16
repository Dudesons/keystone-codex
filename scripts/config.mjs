import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Racine de l'addon MDT. Surchargeable via la variable d'environnement MDT_PATH,
 * utile si WoW est installé ailleurs ou pour re-générer depuis une autre machine.
 */
export const MDT_PATH =
  process.env.MDT_PATH ||
  'D:\\jeux\\World of Warcraft\\_retail_\\Interface\\AddOns\\MythicDungeonTools'

/** Dossier des données de donjon de l'extension courante, à l'intérieur de MDT. */
export const MDT_EXPANSION = process.env.MDT_EXPANSION || 'Midnight'

/**
 * Pool Mythic+ de la saison 2 de Midnight (démarrage 18/08/2026).
 * Les noms correspondent aux fichiers .lua de MDT ; tout le reste (index de donjon,
 * total de forces, mapID) est lu dans ces fichiers, rien n'est codé en dur ici.
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
 * Langues pour lesquelles on récupère les libellés de sorts, et leur code de locale sur
 * nether.wowhead.com.
 *
 * Ces codes ont été **vérifiés par sonde**, pas lus dans une documentation : `0` rend
 * l'anglais, `2` le français. Sonde avant d'en ajouter un, ne le devine pas.
 *
 * Le **premier** élément est la langue de base : c'est son passage qui détermine le sens de
 * chaque ligne de tooltip pour toutes les autres (voir `parseTooltip` dans fetch-assets.mjs).
 * Il doit correspondre à `DEFAULT_LOCALE` dans `src/lib/i18n/locales.ts`.
 */
export const SPELL_LOCALES = [
  { lang: 'en', wowhead: 0 },
  { lang: 'fr', wowhead: 2 },
]

export const GENERATED_DIR = path.join(ROOT, 'src', 'data', 'generated')
export const PUBLIC_DIR = path.join(ROOT, 'public')
export const CONTENT_DIR = path.join(ROOT, 'content')

/** Espace de coordonnées de MDT (MainFrame.lua : sizex/sizey) et géométrie des tuiles. */
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
    // Les apostrophes disparaissent au lieu de devenir un s\u00e9parateur, sinon "King's" -> "king-s".
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
