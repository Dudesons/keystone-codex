// ABOUTME: Tests the tips section: the three kinds, and the click that loads the embed.
// ABOUTME: The iframe assertion is the point — nothing may reach YouTube before the click.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

afterEach(cleanup)
import type { Tip } from '../../lib/tips'
import { tipsSectionId } from '../../lib/tips'
import { DEFAULT_LOCALE } from '../../lib/i18n/locales'
import { renderEn, renderFr } from '../../test/render'
import MobTips from './MobTips'

const SLUG = 'the-blinding-vale'
const NPC_ID = 12_345
const text: Tip = { kind: 'text', text: 'Kick the **second** cast.' }
const video: Tip = { kind: 'video', videoId: '9D0gCU8Tp5Y', portrait: true, label: 'The pull' }
const image: Tip = { kind: 'image', file: 'beams.webp', label: 'Where they land' }

describe('Text tips', () => {
  it('renders its markdown inline', () => {
    const { container } = renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[text]} fallback={false} />)
    expect(container.querySelector('strong')?.textContent).toBe('second')
  })
})

describe('Video tips', () => {
  it('loads nothing before the reader clicks', () => {
    const { container } = renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[video]} fallback={false} />)
    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByRole('button', { name: 'The pull' })).toBeTruthy()
  })

  it('swaps in a no-cookie embed for that video once clicked', () => {
    const { container } = renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[video]} fallback={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'The pull' }))

    const frame = container.querySelector('iframe')!
    expect(frame).toBeTruthy()
    expect(frame.getAttribute('src')).toContain('youtube-nocookie.com/embed/9D0gCU8Tp5Y')
  })

  it('offers a way out to YouTube, for a browser that blocks the frame', () => {
    renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[video]} fallback={false} />)
    const link = screen.getByRole('link', { name: 'Open on YouTube' })
    expect(link.getAttribute('href')).toBe('https://www.youtube.com/watch?v=9D0gCU8Tp5Y')
  })

  it('falls back to a generic label when the card names none', () => {
    renderFr(<MobTips slug={SLUG} npcId={NPC_ID} tips={[{ ...video, label: undefined }]} fallback={false} />)
    expect(screen.getByRole('button', { name: 'Lire la vidéo' })).toBeTruthy()
  })

  it('does not carry playback state onto a different video swapped into the same row', () => {
    // A translation replaces the whole `tips:` list (decision 7): the video at index 0 can
    // become a different video entirely. `playing` for the old one must not leak onto the new.
    const other: Tip = { kind: 'video', videoId: 'aaaaaaaaaaa', portrait: false, label: 'Other video' }
    const { container, rerender } = renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[video]} fallback={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'The pull' }))
    expect(container.querySelector('iframe')).toBeTruthy()

    rerender(<MobTips slug={SLUG} npcId={NPC_ID} tips={[other]} fallback={false} />)

    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByRole('button', { name: 'Other video' })).toBeTruthy()
  })
})

describe('Image tips', () => {
  it('resolves under the deployed base path, and captions itself', () => {
    renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[image]} fallback={false} />)
    const img = screen.getByRole('img', { name: 'Where they land' })
    expect(img.getAttribute('src')).toBe(`${import.meta.env.BASE_URL}tips/${SLUG}/beams.webp`)
  })
})

describe('The section itself', () => {
  it('renders nothing at all for an empty list', () => {
    const { container } = renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[]} fallback={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('marks the whole section when it is showing the base language', () => {
    renderFr(<MobTips slug={SLUG} npcId={NPC_ID} tips={[text]} fallback />)
    expect(screen.getByText(DEFAULT_LOCALE.toUpperCase())).toBeTruthy()
  })

  it('gives its section an id derived from the mob, so a badge can scroll to it', () => {
    const { container } = renderEn(
      <MobTips slug="__fixtures__" npcId={263_109} tips={[{ kind: 'text', text: 'x' }]} fallback={false} />,
    )
    expect(container.querySelector(`#${CSS.escape(tipsSectionId(263_109))}`)).not.toBeNull()
  })
})

describe('The marker that ties the section to the badge', () => {
  it('shows the same `?` the jump badge carries, in either language', () => {
    const { container } = renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[text]} fallback={false} />)
    expect(container.querySelector('[data-tips-marker]')?.textContent).toBe('?')

    cleanup()
    const fr = renderFr(<MobTips slug={SLUG} npcId={NPC_ID} tips={[text]} fallback={false} />)
    expect(fr.container.querySelector('[data-tips-marker]')?.textContent).toBe('?')
  })

  // A screen reader announcing a bare question mark before the section name is noise: the
  // heading already says what this is. The glyph is there for the eye that just clicked one.
  it('hides the glyph from assistive technology', () => {
    const { container } = renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[text]} fallback={false} />)
    expect(container.querySelector('[data-tips-marker]')?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('The flash that lands the eye on the section', () => {
  const section = (container: HTMLElement) =>
    container.querySelector(`#${CSS.escape(tipsSectionId(NPC_ID))}`)!

  it('does not wash the section until a jump asks it to', () => {
    const { container } = renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[text]} fallback={false} />)
    expect(section(container).className).not.toContain('tips-flash')
  })

  it('washes the section when the card reports a jump', () => {
    const { container } = renderEn(
      <MobTips slug={SLUG} npcId={NPC_ID} tips={[text]} fallback={false} flashToken={1} />,
    )
    expect(section(container).className).toContain('tips-flash')
  })

  /**
   * jsdom runs no animations, so this asserts the wiring rather than the wash. The class has to
   * come off: the animation only replays on an element that is not already carrying it, so a
   * second jump to the same card would otherwise do nothing.
   */
  it('takes the wash off again when the animation reports itself finished', () => {
    const { container } = renderEn(
      <MobTips slug={SLUG} npcId={NPC_ID} tips={[text]} fallback={false} flashToken={1} />,
    )
    fireEvent.animationEnd(section(container))
    expect(section(container).className).not.toContain('tips-flash')
  })

  it('washes again on a second jump, which is a new token rather than a new value of true', () => {
    const { container, rerender } = renderEn(
      <MobTips slug={SLUG} npcId={NPC_ID} tips={[text]} fallback={false} flashToken={1} />,
    )
    fireEvent.animationEnd(section(container))
    expect(section(container).className).not.toContain('tips-flash')

    rerender(<MobTips slug={SLUG} npcId={NPC_ID} tips={[text]} fallback={false} flashToken={2} />)
    expect(section(container).className).toContain('tips-flash')
  })
})

describe('Folding a video away again', () => {
  it('keeps the row after the embed opens, so there is still something to click', () => {
    renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[video]} fallback={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'The pull' }))
    expect(screen.getByRole('button', { name: 'The pull' })).toBeTruthy()
  })

  /**
   * Unmounted, not hidden. This section exists on the promise that nothing reaches Google until
   * the reader asks — leaving a player alive behind a folded row would keep the connection the
   * fold was meant to end, and would keep the audio playing with it.
   */
  it('drops the embed entirely on the second click', () => {
    const { container } = renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[video]} fallback={false} />)
    const row = screen.getByRole('button', { name: 'The pull' })

    fireEvent.click(row)
    expect(container.querySelector('iframe')).not.toBeNull()

    fireEvent.click(row)
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('says whether it is open, for a reader who cannot see the glyph', () => {
    renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[video]} fallback={false} />)
    const row = screen.getByRole('button', { name: 'The pull' })
    expect(row.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(row)
    expect(row.getAttribute('aria-expanded')).toBe('true')
  })

  it('keeps the way out to YouTube reachable while the embed is open', () => {
    renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[video]} fallback={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'The pull' }))
    expect(screen.getByRole('link', { name: 'Open on YouTube' })).toBeTruthy()
  })

  it('reopens a folded video rather than refusing to play it twice', () => {
    const { container } = renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[video]} fallback={false} />)
    const row = screen.getByRole('button', { name: 'The pull' })

    fireEvent.click(row)
    fireEvent.click(row)
    fireEvent.click(row)
    expect(container.querySelector('iframe')).not.toBeNull()
  })
})
