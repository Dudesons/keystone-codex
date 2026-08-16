/** Types des données produites par `scripts/extract-mdt.mjs` et `scripts/fetch-assets.mjs`. */

export interface Clone {
  /** Index tel que MDT le référence dans les routes. Sparse : il y a des trous. */
  mdtIdx: number
  x: number
  y: number
  /** Identifiant de pack : les clones partageant un `g` se pull ensemble. `null` = isolé. */
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
  /** Forces apportées par une unité de ce mob. */
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
  /** CC applicables, tels que MDT les déclare (Stun, Fear, Silence…). */
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
  /** Forces requises pour compléter le donjon. */
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

export interface Spell {
  id: number
  name: string
  icon: string
  castTime?: string
  range?: string
  description?: string
}

/** Référence stable vers un clone précis, dans les index MDT. */
export interface CloneRef {
  enemyIdx: number
  cloneIdx: number
}

/** Groupe de clones partageant le même `g`, c'est-à-dire ce qu'un pull ramasse d'un bloc. */
export interface Pack {
  g: number
  members: CloneRef[]
  /** Forces totales du pack. */
  count: number
  center: { x: number; y: number }
  hull: { x: number; y: number }[]
}
