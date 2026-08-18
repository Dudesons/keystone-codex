// ABOUTME: Tests the markdown rendering of a report and the name of the file it lands in.
// ABOUTME: Pins that an empty severity says so, rather than being left out.

import { describe, expect, it } from 'vitest'
import { renderReport, reportFileName, summariseFindings } from './mdt-report-md.mjs'
import realSpells from '../src/data/generated/spells.json'

const findings = [
  { severity: 1, dungeon: 'altar-of-fangs', subject: '1 A', what: 'annotates spell 9 it no longer has', file: 'content/altar-of-fangs/1-a.md', action: 'move the note' },
  { severity: 4, dungeon: 'murder-row', subject: '2 B', what: 'has no card in any language', action: 'run npm run scaffold' },
  { severity: 6, dungeon: 'murder-row', subject: '3 C', what: 'count changed', detail: '4 -> 5' },
]

const context = { findings, base: 'HEAD', from: '6.2.2', to: '6.3.0', date: '2026-08-18', releasesUrl: 'https://github.com/Nnoggie/MythicDungeonTools/releases' }

describe('reportFileName', () => {
  it('names both versions and the date', () => {
    expect(reportFileName({ date: '2026-08-18', from: '6.2.2', to: '6.3.0' })).toBe('2026-08-18-6.2.2-to-6.3.0.md')
  })

  it('says unknown for a version it could not read, rather than leaving a hole', () => {
    expect(reportFileName({ date: '2026-08-18', from: null, to: '6.3.0' })).toBe('2026-08-18-unknown-to-6.3.0.md')
  })
})

describe('summariseFindings', () => {
  it('counts findings per dungeon per severity', () => {
    const rows = summariseFindings(findings)
    expect(rows.find((r) => r.dungeon === 'murder-row').counts[6]).toBe(1)
    expect(rows.find((r) => r.dungeon === 'altar-of-fangs').counts[1]).toBe(1)
  })
})

describe('renderReport', () => {
  const md = renderReport(context)

  it('names the base revision and both versions in the header', () => {
    expect(md).toContain('6.2.2')
    expect(md).toContain('6.3.0')
    expect(md).toContain('HEAD')
  })

  it('links the release notes for the human half of the analysis', () => {
    expect(md).toContain(context.releasesUrl)
  })

  it('writes every finding as a checkbox, so the report is the worklist', () => {
    expect(md).toContain('- [ ] ')
    expect((md.match(/- \[ \] /g) ?? [])).toHaveLength(3)
  })

  it('states that an empty severity is empty rather than leaving it out', () => {
    // A section left out cannot be told apart from a section forgotten.
    expect(md).toMatch(/Nothing/)
    for (const severity of [1, 2, 3, 4, 5, 6]) {
      expect(md).toContain(`## Severity ${severity}`)
    }
  })

  it('orders severities from 1, and groups by dungeon inside each', () => {
    expect(md.indexOf('## Severity 1')).toBeLessThan(md.indexOf('## Severity 4'))
    expect(md.indexOf('### altar-of-fangs')).toBeLessThan(md.indexOf('## Severity 4'))
  })

  it('carries a finding s file, detail and action into the entry', () => {
    expect(md).toContain('content/altar-of-fangs/1-a.md')
    expect(md).toContain('move the note')
    expect(md).toContain('4 -> 5')
  })

  it('keeps a real multi-line tooltip inside one list item', () => {
    // A real value, not a hand-made one: `description` is what severity 3 diffs, and hundreds of
    // the descriptions in the committed table span lines with a blank line between paragraphs.
    // A blank line inside a list item ends it -- the rest of the text would land as a top-level
    // paragraph and the `→ action` line would attach to nothing.
    const spell = Object.entries(realSpells).find(([, e]) => /\n\s*\n/.test(e.text?.en?.description ?? ''))
    expect(spell).toBeDefined()
    const [id, entry] = spell
    const description = entry.text.en.description

    const out = renderReport({
      ...context,
      findings: [{
        severity: 3,
        dungeon: 'altar-of-fangs',
        subject: `spell ${id}`,
        what: 'description changed',
        detail: `[en] (none) -> ${description}`,
        action: 'reread the note',
      }],
    })

    const lines = out.split('\n')
    const bullet = lines.findIndex((l) => l.startsWith('- [ ] '))
    expect(lines[bullet + 1].trimStart()).toMatch(/^\[en\] \(none\) -> /)
    expect(lines[bullet + 1]).toContain(description.split(/\s*\n\s*/).join(' '))
    expect(lines[bullet + 2].trimStart()).toBe('→ reread the note')
    // Nothing from the tooltip escaped into a heading or a second checkbox.
    expect((out.match(/- \[ \] /g) ?? [])).toHaveLength(1)
  })

  it('keeps a non-breaking space byte for byte, even across a paragraph break', () => {
    // A real value, not a hand-made one: French tooltips use U+00A0 (non-breaking space) and
    // U+202F (narrow no-break space) to space their numbers, and `\s` -- the character class the
    // old implementation collapsed -- matches both. Spell 263958's French description carries two
    // non-breaking spaces *and* the blank line between paragraphs that oneLine must still fold,
    // so this one case pins both halves of the guarantee at once.
    const entry = realSpells['263958']
    const description = entry.text.fr.description
    expect(description).toContain('\u00a0')
    expect(description).toContain('\n\n')

    const out = renderReport({
      ...context,
      findings: [{
        severity: 3,
        dungeon: 'altar-of-fangs',
        subject: 'spell 263958',
        what: 'description changed',
        detail: `[fr] (none) -> ${description}`,
        action: 'reread the note',
      }],
    })

    const lines = out.split('\n')
    const bullet = lines.findIndex((l) => l.startsWith('- [ ] '))
    // Every non-breaking space in the source value survives, at the same count.
    const nbspInSource = (description.match(/\u00a0/g) ?? []).length
    const nbspInLine = (lines[bullet + 1].match(/\u00a0/g) ?? []).length
    expect(nbspInSource).toBeGreaterThan(0)
    expect(nbspInLine).toBe(nbspInSource)
    // The paragraph break still folds into one space, so the detail stays one list item.
    expect((out.match(/- \[ \] /g) ?? [])).toHaveLength(1)
    expect(lines[bullet + 2].trimStart()).toBe('→ reread the note')
  })
})
