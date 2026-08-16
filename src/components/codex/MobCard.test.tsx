// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

// Sans `globals: true`, Testing Library n'enregistre pas son nettoyage automatique :
// les rendus s'accumuleraient dans le document et fausseraient les requêtes `screen`.
afterEach(cleanup)
import type { Enemy } from '../../lib/types'
import { dungeonList, getDungeon, getLookup } from '../../lib/data'
import { renderEn, renderFr } from '../../test/render'
import MobCard from './MobCard'

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!

/** Ritual Chieftain : menace « high », piège, et des sorts annotés kick / tank / dodge. */
const chieftain = lookup.dungeon.enemies.find((e) => e.id === 270_306)!
const boss = lookup.dungeon.enemies.find((e) => e.isBoss)!
const sansCc = lookup.dungeon.enemies.find((e) => e.cc.length === 0)!

/** Aucun mob d'altar-of-fangs ne déclare de CC : on cherche à l'échelle du pool. */
const avecCc = dungeonList
  .flatMap((d) => (getDungeon(d.slug)?.enemies ?? []).map((enemy) => ({ slug: d.slug, enemy })))
  .find(({ enemy }) => enemy.cc.length > 0)!

/** Mob synthétique, du type réel : sert aux cas que les données du pool ne contiennent pas. */
const inconnu: Enemy = {
  mdtIdx: 1,
  id: 888_001,
  name: 'Mob sans fiche',
  count: 0,
  health: 1000,
  level: 80,
  scale: 1,
  cc: [],
  spells: [{ id: 999_777 }],
  clones: [{ mdtIdx: 1, x: 0, y: 0, g: null, sublevel: 1 }],
}

describe('En-tête', () => {
  it('porte le npcId, pour que la carte puisse faire défiler jusqu\'à la fiche', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(container.querySelector(`[data-npc="${chieftain.id}"]`)).not.toBeNull()
  })

  it('affiche le nom du mob', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText(chieftain.name)).toBeDefined()
  })

  it('signale les boss', () => {
    renderEn(<MobCard slug={SLUG} enemy={boss} />)
    expect(screen.getByText('BOSS')).toBeDefined()
  })

  it('reprend la menace de la fiche', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText('Dangerous')).toBeDefined()
  })

  it('pose les pastilles KICK et TANK déduites des indicateurs', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    const entete = container.querySelector('header')!
    expect(entete.textContent).toContain('KICK')
    expect(entete.textContent).toContain('TANK')
  })

  it('annonce les forces et le nombre d\'unités', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(container.textContent).toContain(`${chieftain.count} forces`)
    expect(container.textContent).toMatch(/\d+ units?/)
  })

  it('écrit « no forces » plutôt que « 0 forces »', () => {
    const { container } = renderEn(<MobCard slug="donjon-sans-contenu" enemy={inconnu} />)
    expect(container.textContent).toContain('no forces')
  })

  it('affiche le numéro de pull quand la route en contient un', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} pullIndex={2} pullColor="ff3eff" />)
    expect(screen.getByTitle('Pull 3').textContent).toBe('3')
  })

  it('n\'affiche pas de numéro de pull sans route', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.queryByTitle(/^Pull /)).toBeNull()
  })
})

describe('Le piège', () => {
  it('met en avant le piège rédigé', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText('THE TRAP')).toBeDefined()
    // Motif resserré : la phrase « Immune to every CC » ouvre aussi le repli sans-CC.
    expect(screen.getByText(/no stun, no fear/)).toBeDefined()
  })

  it('sert le piège et les notes dans la langue choisie', () => {
    cleanup()
    renderFr(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText('LE PIÈGE')).toBeDefined()
    expect(screen.getByText(/aucun stun, aucune peur/)).toBeDefined()
  })

  it('n\'affiche pas de bloc piège quand rien n\'est rédigé', () => {
    renderEn(<MobCard slug="donjon-sans-contenu" enemy={inconnu} />)
    expect(screen.queryByText('THE TRAP')).toBeNull()
  })
})

describe('CC applicables', () => {
  it('liste les CC déclarés par MDT', () => {
    const { container } = renderEn(<MobCard slug={avecCc.slug} enemy={avecCc.enemy} />)
    expect(container.textContent).toContain('APPLICABLE CC')
    expect(container.textContent).toContain(avecCc.enemy.cc[0])
  })

  it('dit explicitement qu\'un mob sans CC est immunisé', () => {
    renderEn(<MobCard slug={SLUG} enemy={sansCc} />)
    expect(screen.getByText('Immune to every CC listed by MDT.')).toBeDefined()
  })

  it('masque la section en mode compact', () => {
    const { container } = renderEn(<MobCard slug={avecCc.slug} enemy={avecCc.enemy} compact />)
    expect(container.textContent).not.toContain('APPLICABLE CC')
  })
})

describe('Sorts', () => {
  it('remonte ce qui demande une réaction immédiate : kick avant tank', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    const texte = container.textContent!
    // Notes du Ritual Chieftain : « 87k » sur le sort à couper, « 581k » sur le tank buster.
    expect(texte.indexOf('87k')).toBeGreaterThan(-1)
    expect(texte.indexOf('87k')).toBeLessThan(texte.indexOf('581k'))
  })

  it('lie chaque sort à Wowhead', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    const lien = container.querySelector<HTMLAnchorElement>('a[href*="wowhead.com/spell="]')!
    expect(lien).not.toBeNull()
    expect(lien.target).toBe('_blank')
    expect(lien.rel).toBe('noreferrer')
  })

  it('nomme par son identifiant un sort absent de spells.json', () => {
    renderEn(<MobCard slug="donjon-sans-contenu" enemy={inconnu} />)
    expect(screen.getByText('Spell 999777')).toBeDefined()
  })

  it('ne rend aucune ligne de sort pour un mob qui n\'en a pas', () => {
    const { container } = renderEn(
      <MobCard slug="donjon-sans-contenu" enemy={{ ...inconnu, id: 888_002, spells: [] }} />,
    )
    expect(container.querySelector('a[href*="wowhead.com/spell="]')).toBeNull()
  })
})

describe('Prose', () => {
  it('rend la rédaction libre de la fiche', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(container.querySelector('.prose-codex')).not.toBeNull()
  })

  it('la masque en mode compact', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} compact />)
    expect(container.querySelector('.prose-codex')).toBeNull()
  })
})

describe('Interactions', () => {
  it('signale le survol, puis la sortie', () => {
    const vus: (number | null)[] = []
    const { container } = renderEn(
      <MobCard slug={SLUG} enemy={chieftain} onHover={(id) => vus.push(id)} />,
    )
    const article = container.querySelector('article')!
    fireEvent.mouseEnter(article)
    fireEvent.mouseLeave(article)
    expect(vus).toEqual([chieftain.id, null])
  })

  it('remonte la sélection au clic sur l\'en-tête', () => {
    const vus: number[] = []
    const { container } = renderEn(
      <MobCard slug={SLUG} enemy={chieftain} onSelect={(id) => vus.push(id)} />,
    )
    fireEvent.click(container.querySelector('header')!)
    expect(vus).toEqual([chieftain.id])
  })

  it('ne se donne l\'air cliquable que si un gestionnaire est fourni', () => {
    const { container: sans } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(sans.querySelector('header')!.className).not.toContain('cursor-pointer')

    const { container: avec } = renderEn(
      <MobCard slug={SLUG} enemy={chieftain} onSelect={() => {}} />,
    )
    expect(avec.querySelector('header')!.className).toContain('cursor-pointer')
  })
})
