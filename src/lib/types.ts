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
  pois: unknown[]
}

export interface DungeonSummary {
  slug: string
  englishName: string
  mdtIndex: number
  mapID?: number
  totalCount: number
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
