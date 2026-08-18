// ABOUTME: Tests the semantic diff of two generated dungeon snapshots, and of the spell table.
// ABOUTME: Runs on two real versions of one dungeon and on the real committed spells.json.

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { diffDungeon, diffSpells, labelTableFindings } from './mdt-diff.mjs'
import { parseDungeon } from './mdt-dungeon.mjs'
import realSpells from '../src/data/generated/spells.json'

const read = (name) =>
  JSON.parse(fs.readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), 'utf8'))

const readText = (name) =>
  fs.readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), 'utf8')

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

/**
 * MDT 6.2.2 -> 6.2.3 touched only one dungeon of the season pool, The Blinding Vale, in three
 * ways: clone positions, moved deliberately (of 276 clones matched by `mdtIdx`, 91 sit at the
 * byte-identical position and 185 moved, the smallest nonzero move being well over half a unit
 * -- there is no sub-unit recapture jitter in this pair at all), enemy `scale`, and nothing else.
 * This is the first real update these fixtures pin the differ against, so both the mob-scalar
 * loop and the movement rule are checked against real data instead of a constructed one.
 *
 * The other seven dungeons in the season pool are byte-identical between these two versions
 * (checked by hand, with line endings normalised) and are not exercised by this pair at all:
 * nothing here says anything about them.
 */
describe('diffDungeon over two real MDT versions', () => {
  const warnings = []
  const onWarn = (message) => warnings.push(message)
  const blindingVale622 = parseDungeon(
    readText('TheBlindingVale-6.2.2.lua'), 'TheBlindingVale-6.2.2.lua', onWarn,
  )
  const blindingVale623 = parseDungeon(
    readText('TheBlindingVale-6.2.3.lua'), 'TheBlindingVale-6.2.3.lua', onWarn,
  )

  it('parses both fixtures without warning', () => {
    expect(warnings).toEqual([])
  })

  it('reports every changed scale', () => {
    const findings = diffDungeon(blindingVale622, blindingVale623)
    const scaleChanges = findings.filter((f) => f.what === 'scale changed')
    expect(scaleChanges).toHaveLength(21)
    expect(scaleChanges.every((f) => f.severity === 6)).toBe(true)

    const meittik = scaleChanges.find((f) => f.subject === '243028 Meittik')
    expect(meittik).toBeDefined()
    expect(meittik.detail).toBe('1 -> 1.5')
  })

  it('never surfaces a coordinate, on the pair whose diff is mostly coordinates', () => {
    // Clone movement is the bulk of what actually changed between these two real versions,
    // which makes this the strongest version of the guarantee: two real consecutive MDT
    // exports, mostly moved clones, must produce not one float from it.
    const serialised = JSON.stringify(diffDungeon(blindingVale622, blindingVale623))
    expect(serialised).not.toMatch(/\d+\.\d{6}/)
  })

  it('reports a mob whose clones moved beyond the threshold, matched by mdtIdx', () => {
    const findings = diffDungeon(blindingVale622, blindingVale623)
    const moved = findings.filter((f) => f.what === 'moved on the map')

    // Measured by matching every clone on mdtIdx (never by array position -- see
    // .claude/lessons.md): 18 of the dungeon's mobs have at least one clone that moved more
    // than the 20-unit threshold between these two real captures.
    expect(moved).toHaveLength(18)
    expect(moved.every((f) => f.severity === 6)).toBe(true)
    expect(moved.every((f) => f.action === undefined)).toBe(true)

    const spiritMoonkin = moved.find((f) => f.subject === '246371 Spirit Moonkin')
    expect(spiritMoonkin).toBeDefined()
    expect(spiritMoonkin.detail).toContain('1 of 1 clones moved')
    expect(spiritMoonkin.detail).toContain('131 units')

    const lasher = moved.find((f) => f.subject === '245410 Lasher')
    expect(lasher).toBeDefined()
    expect(lasher.detail).toContain('71 of 115 clones moved')
    expect(lasher.detail).toContain('64 units')
  })

  it('does not report a mob whose furthest clone stays at or under the threshold', () => {
    const findings = diffDungeon(blindingVale622, blindingVale623)
    const moved = findings.filter((f) => f.what === 'moved on the map')
    // Overgrown Hydra's furthest clone moves ~19.4 units -- real, nonzero, and below the
    // threshold on purpose, so this pins the cutoff rather than just the mobs above it.
    expect(moved.some((f) => f.subject.includes('Overgrown Hydra'))).toBe(false)
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

describe('labelTableFindings', () => {
  // These take the raw text a revision's spells.json was written as, not the parsed table:
  // severity 3 can only ever fire when the label table was actually re-fetched, and this is the
  // one place that fact -- rather than the table's content -- is what gets reported.

  it('finds nothing when the two tables differ', () => {
    expect(labelTableFindings('{"a":1}', '{"a":2}')).toEqual([])
  })

  it('reports one finding, at severity 6, when the two tables are byte-identical', () => {
    const [only] = labelTableFindings('{"a":1}', '{"a":1}')
    expect(only.severity).toBe(6)
    expect(only.dungeon).toBe('')
    expect(only.what).toContain('did not change')
    expect(only.action).toMatch(/FORCE=1 npm run fetch:assets/)
  })

  it('says nothing when the tables are merely equal after parsing but differ byte for byte', () => {
    // Key order or whitespace differing is still evidence a refetch touched the file, even if it
    // produced the same values -- this finding is about the bytes, not about the parsed content.
    expect(labelTableFindings('{"a":1,"b":2}', '{"b":2,"a":1}')).toEqual([])
  })
})
