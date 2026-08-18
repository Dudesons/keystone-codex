// ABOUTME: Tests reading a card's facts and auditing cards against the current MDT data.
// ABOUTME: Runs on the real committed cards under content/__fixtures__/.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { cardLocale, readCardFacts } from './card-audit.mjs'

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
