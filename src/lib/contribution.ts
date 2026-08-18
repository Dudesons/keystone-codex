// ABOUTME: What one unit of a mob contributes to a dungeon's forces, and MDT's efficiency score.
// ABOUTME: Pure: the formula and its colour ramp are MDT's, transcribed from the addon source.

import type { Dungeon, Enemy } from './types'

export interface Contribution {
  /** Forces one unit of this mob gives. */
  count: number
  /** Those forces as a percentage of the dungeon's requirement, 0–100. */
  share: number
  /**
   * MDT's efficiency score — forces per point of health — or `null` when it would say nothing.
   *
   * Null rather than zero for a mob that grants no forces: the score measures a ratio the mob
   * has no numerator for, and half of some dungeons are in that case. Null rather than
   * `Infinity` when health is absent, so a broken extraction shows a gap instead of a number.
   */
  score: number | null
}

/**
 * `Modules/DungeonEnemies.lua:515`, transcribed:
 *
 *     local score = 2.5 * (count / totalCount) * 13000 / (health / 20000)
 *
 * `health` is the creature's base health, which is what `Enemy.health` carries — not a value
 * scaled to a key level.
 */
export function contribution(enemy: Enemy, dungeon: Dungeon): Contribution {
  const required = dungeon.totalCount || 1
  const share = (enemy.count / required) * 100
  const scorable = enemy.count > 0 && enemy.health > 0
  return {
    count: enemy.count,
    share,
    score: scorable ? (2.5 * (enemy.count / required) * 13000) / (enemy.health / 20000) : null,
  }
}

const channel = (v: number): string =>
  Math.round(Math.max(0, Math.min(1, v)) * 255)
    .toString(16)
    .padStart(2, '0')

/**
 * MDT's own ramp: `RGBToHex(max(0, min(1, 2 * (1 - v))), min(1, 2 * v), 0)` with `v = score / 10`.
 *
 * The two channels do not saturate at the same score. Green is full at 5 while red is still
 * full, so the middle of the ramp is yellow; red only reaches zero at 10. It is not a straight
 * red-to-green fade, however much it reads like one.
 */
export function scoreColor(score: number): string {
  const v = score / 10
  return `#${channel(2 * (1 - v))}${channel(2 * v)}00`
}
