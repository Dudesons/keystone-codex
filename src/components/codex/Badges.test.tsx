// ABOUTME: Tests the mob card badges: threat, spell tag, CC and dispel.
// ABOUTME: Checks both languages, these labels being the most translated part of the codex.

// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

// Without `globals: true`, Testing Library does not register its automatic cleanup.
afterEach(cleanup)
import type { SpellTag, Threat } from '../../lib/content'
import { renderEn, renderFr } from '../../test/render'
import { CcBadges, DispelBadges, TagBadge, ThreatBadge } from './Badges'

describe('ThreatBadge', () => {
  it('renders nothing while the threat has not been judged', () => {
    const { container } = renderEn(<ThreatBadge threat={undefined} />)
    expect(container.innerHTML).toBe('')
  })

  it('spells out every threat level', () => {
    const expected: Record<Threat, string> = {
      low: 'Harmless',
      medium: 'Watch out',
      high: 'Dangerous',
      lethal: 'Lethal',
    }
    for (const [threat, label] of Object.entries(expected)) {
      const { container, unmount } = renderEn(<ThreatBadge threat={threat as Threat} />)
      expect(container.textContent).toBe(label)
      unmount()
    }
  })

  it('follows the chosen language', () => {
    const expected: Record<Threat, string> = {
      low: 'Sans danger',
      medium: 'À surveiller',
      high: 'Dangereux',
      lethal: 'Létal',
    }
    for (const [threat, label] of Object.entries(expected)) {
      const { container, unmount } = renderFr(<ThreatBadge threat={threat as Threat} />)
      expect(container.textContent).toBe(label)
      unmount()
    }
  })
})

describe('TagBadge', () => {
  it('renders nothing without a tag', () => {
    const { container } = renderEn(<TagBadge tag={undefined} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing for `todo`: an unset tag is not information', () => {
    const { container } = renderEn(<TagBadge tag="todo" />)
    expect(container.innerHTML).toBe('')
  })

  it('shows the action expected of the player', () => {
    const expected: Partial<Record<SpellTag, string>> = {
      kick: 'KICK',
      dodge: 'DODGE',
      dispel: 'DISPEL',
      tank: 'TANK',
      soak: 'SOAK',
      ignore: 'IGNORE',
    }
    for (const [tag, label] of Object.entries(expected)) {
      const { container, unmount } = renderEn(<TagBadge tag={tag as SpellTag} />)
      expect(container.textContent).toBe(label)
      unmount()
    }
  })

  it('translates the tags that have a French equivalent', () => {
    // `kick`, `tank`, `soak` and `dispel` stay as they are: that is the in-game jargon,
    // French-speaking players included.
    expect(renderFr(<TagBadge tag="dodge" />).container.textContent).toBe('ESQUIVE')
    cleanup()
    expect(renderFr(<TagBadge tag="ignore" />).container.textContent).toBe('IGNORER')
    cleanup()
    expect(renderFr(<TagBadge tag="kick" />).container.textContent).toBe('KICK')
  })

  it('appends the priority when one is declared', () => {
    const { container } = renderEn(<TagBadge tag="kick" prio={1} />)
    expect(container.textContent).toBe('KICK 1')
  })

  it('does not print a zero priority', () => {
    const { container } = renderEn(<TagBadge tag="kick" prio={0} />)
    expect(container.textContent).toBe('KICK')
  })
})

describe('CcBadges', () => {
  it('renders nothing when the mob is immune to everything', () => {
    const { container } = renderEn(<CcBadges cc={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('lists the crowd control MDT declares', () => {
    renderEn(<CcBadges cc={['Stun', 'Fear', 'Root']} />)
    expect(screen.getByText('Stun')).toBeDefined()
    expect(screen.getByText('Fear')).toBeDefined()
    expect(screen.getByText('Root')).toBeDefined()
  })
})

describe('DispelBadges', () => {
  it('renders nothing without a dispel type', () => {
    expect(renderEn(<DispelBadges dispel={undefined} />).container.innerHTML).toBe('')
    expect(renderEn(<DispelBadges dispel={[]} />).container.innerHTML).toBe('')
  })

  it('lists every dispel type', () => {
    renderEn(<DispelBadges dispel={['magic', 'enrage']} />)
    expect(screen.getByText('magic')).toBeDefined()
    expect(screen.getByText('enrage')).toBeDefined()
  })
})
