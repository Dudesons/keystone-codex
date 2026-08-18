// ABOUTME: Reads what a content card claims, and audits those claims against the current data.
// ABOUTME: Pure: the caller supplies the file contents, so this is testable without a filesystem.

import { parse as parseYaml } from 'yaml'
import { WOWHEAD_LOCALES } from './config.mjs'

const BASE_LANG = WOWHEAD_LOCALES[0].lang

/** Locales a card may be suffixed with: the same list the fetch is configured for. */
const LOCALES = new Set(WOWHEAD_LOCALES.map((l) => l.lang))

/**
 * The language a card file is written in.
 *
 * `263109-ulateks-chosen.fr.md` is French; the same name without a suffix is the base language.
 * A dot inside the slug is not a locale, which is why the suffix is checked against the list
 * rather than merely being present.
 */
export function cardLocale(fileName) {
  const stem = fileName.replace(/\.md$/, '')
  const cut = stem.lastIndexOf('.')
  if (cut === -1) return BASE_LANG
  const suffix = stem.slice(cut + 1)
  return LOCALES.has(suffix) ? suffix : BASE_LANG
}

/**
 * What a card claims, or null when it claims nothing usable.
 *
 * `written` mirrors `isStub` in `src/lib/content.ts:283-288`, inverted: a card counts as written
 * once a human has put judgement in it — prose, a trap, a threat, or one annotated spell. The
 * rule is duplicated here because the app is TypeScript and this is a script; if one moves, the
 * other has to follow, and the test above says so.
 *
 * A card that cannot be parsed returns null rather than throwing: one malformed file must not
 * stop a report covering eight dungeons.
 */
export function readCardFacts(text, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!match) return null

  let data
  try {
    data = parseYaml(match[1])
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null

  const npcId = Number(data.npcId)
  if (!npcId) return null

  const spells = Array.isArray(data.spells)
    ? data.spells
        .filter((s) => s && Number(s.id))
        .map((s) => ({ id: Number(s.id), note: s.note ?? null, tag: s.tag ?? null }))
    : []

  const prose = text.slice(match[0].length).replace(/<!--[\s\S]*?-->/g, '').trim()
  const written = Boolean(
    prose ||
      data.trap ||
      data.threat ||
      spells.some((s) => s.note || (s.tag && s.tag !== 'todo')),
  )

  return { file, npcId, locale: cardLocale(file), spells, written }
}

/** A spell carries writing when it has a note, or a tag that is not the scaffold's placeholder. */
const isAnnotated = (spell) => Boolean(spell.note || (spell.tag && spell.tag !== 'todo'))

/**
 * Every spell id some card annotates.
 *
 * `diffSpells` grades a moved tooltip by this set: under a note the change dates the writing,
 * elsewhere it is only a fact about the data.
 */
export function annotatedSpellIds(cards) {
  const ids = new Set()
  for (const card of cards) {
    for (const spell of card.spells) if (isAnnotated(spell)) ids.add(spell.id)
  }
  return ids
}

/**
 * What the current data costs the cards of one dungeon.
 *
 * Severity 1 is writing the site has already stopped showing: `MobCard.tsx:49` renders a mob's
 * spells from the MDT data and looks each note up by id, so an id the data dropped takes its note
 * out of the page with no diagnostic anywhere. The same holds for a whole card whose mob left.
 *
 * Severity 2 is the opposite direction: a card a human has written, which the data has since
 * given spells nobody has annotated.
 */
export function auditDungeon(dungeon, cards) {
  const out = []
  const slug = dungeon.slug
  const byId = new Map(dungeon.enemies.map((e) => [e.id, e]))

  for (const card of cards) {
    const enemy = byId.get(card.npcId)

    if (!enemy) {
      // A written card losing its mob is writing lost; a stub losing its mob is only clutter.
      // The design lists the situation at both severities, and `written` is what separates them.
      out.push(
        card.written
          ? {
              severity: 1,
              dungeon: slug,
              subject: `npcId ${card.npcId}`,
              what: 'is claimed by a written card, but no mob in the dungeon carries it',
              action: 'the card never renders: move its writing or delete the file',
              file: card.file,
            }
          : {
              severity: 5,
              dungeon: slug,
              subject: `npcId ${card.npcId}`,
              what: 'is claimed by an unwritten card, and no mob in the dungeon carries it',
              action: 'delete the file, and its sibling in every other language',
              file: card.file,
            },
      )
      continue
    }

    const known = new Set(enemy.spells.map((s) => s.id))
    for (const spell of card.spells) {
      if (known.has(spell.id) || !isAnnotated(spell)) continue
      out.push({
        severity: 1,
        dungeon: slug,
        subject: `${enemy.id} ${enemy.name}`,
        what: `annotates spell ${spell.id}, which the mob no longer has`,
        detail: spell.note ? `note: ${spell.note}` : `tag: ${spell.tag}`,
        action: 'the note no longer renders: move it to the right spell or drop it',
        file: card.file,
      })
    }

    if (!card.written) continue
    const annotated = new Set(card.spells.filter(isAnnotated).map((s) => s.id))
    const bare = enemy.spells.map((s) => s.id).filter((id) => !annotated.has(id))
    if (bare.length) {
      out.push({
        severity: 2,
        dungeon: slug,
        subject: `${enemy.id} ${enemy.name}`,
        what: `is written but leaves ${bare.length} spell(s) un-annotated`,
        detail: `spells ${bare.join(', ')}`,
        action: 'they render with their Wowhead description alone',
        file: card.file,
      })
    }
  }

  const covered = new Set(cards.map((c) => c.npcId))
  const reported = new Set()
  for (const enemy of dungeon.enemies) {
    if (covered.has(enemy.id) || reported.has(enemy.id)) continue
    reported.add(enemy.id)
    out.push({
      severity: 4,
      dungeon: slug,
      subject: `${enemy.id} ${enemy.name}`,
      what: 'has no card in any language',
      action: 'run npm run scaffold, then write it',
    })
  }

  return out
}
