// ABOUTME: Rewrites the `# auto` marker lines of a card in place, and nothing else.
// ABOUTME: Pure, so the narrow rule that keeps it safe is testable without a filesystem.

/**
 * Refreshing the mechanical lines of a hand-written card.
 *
 * `content-stub.mjs` writes some frontmatter with an `# auto` marker: the value came from MDT and
 * no human chose it. Those are the only lines here that may move, and only their value moves --
 * the marker and the rest of the comment survive byte for byte.
 *
 * The gain is small on purpose. `src/lib/content.ts:200-207` shows the app reads none of these
 * fields; a stale `count:` is a false comment, not a bug. What this buys is that the comment
 * stops lying to whoever reads the card next, and the narrow rule is what keeps that from turning
 * into a script editing writing it does not understand.
 *
 * A line that would have to be **added or removed** is never applied, only reported: inserting or
 * deleting a line in a hand-written file is a different act from correcting a value on one.
 */

import { yamlString } from './content-stub.mjs'

/**
 * `name: "X"   # auto` and `count: 5   # auto — trailing comment` — value replaced, marker kept.
 *
 * Anchored to column 0 on purpose: `content-stub.mjs` also writes an indented `name:` under each
 * spell (its label from Wowhead), also marked `# auto`. That line is not this mob's name -- it
 * belongs to a spell this function never sees -- so a leading `\s*` here would overwrite every
 * spell's name with the mob's. Only the unindented, top-level `name:`/`count:` may match.
 */
const MARKED = /^((name|count):\s*)(.*?)(\s+#\s*auto\b.*)$/

/** The CC comment the scaffold writes, whose whole payload is the list. */
const CC_COMMENT = /^(\s*#\s*Applicable CC \(auto, from MDT\):\s*)(.*)$/

/** Splits on newlines while remembering each line's own ending, so CRLF files survive. */
function splitLines(text) {
  return text.split(/(?<=\n)/)
}

export function refreshAutoFields(text, enemy) {
  const changes = []
  // `yamlString` is content-stub.mjs's own escaper, imported rather than restated: this whole
  // module exists to reproduce byte for byte what the scaffold wrote, and a second escaper is how
  // that quietly stops being true.
  const wanted = { name: yamlString(enemy.name), count: String(enemy.count) }

  const out = splitLines(text).map((raw) => {
    const eol = raw.match(/\r?\n$/)?.[0] ?? ''
    const line = raw.slice(0, raw.length - eol.length)

    const marked = MARKED.exec(line)
    if (marked) {
      const [, head, field, value, tail] = marked
      if (value === wanted[field]) return raw
      changes.push({ field, before: value.replace(/^"|"$/g, ''), after: wanted[field].replace(/^"|"$/g, '') })
      return `${head}${wanted[field]}${tail}${eol}`
    }

    const cc = CC_COMMENT.exec(line)
    if (cc) {
      const [, head, value] = cc
      const next = (enemy.cc ?? []).join(', ')
      if (value === next) return raw
      changes.push({ field: 'cc', before: value, after: next })
      return `${head}${next}${eol}`
    }

    return raw
  })

  return { text: out.join(''), changes }
}

/**
 * The marked lines this module declines to apply.
 *
 * Only `isBoss` can require an insertion or a deletion: the scaffold writes the line when the mob
 * is a boss and omits it otherwise, so a mob changing status needs a structural edit.
 *
 * The **presence** of the line is the card's claim, and the marker is not required for it. The
 * scaffold writes one; a human who typed the line themselves did not, and reading that line as
 * absent would have the action below add a second `isBoss:` key -- duplicate keys make the
 * frontmatter unparseable, `readCardFacts` then returns null, and the card drops out of every
 * later report without a word. Reporting is all that widens here: `refreshAutoFields` still
 * rewrites marked lines only, and still never adds or removes one.
 */
export function autoFieldFindings(text, enemy, file, slug) {
  const declared = /^[ \t]*isBoss:/m.test(text)
  const actual = enemy.isBoss === true
  if (declared === actual) return []

  return [{
    severity: 6,
    dungeon: slug,
    subject: `${enemy.id} ${enemy.name}`,
    what: `isBoss disagrees with the data: the card says ${declared}, MDT says ${actual}`,
    action: actual
      ? 'add `isBoss: true   # auto` under npcId'
      : 'remove the `isBoss:` line',
    file,
  }]
}
