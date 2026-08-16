// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { contentProgress, getDungeonContent } from '../lib/content'
import { dungeonList, getDungeon } from '../lib/data'
import { renderEn } from '../test/render'
import Home from './Home'

afterEach(cleanup)

const monter = () => renderEn(<Home />, { wrapper: MemoryRouter })

describe('Liste des donjons', () => {
  it('affiche une carte par donjon du pool', () => {
    const { container } = monter()
    expect(container.querySelectorAll('a[href^="/d/"]')).toHaveLength(dungeonList.length)
  })

  it('mène à la page de chaque donjon', () => {
    const { container } = monter()
    for (const d of dungeonList) {
      expect(container.querySelector(`a[href="/d/${d.slug}"]`), d.slug).not.toBeNull()
    }
  })

  it('nomme chaque donjon', () => {
    monter()
    for (const d of dungeonList) {
      expect(screen.getByText(d.englishName)).toBeDefined()
    }
  })

  it('résume boss, packs et forces', () => {
    const { container } = monter()
    const premier = dungeonList[0]
    const carte = container.querySelector(`a[href="/d/${premier.slug}"]`) as HTMLElement
    const texte = within(carte)
    expect(texte.getByText(`${premier.bosses} ${premier.bosses === 1 ? 'boss' : 'bosses'}`)).toBeDefined()
    expect(texte.getByText(`${premier.packCount} packs`)).toBeDefined()
    expect(texte.getByText(`${premier.totalCount} forces`)).toBeDefined()
  })
})

describe('Avancement du codex', () => {
  it('compte les fiches rédigées sur le nombre de mobs distincts', () => {
    const { container } = monter()
    const premier = dungeonList[0]
    const dungeon = getDungeon(premier.slug)!
    const attendu = contentProgress(premier.slug, [...new Set(dungeon.enemies.map((e) => e.id))])
    const carte = container.querySelector(`a[href="/d/${premier.slug}"]`) as HTMLElement
    expect(within(carte).getByText(`${attendu.written}/${attendu.total} cards`)).toBeDefined()
  })

  it('reflète l\'avancement dans la largeur de la barre', () => {
    const { container } = monter()
    const premier = dungeonList[0]
    const dungeon = getDungeon(premier.slug)!
    const { written, total } = contentProgress(
      premier.slug,
      [...new Set(dungeon.enemies.map((e) => e.id))],
    )
    const carte = container.querySelector(`a[href="/d/${premier.slug}"]`) as HTMLElement
    const barre = carte.querySelector<HTMLElement>('.bg-gold-500')!
    expect(barre.style.width).toBe(`${total ? (written / total) * 100 : 0}%`)
  })
})

describe('Métadonnées de donjon', () => {
  it('n\'affiche chrono et résumé que lorsqu\'ils sont renseignés', () => {
    const { container } = monter()
    for (const d of dungeonList) {
      const content = getDungeonContent(d.slug)
      const carte = container.querySelector(`a[href="/d/${d.slug}"]`) as HTMLElement
      if (!content?.timer) {
        expect(within(carte).queryByText(/ min$/), d.slug).toBeNull()
      }
      if (content?.summary) {
        expect(within(carte).getByText(content.summary), d.slug).toBeDefined()
      }
    }
  })
})

describe('Repères de page', () => {
  it('annonce la saison couverte', () => {
    monter()
    expect(screen.getByText('MIDNIGHT · SEASON 2')).toBeDefined()
    expect(screen.getByText('Mythic+ Codex')).toBeDefined()
  })

  it('offre le sélecteur de langue et bascule tout le chrome', () => {
    monter()
    const enBouton = screen.getByRole('button', { name: 'EN' })
    expect(enBouton.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'FR' }))
    expect(screen.getByText('MIDNIGHT · SAISON 2')).toBeDefined()
    expect(screen.getByText('Codex Mythique+')).toBeDefined()
  })

  it('renvoie vers `content/` pour la rédaction', () => {
    const { container } = monter()
    expect(container.textContent).toContain('content/')
  })
})
