// ABOUTME: Parses Wowhead's tooltip HTML into per-language spell and creature labels.
// ABOUTME: classifyLines maps lines by position, so one English pass serves every other locale.

/**
 * Reading Wowhead's tooltip HTML, separated from the fetching.
 *
 * The interesting part of fetch-assets.mjs is not the network, it is `classifyLines`: the
 * whole design rests on the claim that Wowhead renders the same lines in the same order
 * whatever the language. That claim can only be checked against real responses in two
 * languages — a hand-written sample would satisfy it by construction and prove nothing —
 * so these functions are pure and pointed at captured fixtures.
 */

export const stripTags = (html) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim()

/**
 * The tooltip's header lines, name excluded.
 * Structure: a first table holding `name<br/>[range<br/>]cast time`, then a `<div class="q">`
 * carrying the description. Only the first table is read, so the separate `buff` block some
 * spells carry cannot leak in.
 */
export function tooltipLines(html) {
  const header = /<table>.*?<td>(.*?)<\/td>/s.exec(html)
  if (!header) return []
  return stripTags(header[1]).split('\n').map((l) => l.trim()).filter(Boolean).slice(1)
}

export function tooltipDescription(html) {
  const desc = /<div class="q[0-9]?">(.*?)<\/div>/s.exec(html)
  return desc ? stripTags(desc[1]) : undefined
}

/** Wowhead's JSON response into the shape the rest of the chain works with. */
export function parseTooltip(json) {
  if (!json?.name) return null
  const html = json.tooltip || ''
  return {
    name: json.name,
    icon: json.icon,
    lines: tooltipLines(html),
    description: tooltipDescription(html),
  }
}

/**
 * Assigns a meaning to each header line — `range` or `castTime` — based on English.
 *
 * These patterns only match English, and that is deliberate: rather than maintaining one
 * regex set per language ("Portée illimitée", "3 s d'incantation"…), we classify **once** on
 * the base language and apply the same positional mapping to the other locales.
 */
export function classifyLines(lines) {
  const layout = {}
  lines.forEach((line, i) => {
    if (/range$/i.test(line)) layout[i] = 'range'
    else if (/cast$/i.test(line) || /^instant$/i.test(line) || /channel/i.test(line)) {
      layout[i] = 'castTime'
    }
  })
  return layout
}

export function buildText(tooltip, layout) {
  const text = { name: tooltip.name }
  for (const [index, field] of Object.entries(layout)) {
    const value = tooltip.lines[Number(index)]
    if (value) text[field] = value
  }
  if (tooltip.description) text.description = tooltip.description
  return text
}

/**
 * One spell across every configured language.
 *
 * `entries` is `[{ lang, tooltip }]`, the first being the base language — its pass is what
 * decides the meaning of every line for all the others. Returns `null` when the base tooltip
 * is missing, which is the caller's signal that the spell could not be resolved at all.
 *
 * A missing secondary locale is not an error: Wowhead does not translate everything, and a
 * recent spell ships in English first. The app falls back on its own.
 */
export function buildSpellText(id, entries) {
  const [base, ...others] = entries
  if (!base?.tooltip) return null

  const layout = classifyLines(base.tooltip.lines)
  const text = { [base.lang]: buildText(base.tooltip, layout) }
  const warnings = []

  for (const { lang, tooltip } of others) {
    if (!tooltip) {
      warnings.push(`${id}: no ${lang} tooltip`)
      continue
    }
    // Positional mapping only holds if both tooltips have the same shape. On a mismatch we
    // do not guess: name and description are enough, the app tolerates the rest missing.
    if (tooltip.lines.length !== base.tooltip.lines.length) {
      warnings.push(
        `${id}: ${lang} header has ${tooltip.lines.length} lines against ${base.tooltip.lines.length} in ${base.lang}, cast time and range omitted`,
      )
      text[lang] = { name: tooltip.name, ...(tooltip.description && { description: tooltip.description }) }
      continue
    }
    text[lang] = buildText(tooltip, layout)
  }

  return { icon: base.tooltip.icon, text, warnings }
}

/**
 * An NPC tooltip's header lines, name excluded.
 *
 * Read out of the markup rather than out of the whitespace. Wowhead separates the name row
 * with a newline but runs the rows below it together, so splitting on newlines glues a
 * creature's family onto its classification — "Beast (Elite)Chimaera". Rows carrying no text
 * fall away, which is what removes the dungeon-journal portrait a boss tooltip opens with.
 */
function npcLines(html, name) {
  const cells = [...html.matchAll(/<td>(.*?)<\/td>/gs)].map((m) => stripTags(m[1])).filter(Boolean)
  const nameAt = cells.indexOf(name)
  return nameAt === -1 ? [] : cells.slice(nameAt + 1)
}

/** Wowhead's NPC response into a name and its header lines. */
export function parseNpcTooltip(json) {
  if (!json?.name) return null
  return { name: json.name, lines: npcLines(json.tooltip || '', json.name) }
}

/**
 * Which header line carries `Type (Classification)`.
 *
 * A creature's header holds up to four lines — a title above, then the classification, then
 * its family and its reaction — and which of them are present varies per creature, so the
 * line's index does not. What is stable is the order, across languages, so this runs **once**
 * on the base language and the other locales take the index: the same discipline as
 * `classifyLines`, for the same reason.
 */
export function classifyNpcLines(lines) {
  return lines.findIndex((line) => /\([^)]*\)\s*$/.test(line))
}

/**
 * The creature type alone, out of a classification line.
 *
 * "Level 82 - 90 Humanoid (Normal)" and "Niveau 82 - 90 Humanoïde (Standard)" both give the
 * type. The classification is parenthesised and the level prefix ends at its last digit —
 * punctuation and digits, not vocabulary — so neither needs a rule per language. Zul'jarra
 * reads "Level ??", hence the question mark alongside the digits.
 *
 * What is left may be nothing at all: Infused Eggs render as " (Normal)", a classification
 * with no creature type in front of it.
 */
function creatureType(line) {
  return line?.replace(/\s*\([^)]*\)\s*$/, '').replace(/^.*[\d?]\s+/, '').trim() || undefined
}

/**
 * One creature across every configured language.
 *
 * `mdtName` wins for the base language, and Wowhead's own English is spent on checking it
 * instead: MDT's name is the identity every content file, spell note and test is keyed on,
 * and a mismatch means the id is wrong rather than the name being stale. Renaming the mob on
 * that basis would be invisible — it would simply start displaying another creature.
 */
export function buildNpcText(id, mdtName, entries) {
  const [base, ...others] = entries
  if (!base?.tooltip) return null

  const warnings = []
  if (base.tooltip.name !== mdtName) {
    warnings.push(`${id}: MDT calls it "${mdtName}", Wowhead "${base.tooltip.name}" — check the id`)
  }

  const classifiedAt = classifyNpcLines(base.tooltip.lines)
  const label = (name, lines) => {
    const type = classifiedAt === -1 ? undefined : creatureType(lines[classifiedAt])
    return { name, ...(type && { type }) }
  }
  const text = { [base.lang]: label(mdtName, base.tooltip.lines) }

  for (const { lang, tooltip } of others) {
    if (!tooltip) {
      warnings.push(`${id}: no ${lang} tooltip`)
      continue
    }
    // The index only means anything if both headers hold the same lines. On a mismatch we do
    // not guess: the name alone is enough, and the app falls back for the rest.
    if (tooltip.lines.length !== base.tooltip.lines.length) {
      warnings.push(
        `${id}: ${lang} header has ${tooltip.lines.length} lines against ${base.tooltip.lines.length} in ${base.lang}, creature type omitted`,
      )
      text[lang] = { name: tooltip.name }
      continue
    }
    text[lang] = label(tooltip.name, tooltip.lines)
  }

  return { text, warnings }
}

/**
 * Configured languages that the cache has never seen a single label for.
 *
 * The per-spell cache check only looks at the base language, because a *missing secondary*
 * locale is legitimate — Wowhead does not translate everything. That leniency has a blind
 * spot: add a language to `WOWHEAD_LOCALES` and every entry still looks current, so the run
 * reports "0 to fetch", exits successfully, and the app silently falls back to English for
 * the whole pool. One entry carrying a label is enough to prove the pass actually ran, so
 * this looks across the cache rather than per spell.
 */
export function unfetchedLocales(cache, configured) {
  const seen = new Set(Object.values(cache).flatMap((entry) => Object.keys(entry?.text ?? {})))
  return configured.filter((lang) => !seen.has(lang))
}
