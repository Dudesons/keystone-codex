// ABOUTME: Renders findings as the markdown report, and names the file it lands in.
// ABOUTME: Pure: every rule that produced a finding lives elsewhere, this only formats.

/** What each severity means, in the order the report presents them. */
const SEVERITIES = [
  [1, 'Writing already lost', 'The site has stopped showing this writing. Nothing else reports it.'],
  [2, 'Writing incomplete', 'A written card whose mob gained spells nobody has annotated.'],
  [3, 'Writing possibly stale', 'A tooltip moved under a note that may quote its numbers.'],
  [4, 'To write', 'New mobs and new dungeons, with no card yet.'],
  [5, 'Dead weight', 'Cards whose mob left MDT. Nothing breaks; the repository misstates itself.'],
  [6, 'Informational', 'What moved in the data, with no writing lost, though a few of these still name a follow-up.'],
]

export function reportFileName({ date, from, to }) {
  return `${date}-${from ?? 'unknown'}-to-${to ?? 'unknown'}.md`
}

export function summariseFindings(findings) {
  const rows = new Map()
  for (const f of findings) {
    const key = f.dungeon || '(index)'
    if (!rows.has(key)) rows.set(key, { dungeon: key, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } })
    rows.get(key).counts[f.severity]++
  }
  return [...rows.values()].sort((a, b) => a.dungeon.localeCompare(b.dungeon))
}

/**
 * One finding is one list item, whatever its detail quotes.
 *
 * A `detail` carries values straight out of the data, and a spell's `castTime`, `name` and
 * `description` span several lines with a blank line between paragraphs -- 291 of the values in
 * the committed `spells.json` do. A blank line inside a list item ends it: the rest of the old
 * text would land as a top-level paragraph and the `→ action` line would attach to nothing. A
 * description beginning `- ` or `# ` would go further and fabricate a checkbox or a heading in a
 * document whose checkboxes are the worklist.
 *
 * `oneLine` folds only a line break and the ordinary whitespace hugging it -- not every run of
 * whitespace. 695 of the values in the committed `spells.json` carry U+00A0 (non-breaking space)
 * or U+202F (narrow no-break space), which is how French tooltips space their numbers.
 * JavaScript's `\s` -- and `String.prototype.trim` -- already treat both as whitespace, so a
 * plain `\s+` (or a bare `.trim()` on the result) silently rewrites those bytes. That matters
 * because severity 3's whole job is showing a tooltip's old text against its new text: if the
 * only difference between two captures was one of these invisible characters, the report would
 * render two strings a reader cannot tell apart, in the one section whose purpose is showing a
 * difference. `[^\S\u00a0\u202f]` reads as "whitespace, per `\s`, except those two" -- written as
 * escapes rather than the literal bytes, so the two characters this function exists to preserve
 * stay visible in the source instead of sitting invisibly in a character class, where an editor,
 * a formatter or a careless copy-paste could silently normalise them to plain spaces and revive
 * the exact bug this function fixes, with no visible diff to explain it. Do not simplify this
 * back to `\s+`. See commit feb0910, "Spell a French label byte for byte, invisible characters
 * included", for the earlier bug in the same class.
 */
const oneLine = (s) =>
  String(s)
    .replace(/[^\S\u00a0\u202f]*(?:\r\n|\r|\n)[^\S\u00a0\u202f]*/g, ' ')
    .replace(/^[^\S\u00a0\u202f]+|[^\S\u00a0\u202f]+$/g, '')

function renderFinding(f) {
  const lines = [`- [ ] **${f.subject}** — ${f.what}`]
  if (f.detail) lines.push(`      ${oneLine(f.detail)}`)
  if (f.action) lines.push(`      → ${f.action}`)
  if (f.file) lines.push(`      \`${f.file}\``)
  return lines.join('\n')
}

export function renderReport({ findings, base, from, to, date, releasesUrl }) {
  const out = [
    `# MDT ${from ?? 'unknown'} → ${to ?? 'unknown'}`,
    '',
    `Generated on ${date}, comparing \`${base}\` against the working tree.`,
    '',
    `Release notes, for the half of the analysis no tool does: ${releasesUrl}`,
    '',
    '## Summary',
    '',
    '| Dungeon | 1 | 2 | 3 | 4 | 5 | 6 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ]

  for (const row of summariseFindings(findings)) {
    const c = row.counts
    out.push(`| ${row.dungeon} | ${c[1]} | ${c[2]} | ${c[3]} | ${c[4]} | ${c[5]} | ${c[6]} |`)
  }
  if (!findings.length) out.push('| — | 0 | 0 | 0 | 0 | 0 | 0 |')
  out.push('')

  for (const [severity, title, gloss] of SEVERITIES) {
    out.push(`## Severity ${severity} — ${title}`, '', gloss, '')

    const mine = findings.filter((f) => f.severity === severity)
    if (!mine.length) {
      out.push('Nothing at this severity.', '')
      continue
    }

    const byDungeon = new Map()
    for (const f of mine) {
      const key = f.dungeon || '(index)'
      if (!byDungeon.has(key)) byDungeon.set(key, [])
      byDungeon.get(key).push(f)
    }

    for (const key of [...byDungeon.keys()].sort((a, b) => a.localeCompare(b))) {
      out.push(`### ${key}`, '')
      for (const f of byDungeon.get(key)) out.push(renderFinding(f))
      out.push('')
    }
  }

  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}
