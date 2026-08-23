// ABOUTME: TipList shows every mob with tips, linking to its card and mounting the real player.
// ABOUTME: The embed must stay unloaded until the reader clicks — that is the whole contract.

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TipList from './TipList'
import { getHighlights } from '../../lib/highlights'
import { renderEn } from '../../test/render'

afterEach(cleanup)

const tips = getHighlights('the-blinding-vale').tips

// TipList renders a `Link`, same as TrapList beside it, so it needs a router in scope — mounted
// the same way TrapList.test.tsx does.
const mount = (list: typeof tips) =>
  renderEn(<TipList slug="the-blinding-vale" tips={list} />, { wrapper: MemoryRouter })

describe('TipList', () => {
  it('renders nothing when the dungeon has no tips', () => {
    const { container } = mount([])
    expect(container.firstChild).toBeNull()
  })

  it('names each mob and links to its card', () => {
    mount(tips)
    const link = screen.getByRole('link', { name: tips[0].mobName })
    expect(link.getAttribute('href')).toContain(`/d/the-blinding-vale/codex/mob/${tips[0].npcId}`)
  })

  it('loads no embed until the reader clicks', () => {
    // the-blinding-vale's one tipped mob (Sporeblight Belcher) carries exactly one tip, a
    // video, so MobTips renders exactly one button (the play button) — the "open on YouTube"
    // control beside it is a link, not a button. `getByRole` below asserts that singularity
    // rather than assuming position, so a second button appearing later would fail loudly here.
    const { container } = mount(tips)
    expect(container.querySelectorAll('iframe')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button'))
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
  })
})
