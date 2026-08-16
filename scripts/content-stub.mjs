/**
 * Building the markdown stubs, and deciding which ones to write.
 *
 * Separated from the writing so the invariant that matters can be tested without a
 * filesystem: **an existing card is never overwritten**. Re-running the scaffold after an MDT
 * update adds the new mobs and touches nothing else — someone's written judgement is the one
 * thing in this repository that cannot be regenerated.
 */

import { SPELL_LOCALES } from './config.mjs'

const BASE_LANG = SPELL_LOCALES[0].lang

export const TIMERS = {
  // Minutes on the M+ timer. The ones we do not know stay empty, to be filled by hand.
  'murder-row': 34,
  'ruby-life-pools': 28,
}

/** Escapes a value for a double-quoted YAML scalar. */
export const yamlString = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** Spell labels in the base language — that is what the stubs quote. */
export const spellText = (spells, id) => spells[String(id)]?.text?.[BASE_LANG]

export function mobFileName(enemy) {
  const slug = enemy.name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${enemy.id}-${slug || 'mob'}.md`
}

export function buildMobStub(enemy, spells) {
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

export function buildDungeonStub(dungeon) {
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

/**
 * What the scaffold would write for one dungeon.
 *
 * `exists(name)` answers for a filename inside that dungeon's folder. Nothing is written
 * here: a name that already exists is counted and skipped, never rebuilt.
 */
export function scaffoldPlan(dungeon, spells, exists) {
  const create = []
  let kept = 0

  if (exists('_dungeon.md')) kept++
  else create.push({ name: '_dungeon.md', content: buildDungeonStub(dungeon) })

  // The same NPC can appear several times in dungeonEnemies (variants): one card is enough.
  const seen = new Set()
  for (const enemy of dungeon.enemies) {
    if (seen.has(enemy.id)) continue
    seen.add(enemy.id)

    const name = mobFileName(enemy)
    if (exists(name)) {
      kept++
      continue
    }
    create.push({ name, content: buildMobStub(enemy, spells) })
  }

  return { create, kept, mobs: seen.size }
}
