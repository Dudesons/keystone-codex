// ABOUTME: Creates the content/ markdown cards that are missing after an MDT update.
// ABOUTME: Reads and writes only; what to build and what to skip lives in content-stub.mjs.

/**
 * Generates the missing markdown cards in `content/`.
 *
 * This is what makes the codex sustainable: a file is never created by hand. The script
 * pre-fills everything mechanical (npcId, name, forces, CC, the spell list with names and
 * cast times) and leaves blank only what takes human judgement.
 *
 * An existing file is NEVER overwritten — re-running the script after an MDT update only
 * adds the new mobs. That decision lives in `content-stub.mjs`, where it is tested without a
 * filesystem; this file only reads and writes.
 *
 * Stubs are written in the base language (`SPELL_LOCALES[0]`). A translation is a separate
 * `<name>.<locale>.md` file carrying text only — see the `i18n` skill.
 */

import fs from 'node:fs'
import path from 'node:path'
import { CONTENT_DIR, GENERATED_DIR } from './config.mjs'
import { scaffoldPlan } from './content-stub.mjs'

function loadSpells() {
  const file = path.join(GENERATED_DIR, 'spells.json')
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
}

function main() {
  const indexFile = path.join(GENERATED_DIR, 'dungeons.json')
  if (!fs.existsSync(indexFile)) throw new Error('Run `npm run extract` first.')

  const spells = loadSpells()
  const dungeons = JSON.parse(fs.readFileSync(indexFile, 'utf8'))

  let created = 0
  let kept = 0

  for (const summary of dungeons) {
    const dungeon = JSON.parse(fs.readFileSync(path.join(GENERATED_DIR, `${summary.slug}.json`), 'utf8'))
    const dir = path.join(CONTENT_DIR, dungeon.slug)
    fs.mkdirSync(dir, { recursive: true })

    const plan = scaffoldPlan(dungeon, spells, (name) => fs.existsSync(path.join(dir, name)))
    for (const file of plan.create) {
      fs.writeFileSync(path.join(dir, file.name), file.content, 'utf8')
    }

    created += plan.create.length
    kept += plan.kept
    console.log(`${dungeon.englishName.padEnd(22)} ${plan.mobs} mob cards`)
  }

  console.log(`\n${created} files created, ${kept} kept (never overwritten).`)
  console.log(`Edit them in ${path.relative(process.cwd(), CONTENT_DIR)}/`)
}

main()
