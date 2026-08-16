/**
 * Indicateurs d'un mob : ce qu'on affiche en pastilles sur la carte et dans le codex.
 *
 * Deux sources se combinent. MDT sait déjà quels sorts sont **interruptibles** (75 sorts, 62
 * mobs) et quels sorts portent un **type de dispel** (108 sorts) : ces deux badges sont donc
 * corrects dès la première ouverture, sans rien rédiger. Le tank buster et la cible
 * prioritaire n'ont aucune source exploitable — ils viennent du frontmatter, et leur absence
 * signifie « pas encore jugé », pas « inoffensif ».
 */

import type { Enemy } from './types'
import { getMobContent, type Threat } from './content'
import { getSpell } from './data'

export interface MobIndicators {
  threat?: Threat
  /** Au moins un sort à couper. */
  kick: boolean
  kickSpells: number[]
  /** Types de dispel présents sur ses sorts (magic, curse, enrage…). */
  dispel: string[]
  /** Gros coup sur le tank — déclaré via `tag: tank` dans le frontmatter. */
  tankBuster: boolean
  /** À focus en priorité : boss, miniboss, ou menace élevée. */
  priority: boolean
  hasTrap: boolean
  /** Couleur de l'anneau du blip sur la carte. */
  ring: string
}

const THREAT_RING: Record<Threat, string> = {
  low: '#5b8f6a',
  medium: '#c9992f',
  high: '#d97036',
  lethal: '#cf3f52',
}

const NEUTRAL_RING = 'rgba(180,190,210,0.75)'
const BOSS_RING = '#e0b552'

const cache = new Map<string, MobIndicators>()

export function getIndicators(slug: string, enemy: Enemy): MobIndicators {
  const key = `${slug}/${enemy.id}`
  const hit = cache.get(key)
  if (hit) return hit

  const content = getMobContent(slug, enemy.id)
  const notes = new Map((content?.spells ?? []).map((s) => [Number(s.id), s]))

  const kickSpells: number[] = []
  const dispel = new Set<string>()

  for (const spell of enemy.spells) {
    const note = notes.get(spell.id)
    // MDT marque explicitement l'interruptibilité ; une annotation manuelle prime.
    if (spell.interruptible || note?.tag === 'kick') kickSpells.push(spell.id)
    for (const d of spell.dispel ?? []) dispel.add(d)
    if (note?.tag === 'dispel') dispel.add('manuel')
  }

  const tankBuster = [...notes.values()].some((n) => n.tag === 'tank')
  const threat = content?.threat
  const priority =
    enemy.isBoss === true ||
    content?.role === 'miniboss' ||
    threat === 'lethal' ||
    threat === 'high'

  const indicators: MobIndicators = {
    threat,
    kick: kickSpells.length > 0,
    kickSpells,
    dispel: [...dispel],
    tankBuster,
    priority,
    hasTrap: Boolean(content?.trap),
    ring: enemy.isBoss ? BOSS_RING : threat ? THREAT_RING[threat] : NEUTRAL_RING,
  }

  cache.set(key, indicators)
  return indicators
}

/** Sorts à couper, triés par priorité déclarée puis par nom — pour le briefing de pull. */
export function kickList(slug: string, enemy: Enemy): { id: number; name: string; prio?: number }[] {
  const content = getMobContent(slug, enemy.id)
  const notes = new Map((content?.spells ?? []).map((s) => [Number(s.id), s]))
  return getIndicators(slug, enemy)
    .kickSpells.map((id) => ({
      id,
      name: getSpell(id)?.name ?? `Sort ${id}`,
      prio: notes.get(id)?.prio,
    }))
    .sort((a, b) => (a.prio ?? 99) - (b.prio ?? 99) || a.name.localeCompare(b.name))
}
