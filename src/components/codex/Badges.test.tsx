// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

// Sans `globals: true`, Testing Library n'enregistre pas son nettoyage automatique.
afterEach(cleanup)
import type { SpellTag, Threat } from '../../lib/content'
import { renderEn, renderFr } from '../../test/render'
import { CcBadges, DispelBadges, TagBadge, ThreatBadge } from './Badges'

describe('ThreatBadge', () => {
  it('ne rend rien tant que la menace n\'est pas jugée', () => {
    const { container } = renderEn(<ThreatBadge threat={undefined} />)
    expect(container.innerHTML).toBe('')
  })

  it('nomme chaque niveau de menace en clair', () => {
    const attendu: Record<Threat, string> = {
      low: 'Harmless',
      medium: 'Watch out',
      high: 'Dangerous',
      lethal: 'Lethal',
    }
    for (const [threat, label] of Object.entries(attendu)) {
      const { container, unmount } = renderEn(<ThreatBadge threat={threat as Threat} />)
      expect(container.textContent).toBe(label)
      unmount()
    }
  })

  it('suit la langue choisie', () => {
    const attendu: Record<Threat, string> = {
      low: 'Sans danger',
      medium: 'À surveiller',
      high: 'Dangereux',
      lethal: 'Létal',
    }
    for (const [threat, label] of Object.entries(attendu)) {
      const { container, unmount } = renderFr(<ThreatBadge threat={threat as Threat} />)
      expect(container.textContent).toBe(label)
      unmount()
    }
  })
})

describe('TagBadge', () => {
  it('ne rend rien sans tag', () => {
    const { container } = renderEn(<TagBadge tag={undefined} />)
    expect(container.innerHTML).toBe('')
  })

  it('ne rend rien pour `todo` : un tag non renseigné n\'est pas une information', () => {
    const { container } = renderEn(<TagBadge tag="todo" />)
    expect(container.innerHTML).toBe('')
  })

  it('affiche l\'action attendue', () => {
    const attendu: Partial<Record<SpellTag, string>> = {
      kick: 'KICK',
      dodge: 'DODGE',
      dispel: 'DISPEL',
      tank: 'TANK',
      soak: 'SOAK',
      ignore: 'IGNORE',
    }
    for (const [tag, label] of Object.entries(attendu)) {
      const { container, unmount } = renderEn(<TagBadge tag={tag as SpellTag} />)
      expect(container.textContent).toBe(label)
      unmount()
    }
  })

  it('traduit les tags qui ont un équivalent français', () => {
    // `kick`, `tank`, `soak` et `dispel` restent tels quels : c'est le jargon employé en
    // jeu, y compris par les joueurs francophones.
    expect(renderFr(<TagBadge tag="dodge" />).container.textContent).toBe('ESQUIVE')
    cleanup()
    expect(renderFr(<TagBadge tag="ignore" />).container.textContent).toBe('IGNORER')
    cleanup()
    expect(renderFr(<TagBadge tag="kick" />).container.textContent).toBe('KICK')
  })

  it('accole la priorité quand elle est déclarée', () => {
    const { container } = renderEn(<TagBadge tag="kick" prio={1} />)
    expect(container.textContent).toBe('KICK 1')
  })

  it('n\'affiche pas de priorité nulle', () => {
    const { container } = renderEn(<TagBadge tag="kick" prio={0} />)
    expect(container.textContent).toBe('KICK')
  })
})

describe('CcBadges', () => {
  it('ne rend rien quand le mob est immunisé à tout', () => {
    const { container } = renderEn(<CcBadges cc={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('liste les CC déclarés par MDT', () => {
    renderEn(<CcBadges cc={['Stun', 'Fear', 'Root']} />)
    expect(screen.getByText('Stun')).toBeDefined()
    expect(screen.getByText('Fear')).toBeDefined()
    expect(screen.getByText('Root')).toBeDefined()
  })
})

describe('DispelBadges', () => {
  it('ne rend rien sans type de dispel', () => {
    expect(renderEn(<DispelBadges dispel={undefined} />).container.innerHTML).toBe('')
    expect(renderEn(<DispelBadges dispel={[]} />).container.innerHTML).toBe('')
  })

  it('liste chaque type de dispel', () => {
    renderEn(<DispelBadges dispel={['magic', 'enrage']} />)
    expect(screen.getByText('magic')).toBeDefined()
    expect(screen.getByText('enrage')).toBeDefined()
  })
})
