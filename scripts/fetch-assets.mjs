// ABOUTME: Downloads spell and creature labels, icons and mob portraits into versioned files.
// ABOUTME: One fetch pass per WOWHEAD_LOCALES entry; the parsing lives in wowhead-tooltip.mjs.

/**
 * Fetches artwork, spell labels and creature labels.
 *
 * MDT stores only spell IDs and creature `displayId`s: names, icons and descriptions come
 * from the game at runtime, which is not available on the web. So we resolve them once at
 * build time through Wowhead and cache everything into versioned files — the script only
 * re-downloads what is missing.
 *
 * Creatures are the one case where MDT does carry a label — an English name and an English
 * `creatureType` — so what Wowhead adds there is the other languages. Wowhead's English is
 * spent checking MDT's name instead of replacing it; see `buildNpcText`.
 *
 *   npm run fetch:assets          # fill in what is missing
 *   FORCE=1 npm run fetch:assets  # re-download everything (new patch, or a new language
 *                                 # added to WOWHEAD_LOCALES)
 */

import fs from 'node:fs'
import path from 'node:path'
import { GENERATED_DIR, PUBLIC_DIR, WOWHEAD_LOCALES } from './config.mjs'
import { collectSpellIds } from './spell-ids.mjs'
import {
  buildNpcText,
  buildSpellText,
  parseNpcTooltip,
  parseTooltip,
  unfetchedLocales,
} from './wowhead-tooltip.mjs'

const FORCE = process.env.FORCE === '1'
const CONCURRENCY = 8
const SPELL_CACHE = path.join(GENERATED_DIR, 'spells.json')
const NPC_CACHE = path.join(GENERATED_DIR, 'npcs.json')
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

/** One tooltip, parsed. `parse` is the whole difference between a spell and a creature. */
async function fetchTooltip(kind, id, wowheadLocale, parse) {
  const res = await fetchRetry(
    `https://nether.wowhead.com/tooltip/${kind}/${id}?dataEnv=1&locale=${wowheadLocale}`,
  )
  return res ? parse(await res.json()) : null
}

/**
 * One id in every configured language, base language first.
 *
 * The base is fetched on its own and before the rest: without it there is nothing to build,
 * so there is no point spending a request per remaining locale. Returns null in that case.
 * The merging itself lives in wowhead-tooltip.mjs, where it is tested against captured
 * responses.
 */
async function fetchLocales(kind, id, parse) {
  const [baseLocale, ...others] = WOWHEAD_LOCALES

  const base = await fetchTooltip(kind, id, baseLocale.wowhead, parse)
  if (!base) return null

  const entries = [{ lang: baseLocale.lang, tooltip: base }]
  for (const { lang, wowhead } of others) {
    entries.push({ lang, tooltip: await fetchTooltip(kind, id, wowhead, parse) })
  }
  return entries
}

async function fetchSpell(id) {
  const entries = await fetchLocales('spell', id, parseTooltip)
  return entries ? { id, ...buildSpellText(id, entries) } : { id, missing: true }
}

/** `mdtName` is what the English entry keeps; Wowhead's English only checks it. */
async function fetchNpc({ id, mdtName }) {
  const entries = await fetchLocales('npc', id, parseNpcTooltip)
  return entries ? { id, ...buildNpcText(id, mdtName, entries) } : { id, missing: true }
}

async function downloadTo(url, dest) {
  if (!FORCE && fs.existsSync(dest)) return 'cached'
  const res = await fetchRetry(url)
  if (!res) return 'missing'
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
  return 'downloaded'
}

/**
 * A label cache, and the refusal to run against one that has never seen a configured language.
 *
 * An entry with no `text` block predates localization and has to be redone. A missing
 * *secondary* locale, on the other hand, is not a signal — Wowhead does not translate
 * everything — so the per-entry check below only looks at the base language.
 *
 * That leniency would otherwise let a newly configured language pass unnoticed: every entry
 * still looks current, the run reports "0 to fetch" and succeeds, and the app falls back to
 * the base language for the whole pool without anyone being told. Hence
 * **adding a language to WOWHEAD_LOCALES requires a `FORCE=1`**, and hence this refusal when
 * someone forgets.
 */
function loadLabelCache(file, langs) {
  const cache = !FORCE && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  const never = unfetchedLocales(cache, langs)
  if (never.length && Object.keys(cache).length) {
    throw new Error(
      `${path.basename(file)} holds no ${never.join(', ')} label at all. A language added to ` +
        'WOWHEAD_LOCALES needs a full pass: FORCE=1 npm run fetch:assets',
    )
  }
  return cache
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

  const spellIds = collectSpellIds(dungeons)
  const displayIds = [...new Set(dungeons.flatMap((d) => d.enemies.map((e) => e.displayId).filter(Boolean)))]
  // Keyed by id: the same creature stands in more than one dungeon, under the same MDT name.
  const mobs = [
    ...new Map(
      dungeons.flatMap((d) => d.enemies).map((e) => [e.id, { id: e.id, mdtName: e.name }]),
    ).values(),
  ]

  const isCurrent = (entry) => Boolean(entry?.text?.[WOWHEAD_LOCALES[0].lang])
  const langs = WOWHEAD_LOCALES.map((l) => l.lang)

  // --- Spells ------------------------------------------------------------
  const cache = loadLabelCache(SPELL_CACHE, langs)
  const todo = spellIds.filter((id) => !isCurrent(cache[String(id)]))
  console.log(`Spells: ${spellIds.length} unique, ${todo.length} to fetch (${langs.join(', ')})`)

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

  // --- Creature labels ---------------------------------------------------
  const npcCache = loadLabelCache(NPC_CACHE, langs)
  const npcTodo = mobs.filter((m) => !isCurrent(npcCache[String(m.id)]))
  console.log(`Creatures: ${mobs.length} unique, ${npcTodo.length} to fetch (${langs.join(', ')})`)

  done = 0
  const npcResults = await pool(npcTodo, CONCURRENCY, async (mob) => {
    const npc = await fetchNpc(mob)
    if (!npc.missing) npcCache[String(npc.id)] = { id: npc.id, text: npc.text }
    if (++done % 50 === 0) process.stdout.write(`  ${done}/${npcTodo.length}\r`)
    return npc
  })
  const missingNpcs = npcResults.filter((n) => n.missing || n.error)
  const npcWarnings = npcResults.flatMap((n) => n.warnings ?? [])
  fs.writeFileSync(NPC_CACHE, JSON.stringify(npcCache, null, 1), 'utf8')
  console.log(`  ${Object.keys(npcCache).length} creatures cached${missingNpcs.length ? `, ${missingNpcs.length} unresolved` : ''}`)
  if (npcWarnings.length) {
    // A name disagreement is the one worth stopping over: it means a wrong id, not a wording.
    console.log(`  ${npcWarnings.length} to look at:`)
    for (const w of npcWarnings) console.log(`    ${w}`)
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
  if (missingNpcs.length) {
    console.log(`\nUnresolved creatures (rendered with MDT's English name): ${missingNpcs.map((n) => n.id).join(', ')}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
