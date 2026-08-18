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
