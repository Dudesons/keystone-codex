// ABOUTME: Tests the in-place refresh of a card's `# auto` marker lines.
// ABOUTME: Pins the narrow rule: marked values only, never a line added or removed.

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { autoFieldFindings, refreshAutoFields } from './card-auto-fields.mjs'

const enemy = { id: 270306, name: 'Ritual Chieftain', count: 25, isBoss: false, cc: ['Stun', 'Root'] }

/** The exact shape content-stub.mjs writes, which is the only shape this may touch. */
const card = [
  '---',
  'npcId: 270306',
  'name: "Ritual Cheiftain"   # auto',
  'count: 20   # auto — forces per unit',
  '',
  '# TO FILL IN: low | medium | high | lethal',
  'threat: high',
  '# Applicable CC (auto, from MDT): Stun',
  '---',
  '',
  'Prose that mentions count: 20 and must not be touched.',
  '',
].join('\n')

describe('refreshAutoFields', () => {
  it('corrects a marked name in place, keeping the marker', () => {
    const { text } = refreshAutoFields(card, enemy)
    expect(text).toContain('name: "Ritual Chieftain"   # auto')
    expect(text).not.toContain('Cheiftain')
  })

  it('corrects a marked count, keeping the rest of its comment', () => {
    expect(refreshAutoFields(card, enemy).text).toContain('count: 25   # auto — forces per unit')
  })

  it('rewrites the CC comment when MDT changed what applies', () => {
    expect(refreshAutoFields(card, enemy).text).toContain('# Applicable CC (auto, from MDT): Stun, Root')
  })

  it('reports what it changed, field by field', () => {
    const { changes } = refreshAutoFields(card, enemy)
    expect(changes.map((c) => c.field).sort()).toEqual(['cc', 'count', 'name'])
    expect(changes.find((c) => c.field === 'count')).toMatchObject({ before: '20', after: '25' })
  })

  it('parses a marked value containing a literal "#" without being fooled by it', () => {
    // The `\bauto\b` requirement is what should stop the lazy value match from treating this
    // embedded '#' as the marker; pinned directly rather than reasoned about by hand.
    const text = 'name: "Boss #2"   # auto\n'
    const { text: out, changes } = refreshAutoFields(text, enemy)
    expect(out).toBe('name: "Ritual Chieftain"   # auto\n')
    expect(changes).toEqual([{ field: 'name', before: 'Boss #2', after: 'Ritual Chieftain' }])
  })

  it('touches nothing outside a marked line', () => {
    const { text } = refreshAutoFields(card, enemy)
    expect(text).toContain('Prose that mentions count: 20 and must not be touched.')
    expect(text).toContain('threat: high')
    expect(text).toContain('# TO FILL IN: low | medium | high | lethal')
  })

  it('is idempotent: a second pass changes nothing', () => {
    const once = refreshAutoFields(card, enemy).text
    const twice = refreshAutoFields(once, enemy)
    expect(twice.text).toBe(once)
    expect(twice.changes).toEqual([])
  })

  it('leaves an unmarked field alone, however wrong it looks', () => {
    const unmarked = '---\nnpcId: 270306\nname: "Wrong"\n---\n'
    expect(refreshAutoFields(unmarked, enemy).text).toBe(unmarked)
  })

  it('leaves a card with no marked lines byte-for-byte identical', () => {
    const plain = '---\nnpcId: 270306\nthreat: high\n---\n\nProse.\n'
    expect(refreshAutoFields(plain, enemy).text).toBe(plain)
  })

  it('preserves CRLF line endings rather than normalising a hand-written file', () => {
    const crlf = card.replace(/\n/g, '\r\n')
    const { text } = refreshAutoFields(crlf, enemy)
    expect(text).toContain('name: "Ritual Chieftain"   # auto\r\n')
    expect(text.includes('\n\n')).toBe(false)
  })

  // Real card, not hand-built: it is the only file in the repository that pins the shape a
  // regression here would break -- an indented, per-spell `name:   # auto` line, written by
  // content-stub.mjs alongside the mob's own unindented `name:`. A regex that anchors on the
  // marker alone cannot tell those two apart; this is the test that would have caught it.
  it('never touches an indented spell name, only the mob-level name and count', () => {
    const real = fs.readFileSync(
      fileURLToPath(new URL('../content/altar-of-fangs/259445-ravi.md', import.meta.url)),
      'utf8',
    )
    const spellNameLines = real.split('\n').filter((line) => /^\s+name:.*#\s*auto\b/.test(line))
    expect(spellNameLines.length).toBeGreaterThan(0) // sanity: the fixture still has spells

    const mismatched = { id: 259445, name: 'Something Else', count: 3, isBoss: true, cc: [] }
    const { text, changes } = refreshAutoFields(real, mismatched)

    for (const line of spellNameLines) expect(text).toContain(line)
    expect(text).toContain('name: "Something Else"   # auto')
    expect(text).toContain('count: 3   # auto — forces per unit')
    expect(text).not.toContain('"Rav\'i"')

    expect(changes.map((c) => c.field).sort()).toEqual(['count', 'name'])
  })
})

describe('autoFieldFindings', () => {
  it('reports an isBoss line that should appear, and does not apply it', () => {
    const promoted = { ...enemy, isBoss: true }
    const findings = autoFieldFindings(card, promoted, 'content/x/1.md', 'x')
    expect(findings).toMatchObject([{
      severity: 6,
      dungeon: 'x',
      subject: '270306 Ritual Chieftain',
      what: 'isBoss disagrees with the data: the card says false, MDT says true',
      action: 'add `isBoss: true   # auto` under npcId',
      file: 'content/x/1.md',
    }])
    expect(refreshAutoFields(card, promoted).text).not.toContain('isBoss')
  })

  it('reports an isBoss line that should go away', () => {
    const withBoss = card.replace('npcId: 270306', 'npcId: 270306\nisBoss: true   # auto')
    const findings = autoFieldFindings(withBoss, enemy, 'content/x/1.md', 'x')
    expect(findings).toMatchObject([{
      severity: 6,
      dungeon: 'x',
      subject: '270306 Ritual Chieftain',
      what: 'isBoss disagrees with the data: the card says true, MDT says false',
      action: 'remove the `isBoss: true   # auto` line',
      file: 'content/x/1.md',
    }])
  })

  it('says nothing when isBoss already agrees with the data', () => {
    expect(autoFieldFindings(card, enemy, 'content/x/1.md', 'x')).toEqual([])
  })
})
