/**
 * Generates the missing markdown cards in `content/`.
 *
 * This is what makes the codex sustainable: a file is never created by hand. The script
 * pre-fills everything mechanical (npcId, name, forces, CC, the spell list with names and
 * cast times) and leaves blank only what takes human judgement.
 *
 * An existing file is NEVER overwritten — re-running the script after an MDT update only
 * adds the new mobs.
 *
 * Stubs are written in the base language (`SPELL_LOCALES[0]`). A translation is a separate
 * `<name>.<locale>.md` file carrying text only — see the `i18n` skill.
 */

import fs from 'node:fs'
import path from 'node:path'
import { CONTENT_DIR, GENERATED_DIR, SPELL_LOCALES } from './config.mjs'

const BASE_LANG = SPELL_LOCALES[0].lang

const TIMERS = {
  // Minutes on the M+ timer. The ones we do not know stay empty, to be filled by hand.
  'murder-row': 34,
  'ruby-life-pools': 28,
}

/** Escapes a value for a double-quoted YAML scalar. */
const yamlString = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

function loadSpells() {
  const file = path.join(GENERATED_DIR, 'spells.json')
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
}

/** Spell labels in the base language — that is what the stubs quote. */
const spellText = (spells, id) => spells[String(id)]?.text?.[BASE_LANG]

function mobFileName(enemy) {
  const slug = enemy.name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${enemy.id}-${slug || 'mob'}.md`
}

function buildMobStub(enemy, spells) {
  const lines = ['---']
  lines.push(`npcId: ${enemy.id}`)
  lines.push(`name: ${yamlString(enemy.name)}   # auto`)
  lines.push(`count: ${enemy.count}   # auto — forces per unit`)
  if (enemy.isBoss) lines.push('isBoss: true   # auto')
  lines.push('')
  lines.push('# TO FILL IN: low | medium | high | lethal')
  lines.push('threat:')
  lines.push('# TO FILL IN: caster | melee | patrol | miniboss')
  lines.push('role:')

  if (enemy.cc.length) {
    lines.push(`# Applicable CC (auto, from MDT): ${enemy.cc.join(', ')}`)
  }

  if (enemy.spells.length) {
    lines.push('')
    lines.push('spells:')
    for (const s of enemy.spells) {
      const info = spellText(spells, s.id)
      lines.push(`  - id: ${s.id}`)
      if (info?.name) lines.push(`    name: ${yamlString(info.name)}   # auto`)
      const facts = [info?.castTime, info?.range, s.dispel?.length ? `dispel: ${s.dispel.join('/')}` : null]
        .filter(Boolean)
        .join(' · ')
      if (facts) lines.push(`    # ${facts}`)
      lines.push('    # tag: kick | dodge | dispel | tank | soak | ignore')
      lines.push('    tag: todo')
      lines.push('    note:')
    }
  }

  lines.push('')
  lines.push('# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.')
  lines.push('trap:')
  lines.push('---')
  lines.push('')
  lines.push(`<!-- Free prose: positioning, focus order, cooldowns. -->`)
  lines.push('')
  return lines.join('\n')
}

function buildDungeonStub(dungeon) {
  const timer = TIMERS[dungeon.slug]
  return [
    '---',
    `name: ${yamlString(dungeon.englishName)}   # auto`,
    `# M+ timer in minutes${timer ? '' : ' — TO FILL IN'}`,
    `timer:${timer ? ` ${timer}` : ''}`,
    '# One sentence summing the dungeon up, shown on the home page.',
    'summary:',
    '---',
    '',
    '## Route plan',
    '',
    '<!-- Pack order, skips, where to drop bloodlust. -->',
    '',
    '## Affixes',
    '',
    '<!-- What changes week to week. -->',
    '',
  ].join('\n')
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

    const dungeonFile = path.join(dir, '_dungeon.md')
    if (!fs.existsSync(dungeonFile)) {
      fs.writeFileSync(dungeonFile, buildDungeonStub(dungeon), 'utf8')
      created++
    } else kept++

    // The same NPC can appear several times in dungeonEnemies (variants): one card is enough.
    const seen = new Set()
    for (const enemy of dungeon.enemies) {
      if (seen.has(enemy.id)) continue
      seen.add(enemy.id)
      const file = path.join(dir, mobFileName(enemy))
      if (fs.existsSync(file)) {
        kept++
        continue
      }
      fs.writeFileSync(file, buildMobStub(enemy, spells), 'utf8')
      created++
    }

    console.log(`${dungeon.englishName.padEnd(22)} ${seen.size} mob cards`)
  }

  console.log(`\n${created} files created, ${kept} kept (never overwritten).`)
  console.log(`Edit them in ${path.relative(process.cwd(), CONTENT_DIR)}/`)
}

main()
