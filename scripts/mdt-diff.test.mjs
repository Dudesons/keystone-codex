// ABOUTME: Tests the semantic diff of two generated snapshots against two real versions.
// ABOUTME: Pins that coordinates never surface and that lost spells always do.

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { diffDungeon } from './mdt-diff.mjs'

const read = (name) =>
  JSON.parse(fs.readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), 'utf8'))

/** Two real versions of the same dungeon: 11 mobs lost spell 1221063 between them. */
const withAffix = read('altar-of-fangs.with-affix.json')
const withoutAffix = read('altar-of-fangs.without-affix.json')

describe('diffDungeon', () => {
  it('reports every mob that lost a spell', () => {
    const findings = diffDungeon(withAffix, withoutAffix)
    const lost = findings.filter((f) => f.what.includes('lost spell 1221063'))
    expect(lost).toHaveLength(11)
    expect(lost[0].dungeon).toBe('altar-of-fangs')
    expect(lost[0].severity).toBe(6)
    // No action here: the card audit (a later module) reports this same fact against the
    // actual content/ file, if one exists, which this module has no way to know about.
    expect(lost[0].action).toBeUndefined()
  })

  it('reports a gained spell in the other direction', () => {
    const findings = diffDungeon(withoutAffix, withAffix)
    expect(findings.filter((f) => f.what.includes('gained spell 1221063'))).toHaveLength(11)
  })

  it('finds nothing at all between a snapshot and itself', () => {
    expect(diffDungeon(withAffix, withAffix)).toEqual([])
  })

  it('never surfaces a coordinate', () => {
    // Clone x/y are floats that move on every MDT recapture; reporting them buries the rest.
    const serialised = JSON.stringify(diffDungeon(withAffix, withoutAffix))
    expect(serialised).not.toMatch(/\d+\.\d{6}/)
  })

  it('reports an added and a removed mob by id and name', () => {
    // Scenario built over a real snapshot: the input's shape is the fixture's, the change is ours.
    const trimmed = { ...withoutAffix, enemies: withoutAffix.enemies.slice(1) }
    const gone = withoutAffix.enemies[0]

    const removed = diffDungeon(withoutAffix, trimmed)
    const left = removed.find((f) => f.subject === `${gone.id} ${gone.name}` && f.what.includes('left'))
    expect(left).toBeDefined()
    // No action here either, for the same reason: only the card audit knows whether
    // content/altar-of-fangs/ actually has a now-dead card for this mob.
    expect(left.action).toBeUndefined()

    const added = diffDungeon(trimmed, withoutAffix)
    expect(added.some((f) => f.subject === `${gone.id} ${gone.name}` && f.what.includes('is new'))).toBe(true)
  })

  it('reports a changed force total, and says both values', () => {
    const richer = { ...withoutAffix, totalCount: withoutAffix.totalCount + 30 }
    const findings = diffDungeon(withoutAffix, richer)
    const forces = findings.find((f) => f.what.includes('totalCount'))
    expect(forces.detail).toContain(String(withoutAffix.totalCount))
    expect(forces.detail).toContain(String(withoutAffix.totalCount + 30))
  })

  it('reports a changed textureFolder as the map rebuild it forces', () => {
    const moved = { ...withoutAffix, textureFolder: 'AltarOfFangsRevamp' }
    const findings = diffDungeon(withoutAffix, moved)
    expect(findings.find((f) => f.what.includes('textureFolder')).action).toContain('build:maps')
  })

  it('counts clones without naming where they are', () => {
    const first = withoutAffix.enemies[0]
    const fewer = {
      ...withoutAffix,
      enemies: [{ ...first, clones: first.clones.slice(1) }, ...withoutAffix.enemies.slice(1)],
    }
    const findings = diffDungeon(withoutAffix, fewer)
    const clones = findings.find((f) => f.what.includes('clone'))
    expect(clones.detail).toContain(`${first.clones.length}`)
    expect(clones.detail).toContain(`${first.clones.length - 1}`)
  })

  it('treats a missing base as a brand-new dungeon, in one finding', () => {
    const findings = diffDungeon(null, withoutAffix)
    expect(findings).toHaveLength(1)
    expect(findings[0].what).toContain('new dungeon')
    expect(findings[0].severity).toBe(4)
  })
})
