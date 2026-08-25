// ABOUTME: The shapes of the data produced by the extraction scripts and consumed by the app.
// ABOUTME: The generated files match these exactly — changing one means regenerating the other.

/** Types of the data produced by `scripts/extract-mdt.mjs` and `scripts/fetch-assets.mjs`. */

import type { Locale } from './i18n/locales'

export interface Clone {
  /** Index as MDT references it in routes. Sparse: there are holes. */
  mdtIdx: number
  x: number
  y: number
  /** Pack id: clones sharing a `g` are pulled together. `null` = on its own. */
  g: number | null
  sublevel: number
  patrol?: { x: number; y: number }[]
}

export interface EnemySpell {
  id: number
  interruptible?: boolean
  dispel?: string[]
}

export interface Enemy {
  mdtIdx: number
  id: number
  name: string
  /** Forces contributed by one unit of this mob. */
  count: number
  health: number
  level: number
  scale: number
  displayId?: number
  creatureType?: string
  isBoss?: true
  encounterID?: number
  instanceID?: number
  stealth?: true
  stealthDetect?: true
  /** Applicable CC, as MDT declares them (Stun, Fear, Silence…). */
  cc: string[]
  spells: EnemySpell[]
  clones: Clone[]
}

/**
 * A point of interest MDT draws on the map: a usable item, a dungeon entrance.
 *
 * `sublevel` comes from the key `mapPOIs` nests the entry under, not from the entry itself.
 * `type` stays a `string` rather than a union of the values seen today: the extraction passes
 * an unfamiliar type through on purpose, and a union would make that unrepresentable.
 */
export interface Poi {
  type: string
  x: number
  y: number
  sublevel: number
  /** Entrances draw larger than their nominal size. */
  sizeMult?: number
  /** Items only: `texture` is a Blizzard file id, useless to us; `spellId` is not. */
  info?: { texture: number; spellId: number; size: number }
}

export interface Dungeon {
  slug: string
  file: string
  mdtIndex: number
  englishName: string
  mapID?: number
  teleportId?: number
  textureFolder: string | null
  /** Forces required to complete the dungeon. */
  totalCount: number
  sublevelCount: number
  enemies: Enemy[]
  pois: Poi[]
}

export interface DungeonSummary {
  slug: string
  englishName: string
  mdtIndex: number
  mapID?: number
  totalCount: number
  /**
   * How many units MDT flags `isBoss`, counted by the extraction — **not** how many bosses the
   * dungeon has, and never what to show a reader. MDT flags every unit that appears in an
   * encounter, so this reads 8 for Ruby Life Pools against the four its briefing lists. A card's
   * `rank` is what settles it, resolved once in `getIndicators`; count `getHighlights().bosses`
   * instead. Kept because it is MDT's own answer and the tests assert the disagreement.
   */
  bosses: number
  mobCount: number
  packCount: number
  textureFolder: string | null
}

/** The part of a spell that changes with the language, as Wowhead serves it per locale. */
export interface SpellText {
  name: string
  castTime?: string
  range?: string
  description?: string
}

/**
 * A `spells.json` entry: the id and the icon are the same in every language, so they sit
 * outside `text`, which carries one block per locale fetched.
 */
export interface SpellEntry {
  id: number
  icon: string
  text: Partial<Record<Locale, SpellText>>
}

/** A spell resolved for one language — what the UI consumes. */
export type Spell = SpellText & { id: number; icon: string }

/** The part of a creature that changes with the language, as Wowhead serves it per locale. */
export interface NpcText {
  name: string
  /** Absent for the creatures Wowhead files under no type at all. */
  type?: string
}

/** An `npcs.json` entry. The English name is MDT's, not Wowhead's — see `buildNpcText`. */
export interface NpcEntry {
  id: number
  text: Partial<Record<Locale, NpcText>>
}

/** Stable reference to one precise clone, in MDT indices. */
export interface CloneRef {
  enemyIdx: number
  cloneIdx: number
}

/** Group of clones sharing the same `g` — what a pull picks up in one go. */
export interface Pack {
  g: number
  members: CloneRef[]
  /** Total forces of the pack. */
  count: number
  center: { x: number; y: number }
  hull: { x: number; y: number }[]
}
