// ABOUTME: Tests the semantic diff of two generated dungeon snapshots, and of the spell table.
// ABOUTME: Runs on two real versions of one dungeon and on the real committed spells.json.

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { diffDungeon, diffSpells } from './mdt-diff.mjs'
import realSpells from '../src/data/generated/spells.json'

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

describe('diffSpells', () => {
  // The real committed table is the input shape; each case constructs the change it is about.
  // spells.json is 560 KB, so a second copy as a fixture would cost more than it proves.
  const anyId = Number(Object.keys(realSpells)[0])

  it('finds nothing between the real table and itself', () => {
    expect(diffSpells(realSpells, realSpells, new Set())).toEqual([])
  })

  it('raises a changed description to severity 3 when a card annotates the spell', () => {
    const after = structuredClone(realSpells)
    after[anyId].text.en.description = 'Something else entirely.'

    const [finding] = diffSpells(realSpells, after, new Set([anyId]))
    expect(finding.severity).toBe(3)
    expect(finding.what).toContain('description')
    expect(finding.detail).toContain('Something else entirely.')
    expect(finding.action).toMatch(/note/)
  })

  it('leaves a changed description at severity 6 when no card annotates it', () => {
    const after = structuredClone(realSpells)
    after[anyId].text.en.description = 'Something else entirely.'
    expect(diffSpells(realSpells, after, new Set())[0].severity).toBe(6)
  })

  it('reports a changed cast time, which notes quote as often as damage', () => {
    const after = structuredClone(realSpells)
    after[anyId].text.en.castTime = '9 sec cast'
    expect(diffSpells(realSpells, after, new Set([anyId]))[0].what).toContain('castTime')
  })

  it('reports a spell that left the table', () => {
    const after = structuredClone(realSpells)
    delete after[anyId]
    expect(diffSpells(realSpells, after, new Set())[0].what).toContain('left the data')
  })

  it('omits the action key rather than carrying it as undefined', () => {
    // Every optional field in this module is absent when it does not apply; an `action: undefined`
    // key reads as a finding that has an action and forgot to say what it is.
    const after = structuredClone(realSpells)
    delete after[anyId]
    expect(diffSpells(realSpells, after, new Set())[0]).not.toHaveProperty('action')
  })

  it('says nothing about a spell that is merely new: the mob diff already named it', () => {
    const before = structuredClone(realSpells)
    delete before[anyId]
    expect(diffSpells(before, realSpells, new Set())).toEqual([])
  })

  it('names the language a change happened in', () => {
    const after = structuredClone(realSpells)
    after[anyId].text.fr.description = 'Autre chose.'
    expect(diffSpells(realSpells, after, new Set([anyId]))[0].detail).toContain('fr')
  })
})
