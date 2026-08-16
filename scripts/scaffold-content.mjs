/**
 * Génère les fiches markdown manquantes dans `content/`.
 *
 * C'est ce qui rend le codex tenable : on ne crée jamais un fichier à la main. Le script
 * pré-remplit tout le mécanique (npcId, nom, forces, CC, liste des sorts avec leurs noms et
 * temps d'incantation) et laisse en blanc uniquement ce qui demande un jugement humain.
 *
 * Un fichier existant n'est JAMAIS écrasé — relancer le script après une mise à jour de MDT
 * ne fait qu'ajouter les nouveaux mobs.
 */

import fs from 'node:fs'
import path from 'node:path'
import { CONTENT_DIR, GENERATED_DIR } from './config.mjs'

const TIMERS = {
  // Minutes du chrono M+. Ceux qu'on ne connaît pas restent vides, à compléter à la main.
  'murder-row': 34,
  'ruby-life-pools': 28,
}

/** Échappe une valeur pour une scalaire YAML entre guillemets. */
const yamlString = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

function loadSpells() {
  const file = path.join(GENERATED_DIR, 'spells.json')
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
}

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
  lines.push(`count: ${enemy.count}   # auto — forces par unité`)
  if (enemy.isBoss) lines.push('isBoss: true   # auto')
  lines.push('')
  lines.push('# À REMPLIR : low | medium | high | lethal')
  lines.push('threat:')
  lines.push('# À REMPLIR : caster | melee | patrol | miniboss')
  lines.push('role:')

  if (enemy.cc.length) {
    lines.push(`# CC applicables (auto, depuis MDT) : ${enemy.cc.join(', ')}`)
  }

  if (enemy.spells.length) {
    lines.push('')
    lines.push('spells:')
    for (const s of enemy.spells) {
      const info = spells[String(s.id)]
      lines.push(`  - id: ${s.id}`)
      if (info?.name) lines.push(`    name: ${yamlString(info.name)}   # auto`)
      const facts = [info?.castTime, info?.range, s.dispel?.length ? `dispel: ${s.dispel.join('/')}` : null]
        .filter(Boolean)
        .join(' · ')
      if (facts) lines.push(`    # ${facts}`)
      lines.push('    # tag : kick | dodge | dispel | tank | soak | ignore')
      lines.push('    tag: todo')
      lines.push('    note:')
    }
  }

  lines.push('')
  lines.push('# Le piège : la phrase qui évite le wipe. Laisser vide si le mob est sans danger.')
  lines.push('trap:')
  lines.push('---')
  lines.push('')
  lines.push(`<!-- Prose libre : positionnement, ordre de focus, cooldowns. -->`)
  lines.push('')
  return lines.join('\n')
}

function buildDungeonStub(dungeon) {
  const timer = TIMERS[dungeon.slug]
  return [
    '---',
    `name: ${yamlString(dungeon.englishName)}   # auto`,
    `# Chrono M+ en minutes${timer ? '' : ' — À REMPLIR'}`,
    `timer:${timer ? ` ${timer}` : ''}`,
    '# Une phrase qui résume le donjon, affichée sur la page d\'accueil.',
    'summary:',
    '---',
    '',
    '## Plan de route',
    '',
    '<!-- Ordre des packs, skips, positionnement des bloodlust. -->',
    '',
    '## Affixes',
    '',
    '<!-- Ce qui change selon la semaine. -->',
    '',
  ].join('\n')
}

function main() {
  const indexFile = path.join(GENERATED_DIR, 'dungeons.json')
  if (!fs.existsSync(indexFile)) throw new Error("Lance d'abord `npm run extract`.")

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

    // Un même NPC peut apparaître plusieurs fois dans dungeonEnemies (variantes) : une fiche suffit.
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

    console.log(`${dungeon.englishName.padEnd(22)} ${seen.size} fiches de mob`)
  }

  console.log(`\n${created} fichiers créés, ${kept} conservés (jamais écrasés).`)
  console.log(`Édite-les dans ${path.relative(process.cwd(), CONTENT_DIR)}/`)
}

main()
