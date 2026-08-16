/**
 * Récupère les illustrations et les libellés de sorts.
 *
 * MDT ne stocke que des IDs de sorts et des `displayId` de créatures : les noms, icônes et
 * descriptions viennent du jeu à l'exécution, ce qu'on ne peut pas faire sur le web. On les
 * résout donc une fois au build via Wowhead, et on met tout en cache dans des fichiers
 * versionnés — le script ne re-télécharge que ce qui manque.
 *
 *   npm run fetch:assets          # complète ce qui manque
 *   FORCE=1 npm run fetch:assets  # re-télécharge tout (nouveau patch)
 */

import fs from 'node:fs'
import path from 'node:path'
import { GENERATED_DIR, PUBLIC_DIR } from './config.mjs'

const FORCE = process.env.FORCE === '1'
const CONCURRENCY = 8
const SPELL_CACHE = path.join(GENERATED_DIR, 'spells.json')
const ICON_DIR = path.join(PUBLIC_DIR, 'icons')
const PORTRAIT_DIR = path.join(PUBLIC_DIR, 'portraits')

/** Exécute `worker` sur chaque item avec un pool de taille fixe. */
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
      // 404 = ressource absente pour de bon, inutile d'insister.
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
 * Extrait durée d'incantation, portée et description du tooltip Wowhead.
 * Structure : un premier tableau `nom<br/>[portée<br/>]temps`, puis un `<div class="q">`
 * qui porte la description.
 */
function parseTooltip(html) {
  const out = {}

  const header = /<table>.*?<td>(.*?)<\/td>/s.exec(html)
  if (header) {
    const lines = stripTags(header[1]).split('\n').map((l) => l.trim()).filter(Boolean)
    for (const line of lines.slice(1)) {
      if (/range$/i.test(line)) out.range = line
      else if (/cast$/i.test(line) || /^instant$/i.test(line) || /channel/i.test(line)) out.castTime = line
    }
  }

  const desc = /<div class="q[0-9]?">(.*?)<\/div>/s.exec(html)
  if (desc) out.description = stripTags(desc[1])

  return out
}

async function fetchSpell(id) {
  const res = await fetchRetry(`https://nether.wowhead.com/tooltip/spell/${id}?dataEnv=1&locale=0`)
  if (!res) return { id, missing: true }
  const json = await res.json()
  if (!json?.name) return { id, missing: true }
  return {
    id,
    name: json.name,
    icon: json.icon,
    ...parseTooltip(json.tooltip || ''),
  }
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
    throw new Error("Lance d'abord `npm run extract`.")
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

  // --- Sorts -------------------------------------------------------------
  const cache = !FORCE && fs.existsSync(SPELL_CACHE) ? JSON.parse(fs.readFileSync(SPELL_CACHE, 'utf8')) : {}
  const todo = spellIds.filter((id) => !cache[String(id)])
  console.log(`Sorts : ${spellIds.length} uniques, ${todo.length} à récupérer`)

  let done = 0
  const spellResults = await pool(todo, CONCURRENCY, async (id) => {
    const spell = await fetchSpell(id)
    if (!spell.missing) cache[String(id)] = spell
    if (++done % 50 === 0) process.stdout.write(`  ${done}/${todo.length}\r`)
    return spell
  })
  const missingSpells = spellResults.filter((s) => s.missing || s.error)
  fs.writeFileSync(SPELL_CACHE, JSON.stringify(cache, null, 1), 'utf8')
  console.log(`  ${Object.keys(cache).length} sorts en cache${missingSpells.length ? `, ${missingSpells.length} non résolus` : ''}`)

  // --- Icônes ------------------------------------------------------------
  const icons = [...new Set(Object.values(cache).map((s) => s.icon).filter(Boolean))]
  const iconResults = await pool(icons, CONCURRENCY, (icon) =>
    downloadTo(`https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`, path.join(ICON_DIR, `${icon}.jpg`)),
  )
  const iconsOk = iconResults.filter((r) => r === 'downloaded' || r === 'cached').length
  console.log(`Icônes : ${iconsOk}/${icons.length}`)

  // --- Portraits de créatures -------------------------------------------
  // Chemin des vignettes du model viewer : le dossier est displayId % 256.
  const portraitResults = await pool(displayIds, CONCURRENCY, (id) =>
    downloadTo(
      `https://wow.zamimg.com/modelviewer/live/webthumbs/npc/${id % 256}/${id}.webp`,
      path.join(PORTRAIT_DIR, `${id}.webp`),
    ),
  )
  const portraitsOk = portraitResults.filter((r) => r === 'downloaded' || r === 'cached').length
  console.log(`Portraits : ${portraitsOk}/${displayIds.length}`)

  const weight = (dir) =>
    fs.readdirSync(dir).reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0) / 1024 / 1024
  console.log(`\nPoids : icônes ${weight(ICON_DIR).toFixed(1)} Mo, portraits ${weight(PORTRAIT_DIR).toFixed(1)} Mo`)

  if (missingSpells.length) {
    console.log(`\nSorts non résolus (affichés avec leur ID brut) : ${missingSpells.map((s) => s.id).join(', ')}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
