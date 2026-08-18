// ABOUTME: Tests reading a card's facts and auditing cards against the current MDT data.
// ABOUTME: Runs on the real committed cards under content/__fixtures__/.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { annotatedSpellIds, auditDungeon, cardLocale, readCardFacts } from './card-audit.mjs'
import realDungeon from '../src/data/generated/altar-of-fangs.json'

const FIXTURES = fileURLToPath(new URL('../content/__fixtures__/', import.meta.url))
const read = (name) => fs.readFileSync(path.join(FIXTURES, name), 'utf8')

describe('cardLocale', () => {
  it('reads the locale suffix a translation carries', () => {
    expect(cardLocale('263109-ulateks-chosen.fr.md')).toBe('fr')
  })

  it('calls a file with no suffix the base language', () => {
    expect(cardLocale('263109-ulateks-chosen.md')).toBe('en')
  })

  it('is not fooled by a dot inside the slug', () => {
    expect(cardLocale('1-mob.name.md')).toBe('en')
  })
})

describe('readCardFacts', () => {
  it('reads the npcId and the annotated spells of a real card', () => {
    const facts = readCardFacts(read('263109-ulateks-chosen.md'), 'x.md')
    expect(facts.npcId).toBeGreaterThan(0)
    expect(facts.spells.every((s) => Number.isInteger(s.id))).toBe(true)
  })

  it('counts a card with a threat, a trap, prose or one annotated spell as written', () => {
    // Mirrors src/lib/content.ts:283-288. The two must not drift apart.
    expect(readCardFacts(read('263109-ulateks-chosen.md'), 'x.md').written).toBe(true)
  })

  it('counts a freshly scaffolded card as unwritten', () => {
    const stub = ['---', 'npcId: 1', 'threat:', 'role:', 'trap:', '---', '', '<!-- Free prose -->', ''].join('\n')
    expect(readCardFacts(stub, 'x.md').written).toBe(false)
  })

  it('does not count tag: todo as judgement, which is what the scaffold writes', () => {
    const stub = ['---', 'npcId: 1', 'spells:', '  - id: 5', '    tag: todo', '    note:', '---', ''].join('\n')
    expect(readCardFacts(stub, 'x.md').written).toBe(false)
  })

  it('counts one real tag as judgement even with no note', () => {
    const card = ['---', 'npcId: 1', 'spells:', '  - id: 5', '    tag: kick', '---', ''].join('\n')
    expect(readCardFacts(card, 'x.md').written).toBe(true)
  })

  it('returns null for a file with no npcId rather than throwing', () => {
    expect(readCardFacts('---\nname: "x"\n---\n', 'x.md')).toBeNull()
  })

  it('returns null for unparseable frontmatter rather than throwing', () => {
    // A malformed card must not stop a report about eight dungeons.
    expect(readCardFacts('---\nnpcId: [unclosed\n---\n', 'x.md')).toBeNull()
  })
})

describe('auditDungeon', () => {
  const enemy = realDungeon.enemies.find((e) => e.spells.length >= 2)
  const cardFor = (extra) => ({
    file: `content/altar-of-fangs/${enemy.id}-mob.md`,
    npcId: enemy.id,
    locale: 'en',
    spells: [],
    written: true,
    ...extra,
  })

  it('reports a note on a spell the mob no longer has, at severity 1', () => {
    const cards = [cardFor({ spells: [{ id: 999999, note: 'kick this', tag: 'kick' }] })]
    const [finding] = auditDungeon(realDungeon, cards)
    expect(finding.severity).toBe(1)
    expect(finding.what).toContain('999999')
    expect(finding.file).toBe(cards[0].file)
  })

  it('says nothing about an un-annotated orphan id: there is no writing to lose', () => {
    const cards = [cardFor({ spells: [{ id: 999999, note: null, tag: 'todo' }] })]
    expect(auditDungeon(realDungeon, cards).filter((f) => f.severity === 1)).toEqual([])
  })

  it('reports a written card whose mob left the dungeon, at severity 1', () => {
    const cards = [cardFor({ npcId: 999999, written: true })]
    const [finding] = auditDungeon(realDungeon, cards)
    expect(finding.severity).toBe(1)
    expect(finding.what).toContain('no mob')
  })

  it('demotes the same card to severity 5 when it carries no writing', () => {
    // A stub whose mob left is clutter, not a loss. Severity is what tells the two apart.
    const cards = [cardFor({ npcId: 999999, written: false })]
    const [finding] = auditDungeon(realDungeon, cards)
    expect(finding.severity).toBe(5)
    expect(finding.action).toContain('every other language')
  })

  it('reports a written card that has un-annotated spells, at severity 2', () => {
    const cards = [cardFor({ spells: [{ id: enemy.spells[0].id, note: 'x', tag: 'kick' }] })]
    const findings = auditDungeon(realDungeon, cards).filter((f) => f.severity === 2)
    expect(findings).toHaveLength(1)
    expect(findings[0].detail).toContain(String(enemy.spells[1].id))
  })

  it('leaves an unwritten card alone: it is scaffolding, not incomplete writing', () => {
    const cards = [cardFor({ written: false, spells: [] })]
    expect(auditDungeon(realDungeon, cards).filter((f) => f.severity === 2)).toEqual([])
  })

  it('reports every mob with no card at all, at severity 4', () => {
    const findings = auditDungeon(realDungeon, []).filter((f) => f.severity === 4)
    const mobs = new Set(realDungeon.enemies.map((e) => e.id))
    expect(findings).toHaveLength(mobs.size)
    expect(findings[0].action).toContain('scaffold')
  })

  it('reports a translation whose mob left, so the .fr.md is not forgotten', () => {
    const cards = [
      cardFor({ npcId: 999999 }),
      cardFor({ npcId: 999999, locale: 'fr', file: 'content/altar-of-fangs/999999-mob.fr.md' }),
    ]
    const files = auditDungeon(realDungeon, cards).filter((f) => f.severity === 1).map((f) => f.file)
    expect(files).toContain('content/altar-of-fangs/999999-mob.fr.md')
  })

  it('counts one card per mob, whatever its locale, when looking for missing cards', () => {
    const covered = realDungeon.enemies.map((e) =>
      cardFor({ npcId: e.id, file: `content/altar-of-fangs/${e.id}-mob.md`, spells: [], written: true }),
    )
    expect(auditDungeon(realDungeon, covered).filter((f) => f.severity === 4)).toEqual([])
  })
})

describe('annotatedSpellIds', () => {
  it('collects the ids any card annotates, across dungeons and locales', () => {
    const ids = annotatedSpellIds([
      { file: 'a.md', npcId: 1, locale: 'en', spells: [{ id: 11, note: 'x', tag: null }], written: true },
      { file: 'b.fr.md', npcId: 2, locale: 'fr', spells: [{ id: 22, note: null, tag: 'kick' }], written: true },
      { file: 'c.md', npcId: 3, locale: 'en', spells: [{ id: 33, note: null, tag: 'todo' }], written: false },
    ])
    expect([...ids].sort((a, b) => a - b)).toEqual([11, 22])
  })
})
