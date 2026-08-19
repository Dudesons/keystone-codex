// ABOUTME: Tests a dungeon page with the map and both side panels mounted together.
// ABOUTME: Covers the header, the tab switch, and an unknown dungeon.

// @vitest-environment jsdom
import { act, cleanup, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Awareness } from 'y-protocols/awareness'
import { getLookup } from '../lib/data'
import { MAP_SCALE } from '../lib/geometry'
import { useRouteDoc } from '../lib/mdt/useRouteDoc'
import { renderEn, renderFr } from '../test/render'
import DungeonPage from './DungeonPage'

afterEach(cleanup)

/**
 * A socket that never opens.
 *
 * jsdom would otherwise dial the real relay the moment a test clicks Join, which no test may
 * depend on. See `useRouteDoc.test.tsx` for the fuller rationale — this file only needs a
 * session to reach `status !== 'off'`, never a real handshake.
 */
class SilentSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3
  readyState = 0
  binaryType = 'blob'
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: unknown) => void) | null = null
  constructor(readonly url: string) {}
  send() {}
  close() {
    this.readyState = this.CLOSED
    this.onclose?.()
  }
}

beforeAll(() => {
  // jsdom implements neither of these. The codex panel scrolls to the clicked unit, and the
  // map watches its container to size the viewBox. Both are inert here: jsdom lays
  // everything out at zero, so there is nothing to observe and nowhere to scroll.
  Element.prototype.scrollIntoView = () => {}
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.WebSocket = SilentSocket as unknown as typeof WebSocket
  // jsdom implements neither of these either. Dragging a note's pin captures the pointer once
  // the gesture is confirmed, the same way the map's own pan does (see `DungeonMap.test.tsx`).
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
})

beforeEach(() => {
  // The route lives in localStorage between mounts, which would leak across tests.
  localStorage.clear()
})

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!

/**
 * DungeonPage reads its slug from the URL, so it has to be mounted behind a real router.
 * Mounting it also mounts the map and whichever side panel the tab selects — this is the
 * seam where the three come together.
 */
const at = (path: string) => (
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/d/:slug/codex" element={<DungeonPage mode="codex" />} />
      <Route path="/d/:slug/codex/mob/:npcId" element={<DungeonPage mode="codex" />} />
      <Route path="/d/:slug/route" element={<DungeonPage mode="route" />} />
      <Route path="/" element={<p>home</p>} />
    </Routes>
  </MemoryRouter>
)

describe('Unknown dungeon', () => {
  it('says so instead of crashing, and offers a way home', () => {
    renderEn(at('/d/no-such-dungeon/codex'))
    expect(screen.getByText('Unknown dungeon.')).toBeDefined()
    expect(screen.getByText('Back to home')).toBeDefined()
  })

  it('mounts neither map nor panel', () => {
    const { container } = renderEn(at('/d/no-such-dungeon/codex'))
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('article')).toBeNull()
  })
})

describe('Header', () => {
  it('names the dungeon and sums up its forces and packs', () => {
    const { container } = renderEn(at(`/d/${SLUG}/codex`))
    const header = container.querySelector('header')!
    expect(within(header).getByText(lookup.dungeon.englishName)).toBeDefined()
    expect(header.textContent).toContain(`${lookup.dungeon.totalCount} forces`)
    expect(header.textContent).toContain(`${lookup.packs.size} packs`)
  })

  it('shows no timer while `_dungeon.md` leaves it empty', () => {
    const { container } = renderEn(at(`/d/${SLUG}/codex`))
    expect(container.querySelector('header')!.textContent).not.toMatch(/\d+ min/)
  })

  it('mentions no route until one holds clones', () => {
    const { container } = renderEn(at(`/d/${SLUG}/codex`))
    expect(container.querySelector('header')!.textContent).not.toContain('route')
  })

  it('shows no collaboration badge while the session is off', () => {
    const { container } = renderEn(at(`/d/${SLUG}/codex`))
    // The badge renders the room code next to the peer count.
    expect(container.querySelector('header')!.textContent).not.toMatch(/·\s*\d+$/)
  })

  it('carries the language switcher', () => {
    renderEn(at(`/d/${SLUG}/codex`))
    expect(screen.getByRole('button', { name: 'EN' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'FR' })).toBeDefined()
  })

  it('translates the chrome without touching the dungeon name', () => {
    renderFr(at(`/d/${SLUG}/codex`))
    // englishName comes from MDT, not from the dictionary: it stays as extracted.
    expect(screen.getByText(lookup.dungeon.englishName)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Codex' })).toBeDefined()
  })
})

describe('Codex and Route tabs', () => {
  it('opens on the codex', () => {
    const { container } = renderEn(at(`/d/${SLUG}/codex`))
    expect(screen.getByRole('heading', { name: 'BOSSES' })).toBeDefined()
    expect(container.querySelectorAll('article').length).toBeGreaterThan(0)
  })

  it('switches to the route panel and back', () => {
    renderEn(at(`/d/${SLUG}/codex`))

    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    expect(screen.queryByRole('heading', { name: 'BOSSES' })).toBeNull()

    fireEvent.click(screen.getByRole('link', { name: 'Codex' }))
    expect(screen.getByRole('heading', { name: 'BOSSES' })).toBeDefined()
  })

  it('keeps the map mounted across both tabs', () => {
    const { container } = renderEn(at(`/d/${SLUG}/codex`))
    expect(container.querySelector('svg')).not.toBeNull()

    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    expect(container.querySelector('svg')).not.toBeNull()
  })
})

describe('Arriving with an invitation link', () => {
  it('redirects the codex address to the route one, keeping the room, and shows the invitation', () => {
    const { container } = renderEn(at(`/d/${SLUG}/codex?room=ABC123`))
    expect(screen.queryByRole('heading', { name: 'BOSSES' })).toBeNull()
    expect(container.textContent).toContain('ABC123')
    expect(container.textContent).toMatch(/set aside/i)
  })

  it('shows the invitation straight away when the link already points at the route address', () => {
    const { container } = renderEn(at(`/d/${SLUG}/route?room=ABC123`))
    expect(container.textContent).toContain('ABC123')
    expect(container.textContent).toMatch(/set aside/i)
  })
})

describe('A link pasted after arrival', () => {
  /** Changes the URL without remounting `DungeonPage`, the way a hash change from a pasted link does. */
  function PasteLink() {
    const navigate = useNavigate()
    return <button onClick={() => navigate(`/d/${SLUG}/codex?room=TESTX`)}>paste link</button>
  }

  const withPasteLink = (path: string) => (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/d/:slug/codex"
          element={
            <>
              <PasteLink />
              <DungeonPage mode="codex" />
            </>
          }
        />
        <Route path="/d/:slug/route" element={<DungeonPage mode="route" />} />
      </Routes>
    </MemoryRouter>
  )

  it('switches into route mode once the URL carries a room, with no reload', () => {
    renderEn(withPasteLink(`/d/${SLUG}/codex`))
    expect(screen.getByRole('heading', { name: 'BOSSES' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'paste link' }))

    expect(screen.queryByRole('heading', { name: 'BOSSES' })).toBeNull()
    expect(screen.getByRole('button', { name: /join room testx/i })).toBeDefined()
  })

  it('does not force route mode back on someone who has since chosen Codex', () => {
    renderEn(withPasteLink(`/d/${SLUG}/codex`))
    fireEvent.click(screen.getByRole('button', { name: 'paste link' }))
    expect(screen.queryByRole('heading', { name: 'BOSSES' })).toBeNull()

    // The Codex tab is a plain link to `/d/:slug/codex`, with no room in its query — choosing
    // it is what drops the invitation, not a rule that remembers it was once declined.
    fireEvent.click(screen.getByRole('link', { name: 'Codex' }))
    expect(screen.getByRole('heading', { name: 'BOSSES' })).toBeDefined()
  })
})

describe('Pack outlines', () => {
  const outlines = (container: HTMLElement) => container.querySelectorAll('svg path').length

  it('are drawn in route mode too, where the panel asks you to click a pack', () => {
    const { container } = renderEn(at(`/d/${SLUG}/codex`))
    const inCodex = outlines(container)
    expect(inCodex).toBeGreaterThanOrEqual(lookup.packs.size)

    fireEvent.click(screen.getByRole('link', { name: 'Route' }))

    // The route starts empty, so no pull outline can account for these.
    expect(outlines(container)).toBe(inCodex)
  })
})

describe('Leaving a room offered by a link', () => {
  it('does not re-offer the room it just escaped, though a reload still would', () => {
    renderEn(at(`/d/${SLUG}/route?room=ABC123`))
    expect(screen.getByRole('button', { name: /join room abc123/i })).toBeDefined()

    // A name is required before Join enables.
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Rwl' } })
    fireEvent.click(screen.getByRole('button', { name: /join room abc123/i }))

    // Connected (or still connecting) — the invitation is gone, replaced by the session view.
    expect(screen.getByText('Leave')).toBeDefined()
    fireEvent.click(screen.getByText('Leave'))

    // The URL still carries `?room=ABC123` — reloading this link must still offer it — but
    // this mounted instance must not put the same invitation back in front of the person who
    // just left it.
    expect(screen.queryByRole('button', { name: /join room abc123/i })).toBeNull()
    expect(screen.getByRole('button', { name: /open a session/i })).toBeDefined()
  })

  it('still offers a different room pasted after leaving the first one', () => {
    // What is declined is the room just left, not "any invitation for the rest of this mount":
    // a flag would keep suppressing every other room a later link might carry, which is the
    // same bug fix 4 removed, resurrected by fix 5.
    function GoToDifferentRoom() {
      const navigate = useNavigate()
      return <button onClick={() => navigate(`/d/${SLUG}/route?room=DIFFER`)}>paste another link</button>
    }
    const withNavigation = (
      <MemoryRouter initialEntries={[`/d/${SLUG}/route?room=ABC123`]}>
        <Routes>
          <Route
            path="/d/:slug/route"
            element={
              <>
                <GoToDifferentRoom />
                <DungeonPage mode="route" />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    renderEn(withNavigation)
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Rwl' } })
    fireEvent.click(screen.getByRole('button', { name: /join room abc123/i }))
    fireEvent.click(screen.getByText('Leave'))
    expect(screen.queryByRole('button', { name: /join room abc123/i })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'paste another link' }))
    expect(screen.getByRole('button', { name: /join room differ/i })).toBeDefined()
  })
})

describe('A session that pauses itself', () => {
  it('does not cry outage when the session paused itself', () => {
    // Fake timers from the start: RelayNotice's own grace period runs on the same clock as
    // the pause threshold below, and a real setTimeout scheduled before switching clocks
    // would never fire within this test. The intermediate assertion just below depends on
    // it — if this call moves past that point, the grace timer arms on the real clock,
    // never fires, and that assertion fails immediately instead of passing for the wrong
    // reason.
    vi.useFakeTimers()
    try {
      renderEn(at(`/d/${SLUG}/route?room=AWAY01`))

      // A name is required before Join enables.
      fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Rwl' } })
      fireEvent.click(screen.getByRole('button', { name: /join room away01/i }))
      expect(screen.getByText('Leave')).toBeDefined()

      // SilentSocket never opens, so the session is genuinely unsynced here: this is the
      // real outage case, and the notice must speak up once RelayNotice's own grace period
      // has passed. Pinning this half is what makes the silence asserted below meaningful.
      act(() => void vi.advanceTimersByTime(5000))
      expect(screen.getByText(/not answering/i)).toBeDefined()

      // Walk away from the tab for longer than the hidden-tab pause threshold. The extra
      // 5000ms is headroom past the threshold, not sized for a timer of its own — the grace
      // timer above already fired earlier in this test.
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      act(() => void vi.advanceTimersByTime(5 * 60_000 + 5000))

      // Positive proof the session actually paused, not merely that the notice is absent —
      // the same query would also pass if the session had never opened at all.
      expect(screen.getByText('paused — nobody was here')).toBeDefined()
      expect(screen.queryByText(/not answering/i)).toBeNull()
    } finally {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      vi.useRealTimers()
    }
  })
})

describe('Deep link to a mob', () => {
  const enemy = lookup.dungeon.enemies.find((e) => !e.isBoss)!

  it('opens straight on that entry, alone', () => {
    const { container } = renderEn(at(`/d/${SLUG}/codex/mob/${enemy.id}`))
    const aside = container.querySelector('aside')!
    expect(aside.querySelectorAll('article')).toHaveLength(1)
    expect(aside.textContent).toContain(enemy.name)
  })

  it('offers a way back to the full list', () => {
    renderEn(at(`/d/${SLUG}/codex/mob/${enemy.id}`))
    expect(screen.getByText('← Back')).toBeDefined()
  })

  it('falls back to the list for a mob the dungeon does not have', () => {
    renderEn(at(`/d/${SLUG}/codex/mob/999999`))
    expect(screen.getByRole('heading', { name: 'BOSSES' })).toBeDefined()
  })
})

describe('Points of interest', () => {
  /** Murder Row, not the SLUG the rest of the file uses: Altar of Fangs declares no POI. */
  it('shows the dungeon items in both tabs', () => {
    renderEn(at('/d/murder-row/codex'))
    expect(screen.getAllByTestId(/^poi-/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    expect(screen.getAllByTestId(/^poi-/).length).toBeGreaterThan(0)
  })
})

describe('The mob panel', () => {
  const hoverFirstBlip = (container: HTMLElement) => {
    const blip = container.querySelectorAll('[data-clone]')[0]
    fireEvent.mouseEnter(blip)
    return blip
  }

  /**
   * RoutePanel's forces readout: the label, the running total, the required total and the
   * percent all sit in one row, directly above the bar that carries `data-standing`. Reading
   * that row's text is what lets this file pin the total without a testid RoutePanel does not
   * have — this task's file map does not include RoutePanel.tsx.
   */
  const forcesRow = (container: HTMLElement) =>
    container.querySelector('[data-standing]')!.parentElement!.previousElementSibling as HTMLElement

  /**
   * Blips render enemy-by-enemy (`dungeon.enemies.flatMap(e => e.clones)`), and Murder Row's
   * first enemy alone has 18 clones — so `blips[1]` is the *same* mob as `blips[0]`, not
   * "another" one. The tooltip-suppression comparison is by enemy id, on purpose (see
   * `DungeonPage.tsx`), so a test meaning "a genuinely different mob" has to skip past every
   * clone of the first enemy to land on one.
   */
  const otherEnemyBlipIndex = getLookup('murder-row')!.dungeon.enemies[0].clones.length
  const firstEnemyName = getLookup('murder-row')!.dungeon.enemies[0].name
  const otherEnemyName = getLookup('murder-row')!.dungeon.enemies[1].name

  it('is absent from the codex tab, where the right-hand panel already shows entries', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    expect(container.querySelector('[data-testid="mob-panel"]')).toBeNull()
  })

  it('appears in the route tab, asking to be given a mob', () => {
    renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    expect(screen.getByText(/Hover a mob on the map/)).toBeDefined()
  })

  it('fills with the hovered mob, and keeps it once the cursor leaves', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    const blip = hoverFirstBlip(container)
    const panel = screen.getByTestId('mob-panel')
    // Positive proof the hover actually reached the panel, not merely that its text is stable
    // — the empty state is stable too, and would satisfy the check below on its own.
    expect(panel.textContent).toContain(firstEnemyName)
    const named = panel.textContent
    fireEvent.mouseLeave(blip)
    // The entry would clear at the exact moment you moved the mouse toward it.
    expect(screen.getByTestId('mob-panel').textContent).toBe(named)
  })

  it('holds a right-clicked mob while another is hovered, and shows the other in the tooltip', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    const blips = container.querySelectorAll('[data-clone]')
    fireEvent.contextMenu(blips[0])
    const held = screen.getByTestId('mob-panel').textContent
    fireEvent.mouseEnter(blips[otherEnemyBlipIndex])
    expect(screen.getByTestId('mob-panel').textContent).toBe(held)
    expect(screen.getByTestId('clone-tooltip')).toBeDefined()
  })

  it('hides the tooltip on the very mob a right-click just froze, so it is not shown twice', () => {
    // The natural gesture: hover a blip, then right-click that same blip without moving the
    // cursor. The map's own hover state stays pointed at it across the click, so the tooltip
    // would otherwise repeat the mob the column just pinned.
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    const blip = container.querySelectorAll('[data-clone]')[0]
    fireEvent.mouseEnter(blip)
    fireEvent.contextMenu(blip)
    expect(screen.queryByTestId('clone-tooltip')).toBeNull()
  })

  it('shows no tooltip while nothing is held, since the panel already speaks', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    hoverFirstBlip(container)
    expect(screen.queryByTestId('clone-tooltip')).toBeNull()
  })

  it('goes back to following the hover once the pin is clicked', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    const blips = container.querySelectorAll('[data-clone]')
    fireEvent.contextMenu(blips[0])
    fireEvent.click(screen.getByRole('button', { name: 'Stop holding this mob' }))
    // A genuinely different mob, not another clone of the one just unpinned — see
    // `otherEnemyBlipIndex` above.
    fireEvent.mouseEnter(blips[otherEnemyBlipIndex])
    expect(screen.queryByRole('button', { name: 'Stop holding this mob' })).toBeNull()
    expect(screen.getByTestId('mob-panel').textContent).toContain(otherEnemyName)
  })

  it('does not add the right-clicked mob to the current pull', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    const before = forcesRow(container).textContent
    fireEvent.contextMenu(container.querySelectorAll('[data-clone]')[0])
    expect(forcesRow(container).textContent).toBe(before)
  })
})

describe('The drawing tools', () => {
  it('are absent from the codex tab', () => {
    renderEn(at('/d/murder-row/codex'))
    expect(screen.queryByRole('button', { name: 'Draw' })).toBeNull()
  })

  it('keeps the mob panel through a tool change, and hands the column to a placed object', () => {
    renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    // The mob panel's empty state is what the column shows with nothing selected.
    expect(screen.getByText(/Hover a mob on the map/)).toBeDefined()

    // Picking a tool no longer takes it away: there is still no object to edit.
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    expect(screen.getByText(/Hover a mob on the map/)).toBeDefined()

    // Placing a note selects it, and that is what the editor is for.
    const surface = document.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 30, clientY: 30, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 30, clientY: 30, pointerId: 1 })
    expect(screen.queryByText(/Hover a mob on the map/)).toBeNull()
    expect(screen.getByLabelText('Note text')).toBeDefined()

    // Dropping the selection gives the column back.
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByText(/Hover a mob on the map/)).toBeDefined()
  })

  it('drops the active tool on Escape', () => {
    renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    expect(screen.getByRole('button', { name: 'Note' }).dataset.active).toBe('true')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.getByRole('button', { name: 'Note' }).dataset.active).toBeUndefined()
  })

  it('places a note where the map was clicked, and opens it for writing', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))

    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 40, clientY: 60 })
    fireEvent.pointerUp(surface, { clientX: 40, clientY: 60 })

    // The pin is on the map…
    expect(container.querySelector('[data-testid="note-pin-0"]')).toBeTruthy()
    // …and the column is ready for its text.
    expect(screen.getByLabelText('Note text')).toBeDefined()
  })

  it('writes what is typed into the placed note', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 40, clientY: 60 })
    fireEvent.pointerUp(surface, { clientX: 40, clientY: 60 })

    fireEvent.change(screen.getByLabelText('Note text'), { target: { value: 'lust here' } })

    // The pin's own hover text is the note's, so the map is what proves the write landed.
    // Scoped to the pin itself: the column's own textarea carries the same value, and a
    // controlled textarea's value shows up in its text content in jsdom, so an unscoped
    // `getByText` here matches both and throws on the ambiguity.
    const pin = container.querySelector('[data-testid="note-pin-0"]') as HTMLElement
    fireEvent.mouseEnter(pin)
    expect(within(pin).getByText('lust here')).toBeDefined()
  })

  it('draws an arrow across the map on a drag', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))

    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    // Well clear of the start: a line-mode gesture reports two points however far this went.
    fireEvent.pointerMove(surface, { clientX: 120, clientY: 80, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 120, clientY: 80, pointerId: 1 })

    const stroke = container.querySelector('[data-testid="stroke-0"]')
    expect(stroke).toBeTruthy()
    // A plain stroke is a `<polyline>` alone; the `<polygon>` head is what an arrow adds, and
    // what would disappear if `isArrow: true` were ever dropped from the committed object.
    expect(stroke!.querySelector('polygon')).toBeTruthy()
  })

  it('draws no arrow when the tool is pressed and released without moving', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))

    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 20, clientY: 20, pointerId: 1 })

    // A single point has no direction, so no stroke should have reached the map at all.
    expect(container.querySelector('[data-testid="stroke-0"]')).toBeNull()
  })

  it('draws a freehand stroke from a dragged gesture', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }))

    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    for (const x of [20, 40, 60, 80]) {
      fireEvent.pointerMove(surface, { clientX: x, clientY: x / 2, pointerId: 1 })
    }
    fireEvent.pointerUp(surface, { clientX: 80, clientY: 40, pointerId: 1 })

    // One stroke on the map, drawn as a polyline by the layer that already existed.
    const strokes = container.querySelectorAll('[data-testid^="stroke-"]')
    expect(strokes).toHaveLength(1)
    const polyline = strokes[0].querySelector('polyline')!
    expect(polyline.getAttribute('points')!.trim().split(/\s+/).length).toBeGreaterThan(2)
    // No arrowhead: this is a stroke, not an arrow.
    expect(strokes[0].querySelector('polygon')).toBeNull()
  })

  it('leaves no hit target over the codex map after picking a tool and switching tabs', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))

    fireEvent.click(screen.getByRole('link', { name: 'Codex' }))

    // A tool picked in Route mode must not leave a full-surface hit target over the codex
    // map: nothing in the codex tab ever hands `drawing` a gesture to report, so a surface
    // here would only ever sit between the cursor and the blips beneath it.
    expect(container.querySelector('[data-testid="draw-surface"]')).toBeNull()
  })

  it('deletes the selected object with the Delete key', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    expect(container.querySelectorAll('[data-testid^="stroke-"]')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    fireEvent.click(container.querySelector('[data-hit]')!)
    fireEvent.keyDown(document, { key: 'Delete' })

    expect(container.querySelectorAll('[data-testid^="stroke-"]')).toHaveLength(0)
  })

  it('draws in the colour and the width the brush is set to', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }))
    fireEvent.click(screen.getByTestId('colour-4ade80'))
    fireEvent.click(screen.getByTestId('size-12'))

    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 40, clientY: 0, pointerId: 1 })

    const polyline = container.querySelector('[data-testid="stroke-0"] polyline')!
    expect(polyline.getAttribute('stroke')).toBe('#4ade80')
    // MDT's own 0.3 factor, applied to the width the brush chose rather than to its default.
    expect(polyline.getAttribute('stroke-width')).toBe(String(12 * 0.3 * MAP_SCALE))
  })

  it('recolours a stroke already drawn, without redrawing it', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    // The stroke's own line is the last of the group: a selected stroke is drawn over a gold
    // halo and an invisible hit target, both of which are polylines through the same points.
    const drawn = () => {
      const all = container.querySelectorAll('[data-testid="stroke-0"] polyline')
      return all[all.length - 1]
    }
    const before = drawn().getAttribute('points')

    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    fireEvent.click(container.querySelector('[data-hit]')!)
    fireEvent.click(screen.getByTestId('colour-38bdf8'))

    const polyline = drawn()
    expect(polyline.getAttribute('stroke')).toBe('#38bdf8')
    // The same line, in another colour: an edit that moved a point would not be a recolour.
    expect(polyline.getAttribute('points')).toBe(before)
  })

  it('erases the drawing that is clicked, and leaves the others alone', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    for (const y of [0, 60]) {
      fireEvent.pointerDown(surface, { clientX: 0, clientY: y, pointerId: 1 })
      fireEvent.pointerMove(surface, { clientX: 40, clientY: y, pointerId: 1 })
      fireEvent.pointerUp(surface, { clientX: 40, clientY: y, pointerId: 1 })
    }
    expect(container.querySelectorAll('[data-testid^="stroke-"]')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Erase' }))
    fireEvent.click(container.querySelectorAll('[data-hit]')[0]!)

    expect(container.querySelectorAll('[data-testid^="stroke-"]')).toHaveLength(1)
  })

  it('erases a note as readily as a drawing', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 30, clientY: 30, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 30, clientY: 30, pointerId: 1 })
    expect(container.querySelectorAll('[data-testid^=\"note-pin-\"]')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Erase' }))
    fireEvent.click(container.querySelector('[data-testid^=\"note-pin-\"]')!)

    expect(container.querySelectorAll('[data-testid^=\"note-pin-\"]')).toHaveLength(0)
  })

  it('draws nothing while the eraser is the active tool', () => {
    // Erase reuses the objects' own hit targets, so it must not also mount the full-map surface
    // that a drawing tool needs — that surface would sit over every one of them.
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Erase' }))

    expect(container.querySelector('[data-testid="draw-surface"]')).toBeNull()
  })

  it('keeps the mob card up while a tool is active but nothing is selected', () => {
    // The column swaps to the object editor only when there is an object to edit. A tool being
    // up is not that: with nothing selected the editor has only a one-line hint to show, and
    // trading a whole mob card for a sentence is what made drawing feel like it broke the codex.
    renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }))

    expect(screen.getByTestId('mob-panel').textContent).toContain('Hover a mob on the map')
  })

  it('swaps to the editor as soon as an object is selected, and back when it is dropped', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 40, clientY: 0, pointerId: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    fireEvent.click(container.querySelector('[data-hit]')!)
    // The stroke's own colour swatches are the editor, and they only exist once it is showing.
    expect(screen.getByTestId('colour-ff365c')).toBeTruthy()
    expect(screen.getByTestId('mob-panel').textContent).not.toContain('Hover a mob on the map')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByTestId('mob-panel').textContent).toContain('Hover a mob on the map')
  })

  it('drops the selection on a tool change, so Delete cannot reach it afterwards', () => {
    // The halo is only ever shown while the select tool is active; if the selection survived a
    // tool change, Delete could remove an object nothing on screen still looked selected.
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 40, clientY: 0, pointerId: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    fireEvent.click(container.querySelector('[data-hit]')!)

    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    fireEvent.keyDown(document, { key: 'Delete' })

    expect(container.querySelectorAll('[data-testid^="stroke-"]')).toHaveLength(1)
  })

  it('leaves Delete alone while a note’s text has focus', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 20, clientY: 20, pointerId: 1 })

    const field = screen.getByLabelText('Note text')
    field.focus()
    fireEvent.keyDown(field, { key: 'Delete' })

    // Still there: a Delete in a text field is a text edit, not a command.
    expect(container.querySelector('[data-testid="note-pin-0"]')).toBeTruthy()
  })

  it('deselects and drops the tool on Escape, leaving the object itself untouched', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    fireEvent.click(container.querySelector('[data-testid="note-pin-0"]')!)

    fireEvent.keyDown(document, { key: 'Escape' })

    // The tool is gone, the way it already was before this task...
    expect(screen.getByRole('button', { name: 'Select' }).dataset.active).toBeUndefined()
    // …and Escape did not also reach for the Delete branch: the note is still on the map.
    expect(container.querySelector('[data-testid="note-pin-0"]')).toBeTruthy()
  })

  it('does nothing on Delete when nothing is selected', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    // Placing a note leaves it open for editing (Task 2's own behaviour): Escape is what drops
    // both the tool and that selection, which is what "nothing selected" actually requires here.
    fireEvent.keyDown(document, { key: 'Escape' })

    fireEvent.keyDown(document, { key: 'Delete' })

    expect(container.querySelector('[data-testid="note-pin-0"]')).toBeTruthy()
  })

  it('moves a note by dragging its pin with the select tool active', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 20, clientY: 20, pointerId: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    const pin = container.querySelector('[data-testid="note-pin-0"]') as HTMLElement
    const before = pin.style.transform

    fireEvent.pointerDown(pin, { clientX: 20, clientY: 20, pointerId: 2 })
    fireEvent.pointerMove(pin, { clientX: 90, clientY: 20, pointerId: 2 })
    fireEvent.pointerUp(pin, { clientX: 90, clientY: 20, pointerId: 2 })

    expect(container.querySelector('[data-testid="note-pin-0"]')!.getAttribute('style')).not.toBe(
      `transform: ${before};`,
    )
  })

  it('has no object selectable outside the select tool', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 40, clientY: 0, pointerId: 1 })

    // Still on the freehand tool, never switched to Select: nothing hands the stroke an
    // `onSelect`, so there is no `[data-hit]` for a stray click to land on.
    expect(container.querySelector('[data-hit]')).toBeNull()
  })

  it('undoes the last object edit with Ctrl+Z', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    expect(container.querySelector('[data-testid="note-pin-0"]')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })

    expect(container.querySelector('[data-testid="note-pin-0"]')).toBeNull()
  })

  it('redoes with Ctrl+Shift+Z what Ctrl+Z just undid', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(container.querySelector('[data-testid="note-pin-0"]')).toBeNull()

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, shiftKey: true })

    expect(container.querySelector('[data-testid="note-pin-0"]')).toBeTruthy()
  })
})

describe('Publishing the stroke in progress', () => {
  it('shows a preview while dragging, and drops it once released', () => {
    const { container } = renderEn(at('/d/murder-row/codex'))
    fireEvent.click(screen.getByRole('link', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))

    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 120, clientY: 80, pointerId: 1 })
    expect(container.querySelector('[data-testid="preview-stroke"]')).toBeTruthy()

    fireEvent.pointerUp(surface, { clientX: 120, clientY: 80, pointerId: 1 })
    expect(container.querySelector('[data-testid="preview-stroke"]')).toBeNull()
  })

  it('publishes nothing while nobody could be listening, and something once a session is open', () => {
    const spy = vi.spyOn(Awareness.prototype, 'setLocalStateField')
    const { container } = renderEn(at(`/d/${SLUG}/route`))

    fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))
    let surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 120, clientY: 80, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 120, clientY: 80, pointerId: 1 })
    expect(spy.mock.calls.some(([field]) => field === 'drawing')).toBe(false)

    // Drop the tool, open a session, and repeat the same drag: it now has somewhere to publish.
    fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Rwl' } })
    fireEvent.click(screen.getByText('Open a session with this route'))

    fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))
    surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 20, pointerId: 2 })
    fireEvent.pointerMove(surface, { clientX: 120, clientY: 80, pointerId: 2 })
    expect(spy.mock.calls.some(([field]) => field === 'drawing')).toBe(true)
  })

  it('is withdrawn from a peer when Escape drops the tool mid-drag', async () => {
    // The host half of a real room: `joinRoom` reaches other tabs of the same origin over a
    // genuine `BroadcastChannel`, the same mechanism `useRouteDoc.test.tsx`'s own two-peer tests
    // rely on — no relay and no second browser are needed to prove a peer sees the withdrawal.
    const peer = renderHook(() => useRouteDoc(SLUG, lookup.dungeon.mdtIndex))
    act(() => peer.result.current.joinRoom('ESCPMD', 'host'))

    const { container } = renderEn(at(`/d/${SLUG}/route?room=ESCPMD`))
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Rwl' } })
    fireEvent.click(screen.getByRole('button', { name: /join room escpmd/i }))
    expect(screen.getByText('Leave')).toBeDefined()

    // jsdom lays everything out at zero: without a real container size, `toMapPoint` would
    // divide by it and every reported point would come out `NaN` — which a peer correctly
    // treats as no point at all (`readPoints` rejects a coordinate that is not a number), never
    // seeing a gesture that, on the host's own screen, looks perfectly real. Same stub the
    // map's own "reports a move in map coordinates" test uses.
    const mapSurface = container.querySelector('.map-surface')!
    Object.defineProperty(mapSurface, 'clientWidth', { configurable: true, value: 2000 })
    Object.defineProperty(mapSurface, 'clientHeight', { configurable: true, value: 1000 })
    fireEvent.click(screen.getByTitle('Fit'))

    fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))
    const surface = screen.getByTestId('draw-surface')
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 120, clientY: 80, pointerId: 1 })

    await waitFor(() =>
      expect(peer.result.current.collab.peers.some((p) => !p.isSelf && p.drawing?.length)).toBe(true),
    )

    // Escape, not a release: the drag is abandoned mid-gesture, the one path `DrawSurface`
    // itself never gets a chance to clean up after.
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() =>
      expect(peer.result.current.collab.peers.every((p) => !p.drawing?.length)).toBe(true),
    )

    peer.unmount()
  })
})

describe('A tool-change effect that must not fire on a session status flip', () => {
  it('keeps the current selection when a session opens mid-edit', () => {
    // `publishDrawing` (the tool-clear effect's other dependency, before this fix) swaps from
    // `undefined` to `setDrawing` the moment a session opens — an identity change that has
    // nothing to do with which tool is active, and must not be read as one.
    const { container } = renderEn(at(`/d/${SLUG}/route`))

    fireEvent.click(screen.getByRole('button', { name: 'Draw' }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 40, clientY: 0, pointerId: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    fireEvent.click(container.querySelector('[data-hit]')!)
    expect(container.querySelector('[data-testid="stroke-0"]')!.getAttribute('data-selected')).toBe(
      'true',
    )

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Rwl' } })
    fireEvent.click(screen.getByText('Open a session with this route'))

    // The tool never changed, so the selection — and the halo it draws — must survive.
    expect(container.querySelector('[data-testid="stroke-0"]')!.getAttribute('data-selected')).toBe(
      'true',
    )
  })
})

describe('Remounting per dungeon', () => {
  it('starts a separate document for each dungeon', () => {
    // The `key={slug}` on DungeonView is what guarantees this: mob indices mean different
    // things from one dungeon to the next, so no state may survive the switch.
    const other = lookup.dungeon.slug === 'altar-of-fangs' ? 'kings-rest' : 'altar-of-fangs'
    const { container: first } = renderEn(at(`/d/${SLUG}/codex`))
    expect(first.querySelector('h1')!.textContent).toBe(lookup.dungeon.englishName)

    cleanup()
    const { container: second } = renderEn(at(`/d/${other}/codex`))
    expect(second.querySelector('h1')!.textContent).toBe(getLookup(other)!.dungeon.englishName)
  })
})
