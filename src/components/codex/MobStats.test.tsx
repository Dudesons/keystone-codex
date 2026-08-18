// ABOUTME: Tests the forces / share / score block shared by the map tooltip and the mob panel.
// ABOUTME: Reads the real dungeon pool: the numbers under test are the committed ones.

// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { getLookup } from '../../lib/data'
import { contribution, scoreColor } from '../../lib/contribution'
import { renderEn, renderFr } from '../../test/render'
import MobStats from './MobStats'
import type { Enemy } from '../../lib/types'

afterEach(cleanup)

const { dungeon } = getLookup('murder-row')!
const byName = (name: string): Enemy => dungeon.enemies.find((e) => e.name === name)!

// jsdom (like a real browser) normalises an inline hex colour on the `style.color` getter to
// `rgb(r, g, b)`, so comparing straight against `scoreColor`'s hex output never matches.
const hexToRgb = (hex: string): string => {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

describe('MobStats', () => {
  it('shows the forces, the share and the score the game shows', () => {
    renderEn(<MobStats enemy={byName('Bribed Captain')} dungeon={dungeon} />)
    expect(screen.getByText('35 forces')).toBeDefined()
    expect(screen.getByTestId('mob-share').textContent).toBe('5.07% of the dungeon')
    expect(screen.getByTestId('mob-score').textContent).toBe('4.2')
  })

  it('paints the score in MDT’s colour for it', () => {
    renderEn(<MobStats enemy={byName('Bribed Captain')} dungeon={dungeon} />)
    const score = screen.getByTestId('mob-score')
    // Derived from `contribution` itself, not a printed-and-pasted literal: the two channels
    // land on different colour bytes for the unrounded score (4.235844...) than they would for
    // the rounded display value (4.2), so this only passes if MobStats hands scoreColor the
    // unrounded number.
    const { score: exact } = contribution(byName('Bribed Captain'), dungeon)
    expect(score.style.color).toBe(hexToRgb(scoreColor(exact!)))
  })

  it('says a mob gives nothing rather than printing a zero score', () => {
    const free = dungeon.enemies.find((e) => e.count === 0)!
    renderEn(<MobStats enemy={free} dungeon={dungeon} />)
    expect(screen.getByText('no forces')).toBeDefined()
    expect(screen.queryByTestId('mob-score')).toBeNull()
  })

  it('formats the share in the reader’s language', () => {
    renderFr(<MobStats enemy={byName('Bribed Captain')} dungeon={dungeon} />)
    // fr-FR uses a comma and a narrow no-break space before the sign.
    expect(screen.getByTestId('mob-share').textContent).toContain(',')
  })

  it('hides the forces count when told to, keeping the share and the score', () => {
    renderEn(<MobStats enemy={byName('Bribed Captain')} dungeon={dungeon} showForces={false} />)
    expect(screen.queryByText('35 forces')).toBeNull()
    expect(screen.getByTestId('mob-share')).toBeDefined()
    expect(screen.getByTestId('mob-score')).toBeDefined()
  })

  it('shows nothing for a forceless mob once the count is hidden, rather than repeating the same sentence a `MobCard` header below already says', () => {
    const free = dungeon.enemies.find((e) => e.count === 0)!
    const { container } = renderEn(<MobStats enemy={free} dungeon={dungeon} showForces={false} />)
    expect(container.textContent).toBe('')
  })
})
