// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getLookup } from '../../lib/data'
import { renderEn } from '../../test/render'
import CodexPanel, { type PullRef } from './CodexPanel'

afterEach(cleanup)

beforeAll(() => {
  // jsdom n'implémente pas scrollIntoView : le panneau l'appelle pour suivre la carte.
  Element.prototype.scrollIntoView = () => {}
})

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!

const props = (over: Partial<React.ComponentProps<typeof CodexPanel>> = {}) => ({
  slug: SLUG,
  lookup,
  selectedPack: null,
  selectedMob: null,
  focusNpc: null,
  pullByNpc: new Map<number, PullRef>(),
  onSelectMob: () => {},
  onHoverMob: () => {},
  onClearSelection: () => {},
  ...over,
})

describe('Vue par défaut', () => {
  it('affiche le plan de route du donjon', () => {
    const { container } = renderEn(<CodexPanel {...props()} />)
    expect(container.textContent).toContain('Route plan')
  })

  it('sépare les boss du trash', () => {
    renderEn(<CodexPanel {...props()} />)
    // « BOSS » est aussi le marqueur porté par chaque fiche : on vise le titre de section.
    expect(screen.getByRole('heading', { name: 'BOSSES' })).toBeDefined()
    expect(screen.getByRole('heading', { name: /^TRASH ·/ })).toBeDefined()
  })

  it('dédoublonne le trash par npcId : un mob présent dans dix packs n\'apparaît qu\'une fois', () => {
    renderEn(<CodexPanel {...props()} />)
    const attendu = new Set(lookup.dungeon.enemies.filter((e) => !e.isBoss).map((e) => e.id)).size
    expect(screen.getByText(`TRASH · ${attendu} mobs`)).toBeDefined()
  })

  it('remonte la sélection au clic sur une fiche', () => {
    const vus: (number | null)[] = []
    const { container } = renderEn(<CodexPanel {...props({ onSelectMob: (id) => vus.push(id) })} />)
    fireEvent.click(container.querySelector('article header')!)
    expect(vus).toHaveLength(1)
    expect(typeof vus[0]).toBe('number')
  })
})

describe('Pack sélectionné', () => {
  const pack = [...lookup.packs.entries()][0]
  const [g, data] = pack

  it('titre le pack et résume ses forces', () => {
    renderEn(<CodexPanel {...props({ selectedPack: g })} />)
    expect(screen.getByText(`Pack ${g}`)).toBeDefined()
    expect(screen.getByText(`${data.count} forces · ${data.members.length} units`)).toBeDefined()
  })

  it('signale les mobs présents plusieurs fois dans le pack', () => {
    // Pack 5 d'altar-of-fangs : 4 unités pour 3 mobs distincts.
    const { container } = renderEn(<CodexPanel {...props({ selectedPack: 5 })} />)
    expect(container.textContent).toMatch(/×\d+ in this pack/)
  })

  it('ferme la sélection', () => {
    let fermé = false
    renderEn(<CodexPanel {...props({ selectedPack: g, onClearSelection: () => { fermé = true } })} />)
    fireEvent.click(screen.getByText('Close'))
    expect(fermé).toBe(true)
  })

  it('reste affichable pour un pack inconnu, sans forces', () => {
    renderEn(<CodexPanel {...props({ selectedPack: 99_999 })} />)
    expect(screen.getByText('Pack 99999')).toBeDefined()
    expect(screen.getByText('0 forces · 0 units')).toBeDefined()
  })
})

describe('Mob sélectionné', () => {
  const enemy = lookup.dungeon.enemies[0]

  it('n\'affiche que sa fiche, en entier', () => {
    const { container } = renderEn(<CodexPanel {...props({ selectedMob: enemy.id })} />)
    expect(container.querySelectorAll('article')).toHaveLength(1)
    expect(container.textContent).toContain(enemy.name)
  })

  it('offre un retour à la liste', () => {
    const vus: (number | null)[] = []
    renderEn(<CodexPanel {...props({ selectedMob: enemy.id, onSelectMob: (id) => vus.push(id) })} />)
    fireEvent.click(screen.getByText('← Back'))
    expect(vus).toEqual([null])
  })

  it('retombe sur la liste complète si le mob est introuvable', () => {
    renderEn(<CodexPanel {...props({ selectedMob: 999_999 })} />)
    expect(screen.getByRole('heading', { name: 'BOSSES' })).toBeDefined()
  })
})

describe('Route en cours', () => {
  it('marque chaque mob du numéro de pull qui le contient', () => {
    const enemy = lookup.dungeon.enemies.find((e) => !e.isBoss)!
    const pullByNpc = new Map<number, PullRef>([[enemy.id, { index: 2, color: 'ff3eff' }]])
    renderEn(<CodexPanel {...props({ pullByNpc })} />)
    expect(screen.getAllByTitle('Pull 3').length).toBeGreaterThan(0)
  })

  it('n\'affiche aucun numéro sans route', () => {
    renderEn(<CodexPanel {...props()} />)
    expect(screen.queryByTitle(/^Pull /)).toBeNull()
  })
})

describe('Suivi de la carte', () => {
  it('accepte un focus sur un mob sans casser le rendu', () => {
    const enemy = lookup.dungeon.enemies[0]
    const { container } = renderEn(<CodexPanel {...props({ focusNpc: enemy.id })} />)
    expect(container.querySelector(`[data-npc="${enemy.id}"]`)).not.toBeNull()
  })

  it('accepte un focus sur un mob absent du panneau', () => {
    const { container } = renderEn(<CodexPanel {...props({ focusNpc: 999_999 })} />)
    expect(container.textContent).toContain('BOSSES')
  })
})
