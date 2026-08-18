// ABOUTME: Checks every written trap sentence reaches the page, with its mob and its markdown.
// ABOUTME: Runs against the real Altar of Fangs derivation.

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TrapList from './TrapList'
import { getHighlights } from '../../lib/highlights'
import { renderEn } from '../../test/render'

afterEach(cleanup)

const SLUG = 'altar-of-fangs'
const traps = getHighlights(SLUG).traps

const mount = () => renderEn(<TrapList slug={SLUG} traps={traps} />, { wrapper: MemoryRouter })

describe('TrapList', () => {
  it('shows every trap the dungeon has written', () => {
    const { container } = mount()
    expect(traps.length).toBeGreaterThan(0)
    expect(container.querySelectorAll('[data-trap]')).toHaveLength(traps.length)
  })

  it('renders the traps in the order the derivation gives', () => {
    const { container } = mount()
    const ids = [...container.querySelectorAll('[data-trap]')].map((el) => el.getAttribute('data-trap'))
    expect(ids).toEqual(traps.map((t) => String(t.npcId)))
  })

  it('names the mob and links it into the codex', () => {
    const { container } = mount()
    const twinfang = container.querySelector('[data-trap="261554"]')!
    expect(twinfang.textContent).toContain('Twinfang Harrower')
    expect(twinfang.querySelector(`a[href="/d/${SLUG}/codex/mob/261554"]`)).not.toBeNull()
  })

  it('renders the trap sentence as markdown', () => {
    const { container } = mount()
    // Ritual Chieftain (270306) is the only Altar of Fangs trap written with bold markdown:
    // content/altar-of-fangs/270306-ritual-chieftain.md's `trap:` wraps Blood Sacrifice and
    // Dismember in `**…**`. Twinfang Harrower's trap carries no markdown to assert on.
    const chieftain = container.querySelector('[data-trap="270306"]')!
    expect(chieftain.querySelector('strong')).not.toBeNull()
  })

  it('renders nothing at all when nothing is written', () => {
    const { container } = renderEn(<TrapList slug={SLUG} traps={[]} />, { wrapper: MemoryRouter })
    expect(container.querySelector('[data-trap]')).toBeNull()
  })
})
