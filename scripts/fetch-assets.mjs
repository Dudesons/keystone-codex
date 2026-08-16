/**
 * Fetches artwork and spell labels.
 *
 * MDT stores only spell IDs and creature `displayId`s: names, icons and descriptions come
 * from the game at runtime, which is not available on the web. So we resolve them once at
 * build time through Wowhead and cache everything into versioned files — the script only
 * re-downloads what is missing.
 *
 *   npm run fetch:assets          # fill in what is missing
 *   FORCE=1 npm run fetch:assets  # re-download everything (new patch, or a new language
 *                                 # added to SPELL_LOCALES)
 */

import fs from 'node:fs'
import path from 'node:path'
import { GENERATED_DIR, PUBLIC_DIR, SPELL_LOCALES } from './config.mjs'

const FORCE = process.env.FORCE === '1'
const CONCURRENCY = 8
const SPELL_CACHE = path.join(GENERATED_DIR, 'spells.json')
const ICON_DIR = path.join(PUBLIC_DIR, 'icons')
const PORTRAIT_DIR = path.join(PUBLIC_DIR, 'portraits')

/** Runs `worker` over every item with a fixed-size pool. */
async function pool(items, size, worker) {
  const queue = [...items]
  const results = []
  await Promise.all(
    Array.from({ length: Math.min(size, queue.length) }, async () => {
      while (queue.length) {
        const item = queue.shift()
        try {
          results.push(await worker(item))
        } catch (err) {
          results.push({ item, error: err.message })
        }
      }
    }),
  )
  return results
}

async function fetchRetry(url, init, attempts = 3) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init)
      if (res.ok) return res
      // 404 = the resource is gone for good, no point insisting.
      if (res.status === 404) return null
      lastErr = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastErr = err
    }
    await new Promise((r) => setTimeout(r, 300 * 2 ** i))
  }
  throw lastErr
}

const stripTags = (html) =>
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
 * carrying the description.
 */
function tooltipLines(html) {
  const header = /<table>.*?<td>(.*?)<\/td>/s.exec(html)
  if (!header) return []
  return stripTags(header[1]).split('\n').map((l) => l.trim()).filter(Boolean).slice(1)
}

function tooltipDescription(html) {
  const desc = /<div class="q[0-9]?">(.*?)<\/div>/s.exec(html)
  return desc ? stripTags(desc[1]) : undefined
}

/**
 * Assigns a meaning to each header line — `range` or `castTime` — based on English.
 *
 * These patterns only match English, and that is deliberate: rather than maintaining one
 * regex set per language ("Portée illimitée", "3 s d'incantation"…), we classify **once** on
 * the base language and apply the same positional mapping to the other locales. Wowhead
 * renders the same lines in the same order whatever the language.
 */
function classifyLines(lines) {
  const layout = {}
  lines.forEach((line, i) => {
    if (/range$/i.test(line)) layout[i] = 'range'
    else if (/cast$/i.test(line) || /^instant$/i.test(line) || /channel/i.test(line)) {
      layout[i] = 'castTime'
    }
  })
  return layout
}

function buildText(tooltip, layout) {
  const text = { name: tooltip.name }
  for (const [index, field] of Object.entries(layout)) {
    const value = tooltip.lines[Number(index)]
    if (value) text[field] = value
  }
  if (tooltip.description) text.description = tooltip.description
  return text
}

async function fetchTooltip(id, wowheadLocale) {
  const res = await fetchRetry(
    `https://nether.wowhead.com/tooltip/spell/${id}?dataEnv=1&locale=${wowheadLocale}`,
  )
  if (!res) return null
  const json = await res.json()
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
 * One spell in every configured language.
 *
 * `id` and `icon` are language-independent and stay at the top; the rest goes under
 * `text.<language>`. A missing locale is not an error: the app falls back to the base
 * language, which Wowhead forces anyway for recent spells.
 */
async function fetchSpell(id) {
  const [baseLocale, ...others] = SPELL_LOCALES

  const base = await fetchTooltip(id, baseLocale.wowhead)
  if (!base) return { id, missing: true }

  const layout = classifyLines(base.lines)
  const text = { [baseLocale.lang]: buildText(base, layout) }
  const warnings = []

  for (const { lang, wowhead } of others) {
    const tooltip = await fetchTooltip(id, wowhead)
    if (!tooltip) {
      warnings.push(`${id}: no ${lang} tooltip`)
      continue
    }
    // Positional mapping only holds if both tooltips have the same shape. On a mismatch we
    // do not guess: name and description are enough, the app tolerates the rest missing.
    if (tooltip.lines.length !== base.lines.length) {
      warnings.push(
        `${id}: ${lang} header has ${tooltip.lines.length} lines against ${base.lines.length} in ${baseLocale.lang}, cast time and range omitted`,
      )
      text[lang] = { name: tooltip.name, ...(tooltip.description && { description: tooltip.description }) }
      continue
    }
    text[lang] = buildText(tooltip, layout)
  }

  return { id, icon: base.icon, text, warnings }
}

async function downloadTo(url, dest) {
  if (!FORCE && fs.existsSync(dest)) return 'cached'
  const res = await fetchRetry(url)
  if (!res) return 'missing'
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
  return 'downloaded'
}

function loadDungeons() {
  const indexFile = path.join(GENERATED_DIR, 'dungeons.json')
  if (!fs.existsSync(indexFile)) {
    throw new Error('Run `npm run extract` first.')
  }
  return JSON.parse(fs.readFileSync(indexFile, 'utf8')).map((d) =>
    JSON.parse(fs.readFileSync(path.join(GENERATED_DIR, `${d.slug}.json`), 'utf8')),
  )
}

async function main() {
  const dungeons = loadDungeons()
  fs.mkdirSync(ICON_DIR, { recursive: true })
  fs.mkdirSync(PORTRAIT_DIR, { recursive: true })

  const spellIds = [...new Set(dungeons.flatMap((d) => d.enemies.flatMap((e) => e.spells.map((s) => s.id))))]
  const displayIds = [...new Set(dungeons.flatMap((d) => d.enemies.map((e) => e.displayId).filter(Boolean)))]

  // --- Spells ------------------------------------------------------------
  const cache = !FORCE && fs.existsSync(SPELL_CACHE) ? JSON.parse(fs.readFileSync(SPELL_CACHE, 'utf8')) : {}
  // An entry with no `text` block predates localization and has to be redone. A missing
  // secondary locale, on the other hand, is not a signal — Wowhead does not translate
  // everything — so **adding a language to SPELL_LOCALES requires a `FORCE=1`**.
  const isCurrent = (entry) => Boolean(entry?.text?.[SPELL_LOCALES[0].lang])
  const todo = spellIds.filter((id) => !isCurrent(cache[String(id)]))
  const langs = SPELL_LOCALES.map((l) => l.lang).join(', ')
  console.log(`Spells: ${spellIds.length} unique, ${todo.length} to fetch (${langs})`)

  let done = 0
  const spellResults = await pool(todo, CONCURRENCY, async (id) => {
    const spell = await fetchSpell(id)
    if (!spell.missing) cache[String(id)] = { id: spell.id, icon: spell.icon, text: spell.text }
    if (++done % 50 === 0) process.stdout.write(`  ${done}/${todo.length}\r`)
    return spell
  })
  const missingSpells = spellResults.filter((s) => s.missing || s.error)
  const spellWarnings = spellResults.flatMap((s) => s.warnings ?? [])
  fs.writeFileSync(SPELL_CACHE, JSON.stringify(cache, null, 1), 'utf8')
  console.log(`  ${Object.keys(cache).length} spells cached${missingSpells.length ? `, ${missingSpells.length} unresolved` : ''}`)
  if (spellWarnings.length) {
    console.log(`  ${spellWarnings.length} partial tooltips:`)
    for (const w of spellWarnings) console.log(`    ${w}`)
  }

  // --- Icons -------------------------------------------------------------
  const icons = [...new Set(Object.values(cache).map((s) => s.icon).filter(Boolean))]
  const iconResults = await pool(icons, CONCURRENCY, (icon) =>
    downloadTo(`https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`, path.join(ICON_DIR, `${icon}.jpg`)),
  )
  const iconsOk = iconResults.filter((r) => r === 'downloaded' || r === 'cached').length
  console.log(`Icons: ${iconsOk}/${icons.length}`)

  // --- Creature portraits ------------------------------------------------
  // Model viewer thumbnail path: the folder is displayId % 256.
  const portraitResults = await pool(displayIds, CONCURRENCY, (id) =>
    downloadTo(
      `https://wow.zamimg.com/modelviewer/live/webthumbs/npc/${id % 256}/${id}.webp`,
      path.join(PORTRAIT_DIR, `${id}.webp`),
    ),
  )
  const portraitsOk = portraitResults.filter((r) => r === 'downloaded' || r === 'cached').length
  console.log(`Portraits: ${portraitsOk}/${displayIds.length}`)

  const weight = (dir) =>
    fs.readdirSync(dir).reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0) / 1024 / 1024
  console.log(`\nWeight: icons ${weight(ICON_DIR).toFixed(1)} MB, portraits ${weight(PORTRAIT_DIR).toFixed(1)} MB`)

  if (missingSpells.length) {
    console.log(`\nUnresolved spells (rendered with their raw ID): ${missingSpells.map((s) => s.id).join(', ')}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
