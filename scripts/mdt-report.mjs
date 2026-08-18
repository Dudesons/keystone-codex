// ABOUTME: Reports what an MDT update changed and what it costs the cards under content/.
// ABOUTME: Reads git and the filesystem only; every rule lives in the pure modules beside it.

/**
 * What an MDT update changed, and what it costs the codex.
 *
 * The base is git: the repository already requires the generated files to be committed after a
 * `npm run data`, because CI runs no extraction and the live site moves only when they are
 * versioned. `HEAD` is therefore the pre-update state by construction, and no snapshot step can be
 * forgotten. `--base <rev>` compares against anything else.
 *
 * This file reads and writes. Everything it decides was decided in mdt-diff.mjs, card-audit.mjs,
 * card-auto-fields.mjs and mdt-report-md.mjs, where it is tested without WoW and without a
 * filesystem.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { CONTENT_DIR, GENERATED_DIR, ROOT, WOWHEAD_LOCALES } from './config.mjs'
import { diffDungeon, diffSpells, labelTableFindings } from './mdt-diff.mjs'
import { annotatedSpellIds, auditDungeon, readCardFacts } from './card-audit.mjs'
import { autoFieldFindings, refreshAutoFields } from './card-auto-fields.mjs'
import { renderReport, reportFileName, summariseFindings } from './mdt-report-md.mjs'

const RELEASES_URL = 'https://github.com/Nnoggie/MythicDungeonTools/releases'
const REPORT_DIR = path.join(ROOT, 'docs', 'mdt-updates')
const BASE_LANG = WOWHEAD_LOCALES[0].lang

function parseArgs(argv) {
  const args = { base: 'HEAD', apply: false, force: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i]
    else if (argv[i] === '--apply') args.apply = true
    else if (argv[i] === '--force') args.force = true
    else throw new Error(`Unknown argument: ${argv[i]}`)
  }
  if (!args.base) throw new Error('--base needs a revision')
  return args
}

/**
 * Refuses a revision git does not know, before anything is read or written.
 *
 * `showAtRev` cannot tell a mistyped revision from a file that genuinely did not exist there:
 * both come back null. Left unchecked, a typo in `--base` makes every one of the eight dungeons
 * look new, names the base version `unknown`, and produces a confident report about an update
 * that was never compared to anything.
 */
function requireRev(rev) {
  try {
    execFileSync('git', ['rev-parse', '--verify', rev], { cwd: ROOT, stdio: 'pipe' })
  } catch {
    throw new Error(`--base ${rev}: git does not know that revision. Nothing was read or written.`)
  }
}

/** A tracked file as of `rev`, or null when it did not exist there. */
function showAtRev(rev, repoPath) {
  try {
    return execFileSync('git', ['show', `${rev}:${repoPath}`], { cwd: ROOT, encoding: 'utf8' })
  } catch {
    return null
  }
}

const readJsonAtRev = (rev, repoPath) => {
  const raw = showAtRev(rev, repoPath)
  return raw ? JSON.parse(raw) : null
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

/** Every card of one dungeon, base files and translations alike, parsed into facts. */
function readCards(slug) {
  const dir = path.join(CONTENT_DIR, slug)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('_'))
    .map((name) => {
      const facts = readCardFacts(fs.readFileSync(path.join(dir, name), 'utf8'), `content/${slug}/${name}`)
      if (!facts) console.warn(`  ! ${slug}/${name}: no usable npcId, skipped`)
      return facts
    })
    .filter(Boolean)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  requireRev(args.base)

  const index = readJson(path.join(GENERATED_DIR, 'dungeons.json'))
  const currentMeta = fs.existsSync(path.join(GENERATED_DIR, 'mdt.json'))
    ? readJson(path.join(GENERATED_DIR, 'mdt.json'))
    : { version: null }
  const baseMeta = readJsonAtRev(args.base, 'src/data/generated/mdt.json') ?? { version: null }

  if (baseMeta.version && baseMeta.version === currentMeta.version) {
    console.warn(
      `  ! ${args.base} and the working tree both report MDT ${currentMeta.version}.\n` +
        `    Either nothing was updated, or ${args.base} is not a pre-update state.`,
    )
  }

  // Checked before anything on disk is touched: a refusal that fires after --apply has already
  // rewritten cards is not a refusal.
  const date = new Date().toISOString().slice(0, 10)
  const name = reportFileName({ date, from: baseMeta.version, to: currentMeta.version })
  const out = path.join(REPORT_DIR, name)

  fs.mkdirSync(REPORT_DIR, { recursive: true })
  if (fs.existsSync(out) && !args.force) {
    throw new Error(
      `${path.relative(ROOT, out)} already exists.\n` +
        `Its ticked checkboxes are a human mark, not derived output. Pass --force to replace it.`,
    )
  }

  const findings = []
  const allCards = []

  for (const summary of index) {
    const slug = summary.slug
    const after = readJson(path.join(GENERATED_DIR, `${slug}.json`))
    const before = readJsonAtRev(args.base, `src/data/generated/${slug}.json`)
    const cards = readCards(slug)
    allCards.push(...cards)

    findings.push(...diffDungeon(before, after))
    findings.push(...auditDungeon(after, cards))

    const byId = new Map(after.enemies.map((e) => [e.id, e]))
    for (const card of cards) {
      const enemy = byId.get(card.npcId)
      // Only the base-language card carries `# auto` fields; a translation carries text alone.
      if (!enemy || card.locale !== BASE_LANG) continue
      const file = path.join(ROOT, card.file)
      const { text, changes } = refreshAutoFields(fs.readFileSync(file, 'utf8'), enemy)
      findings.push(...autoFieldFindings(text, enemy, card.file, slug))
      if (!changes.length) continue

      if (args.apply) {
        fs.writeFileSync(file, text, 'utf8')
        console.log(`  ~ ${card.file}: ${changes.map((c) => c.field).join(', ')}`)
      } else {
        for (const c of changes) {
          console.log(`  · ${card.file}: ${c.field} ${c.before} -> ${c.after} (use --apply)`)
        }
      }
    }
  }

  const annotated = annotatedSpellIds(allCards)
  const baseSpellsRaw = showAtRev(args.base, 'src/data/generated/spells.json')
  if (baseSpellsRaw) {
    const spellsPath = path.join(GENERATED_DIR, 'spells.json')
    const afterSpellsRaw = fs.readFileSync(spellsPath, 'utf8')
    findings.push(...labelTableFindings(baseSpellsRaw, afterSpellsRaw))
    findings.push(...diffSpells(JSON.parse(baseSpellsRaw), JSON.parse(afterSpellsRaw), annotated))
  } else {
    console.warn(
      `  ! ${args.base} has no src/data/generated/spells.json: spell labels could not be compared.`,
    )
  }

  fs.writeFileSync(
    out,
    renderReport({
      findings,
      base: args.base,
      from: baseMeta.version,
      to: currentMeta.version,
      date,
      releasesUrl: RELEASES_URL,
    }),
    'utf8',
  )

  console.log(`\nMDT ${baseMeta.version ?? 'unknown'} -> ${currentMeta.version ?? 'unknown'}`)
  console.log('dungeon'.padEnd(22) + ' 1   2   3   4   5   6')
  for (const row of summariseFindings(findings)) {
    const c = row.counts
    console.log(
      row.dungeon.padEnd(22) +
        [1, 2, 3, 4, 5, 6].map((s) => String(c[s]).padStart(3)).join(' '),
    )
  }
  console.log(`\n${findings.length} findings written to ${path.relative(ROOT, out)}`)
}

main()
