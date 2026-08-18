// ABOUTME: Tests the in-place refresh of a card's `# auto` marker lines.
// ABOUTME: Pins the narrow rule: marked values only, never a line added or removed.

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
})

describe('autoFieldFindings', () => {
  it('reports an isBoss line that should appear, and does not apply it', () => {
    const promoted = { ...enemy, isBoss: true }
    const findings = autoFieldFindings(card, promoted, 'content/x/1.md', 'x')
    expect(findings.some((f) => f.what.includes('isBoss'))).toBe(true)
    expect(refreshAutoFields(card, promoted).text).not.toContain('isBoss')
  })

  it('reports an isBoss line that should go away', () => {
    const withBoss = card.replace('npcId: 270306', 'npcId: 270306\nisBoss: true   # auto')
    const findings = autoFieldFindings(withBoss, enemy, 'content/x/1.md', 'x')
    expect(findings.some((f) => f.what.includes('isBoss'))).toBe(true)
  })

  it('says nothing when isBoss already agrees with the data', () => {
    expect(autoFieldFindings(card, enemy, 'content/x/1.md', 'x')).toEqual([])
  })
})
