// ABOUTME: Tests what a mob contributes to a dungeon's forces, and MDT's colour for its score.
// ABOUTME: Anchored on two mobs whose numbers the game itself prints, not on our own output.

import { describe, expect, it } from 'vitest'
import { getLookup } from './data'
import { contribution, scoreColor } from './contribution'
import type { Enemy } from './types'

const lookup = getLookup('murder-row')!
const { dungeon } = lookup
const byName = (name: string): Enemy => {
  const enemy = dungeon.enemies.find((e) => e.name === name)
  if (!enemy) throw new Error(`no mob named ${name} in ${dungeon.slug}`)
  return enemy
}

describe('contribution — against what MDT prints', () => {
  /**
   * Murder Row requires 655 forces, and MDT's tooltip for Bribed Captain reads
   * "Forces: 35 (5.34%)" and "Efficiency score: 4.5". These assertions exist to fail if the
   * extraction stops carrying the field the formula divides by, or if MDT changes the formula.
   *
   * **These two figures were last read from the game at MDT 6.2.3, where the dungeon required
   * 690 forces and they were 5.07% and 4.2.** MDT 6.2.8 moved the requirement to 655, and the
   * numbers here were recomputed from MDT's own published formula — the one transcribed in
   * `contribution.ts` — applied by hand to the raw `count`, `health` and `totalCount`, never by
   * running `contribution()`. Copying our own output in would have made this pass by
   * construction, which is the one thing it exists not to do. They are therefore *derived*
   * rather than *observed*: if you have the game open, check the tooltip and delete this
   * paragraph.
   */
  it('reproduces the share and the score MDT shows for Bribed Captain', () => {
    const c = contribution(byName('Bribed Captain'), dungeon)
    expect(c.count).toBe(35)
    expect(c.share.toFixed(2)).toBe('5.34')
    expect(c.score!.toFixed(1)).toBe('4.5')
  })

  it('separates two mobs of equal forces by their health', () => {
    const captain = contribution(byName('Bribed Captain'), dungeon)
    const golem = contribution(byName('Defiled Golem'), dungeon)
    expect(golem.count).toBe(captain.count)
    expect(golem.share).toBeCloseTo(captain.share, 9)
    // The golem has more health for the same forces, so it is the worse pull.
    expect(golem.score!.toFixed(1)).toBe('4.1')
    expect(golem.score!).toBeLessThan(captain.score!)
  })
})

describe('contribution — when a score would say nothing', () => {
  const dummy = (over: Partial<Enemy>): Enemy =>
    ({ name: 'x', id: 1, mdtIdx: 1, count: 10, health: 1_000_000, level: 80, scale: 1, cc: [], spells: [], clones: [], ...over }) as Enemy

  it('gives no score to a mob that grants no forces', () => {
    const c = contribution(dummy({ count: 0 }), dungeon)
    expect(c.count).toBe(0)
    expect(c.share).toBe(0)
    expect(c.score).toBeNull()
  })

  it('gives no score rather than an Infinity when health is missing', () => {
    const c = contribution(dummy({ health: 0 }), dungeon)
    expect(c.score).toBeNull()
    expect(c.share).toBeGreaterThan(0)
  })

  it('finds every zero-force mob the dungeon actually holds', () => {
    // Half of Murder Row gives nothing. This is the common case, not an edge case.
    const none = dungeon.enemies.filter((e) => contribution(e, dungeon).score === null)
    expect(none.length).toBeGreaterThan(10)
  })
})

describe("scoreColor — MDT's ramp, whose channels do not saturate together", () => {
  it('is red at zero', () => {
    expect(scoreColor(0)).toBe('#ff0000')
  })

  it('is yellow at five, where green saturates but red has not yet vanished', () => {
    expect(scoreColor(5)).toBe('#ffff00')
  })

  it('is green at ten, and stays green above it', () => {
    expect(scoreColor(10)).toBe('#00ff00')
    expect(scoreColor(40)).toBe('#00ff00')
  })

  it('never emits a channel outside a byte', () => {
    for (const s of [-5, 0, 1, 4.9, 7.5, 10, 100]) {
      expect(scoreColor(s)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})
