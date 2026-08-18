// ABOUTME: Tests the note pins: one per note, the text on hover, and kept open on click.
// ABOUTME: Positions are asserted through the transform, the one thing jsdom can still tell us.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { MdtNote } from '../../lib/mdt/objects'
import { renderEn } from '../../test/render'
import NoteLayer from './NoteLayer'

afterEach(cleanup)

beforeAll(() => {
  // jsdom implements neither method. Only the drag tests below exercise them — everything else
  // releases before a drag is ever confirmed — but the stub has to exist before any of them run.
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
})

const notes: MdtNote[] = [
  { kind: 'note', at: { x: 100, y: 200 }, sublevel: 1, text: 'Lust, a lot of kicks to do' },
  { kind: 'note', at: { x: 300, y: 400 }, sublevel: 1, text: 'Focus mob with shield' },
]

const notesWithIds: MdtNote[] = notes.map((n, i) => ({ ...n, id: `note-${i}` }))

const transform = { scale: 0.5, tx: 10, ty: 20 }

describe('NoteLayer', () => {
  it('draws one pin per note', () => {
    renderEn(<NoteLayer notes={notes} transform={transform} />)
    expect(screen.getAllByTestId(/^note-pin-/)).toHaveLength(2)
  })

  it('places a pin where the note is, under the current transform', () => {
    renderEn(<NoteLayer notes={notes} transform={transform} />)
    // toContainerPoint: 100 * 0.5 + 10 = 60, 200 * 0.5 + 20 = 120
    expect(screen.getByTestId('note-pin-0').style.transform).toBe('translate(60px, 120px)')
  })

  it('shows the text only while its pin is hovered', () => {
    renderEn(<NoteLayer notes={notes} transform={transform} />)
    expect(screen.queryByText('Focus mob with shield')).toBeNull()
    fireEvent.mouseEnter(screen.getByTestId('note-pin-1'))
    expect(screen.getByText('Focus mob with shield')).toBeTruthy()
    fireEvent.mouseLeave(screen.getByTestId('note-pin-1'))
    expect(screen.queryByText('Focus mob with shield')).toBeNull()
  })

  it('keeps a note open once clicked, and closes it on a second click', () => {
    renderEn(<NoteLayer notes={notes} transform={transform} />)
    const pin = screen.getByTestId('note-pin-0')
    fireEvent.click(pin)
    fireEvent.mouseLeave(pin)
    expect(screen.getByText('Lust, a lot of kicks to do')).toBeTruthy()
    fireEvent.click(pin)
    expect(screen.queryByText('Lust, a lot of kicks to do')).toBeNull()
  })

  it('lets pointer events fall through the overlay everywhere but a pin', () => {
    // This only proves the classes are present, not that a real browser routes a click to the
    // map underneath: jsdom's fireEvent dispatches straight at a target and models no hit
    // testing at all, so it cannot see a pointer-events-none div swallowing a click meant for a
    // blip. What actually proves that is clicking a mob blip in Route mode in a real browser —
    // the check that caught this bug in the first place, and the one this class assertion
    // stands in for.
    const { container } = renderEn(<NoteLayer notes={notes} transform={transform} />)
    expect(container.firstElementChild!.className).toContain('pointer-events-none')
    expect(screen.getByTestId('note-pin-0').className).toContain('pointer-events-auto')
  })

  it('does not close a pinned note when the press lands inside its own text', () => {
    renderEn(<NoteLayer notes={notes} transform={transform} />)
    fireEvent.click(screen.getByTestId('note-pin-0'))
    // `pointerdown`, not `click`: the layer's own listener is on pointerdown, and Testing
    // Library does not derive one from the other. A click here would reach no listener at all.
    fireEvent.pointerDown(screen.getByText('Lust, a lot of kicks to do'))
    expect(screen.getByText('Lust, a lot of kicks to do')).toBeTruthy()
  })

  it('closes a pinned note on a click outside the layer', () => {
    renderEn(<NoteLayer notes={notes} transform={transform} />)
    fireEvent.click(screen.getByTestId('note-pin-0'))
    expect(screen.getByText('Lust, a lot of kicks to do')).toBeTruthy()

    fireEvent.pointerDown(document.body)

    expect(screen.queryByText('Lust, a lot of kicks to do')).toBeNull()
  })

  it('keeps a note open when the press lands on another pin, which is still inside the layer', () => {
    // The listener closes on a press *outside* the layer. Another note's pin is inside it, so
    // reaching for it must not close the open note out from under the gesture — the whole point
    // of testing `contains` against a press the listener actually receives.
    renderEn(<NoteLayer notes={notes} transform={transform} />)
    fireEvent.click(screen.getByTestId('note-pin-0'))
    fireEvent.pointerDown(screen.getByTestId('note-pin-1'))
    expect(screen.getByText('Lust, a lot of kicks to do')).toBeTruthy()
  })
})

describe('Selecting and moving a note', () => {
  it('is inert to selection when nothing has an id yet', () => {
    // Covers decision 8b: a preset's untouched notes carry no id until the document adopts
    // them, so a click must not crash reaching for one, and selection must not fire on
    // `undefined`.
    const picked: string[] = []
    renderEn(<NoteLayer notes={notes} transform={transform} onSelect={(id) => picked.push(id)} />)
    fireEvent.click(screen.getByTestId('note-pin-0'))
    expect(picked).toEqual([])
    // A click that cannot select still falls back to the pin's own open/close behaviour.
    expect(screen.getByText('Lust, a lot of kicks to do')).toBeTruthy()
  })

  it('selects a note on click instead of opening it, once it has an id', () => {
    const picked: string[] = []
    renderEn(
      <NoteLayer notes={notesWithIds} transform={transform} onSelect={(id) => picked.push(id)} />,
    )
    fireEvent.click(screen.getByTestId('note-pin-0'))
    expect(picked).toEqual(['note-0'])
    expect(screen.queryByText('Lust, a lot of kicks to do')).toBeNull()
  })

  it('selects without moving on a press-and-release that never crosses the drag threshold, with both handlers wired', () => {
    // `DungeonMap` always supplies `onSelect` and `onMove` together while the select tool is
    // active — the only combination the app actually ships. A plain click in that combination
    // must select, and must not write a no-op move to the document.
    const picked: string[] = []
    const moved: unknown[] = []
    renderEn(
      <NoteLayer
        notes={notesWithIds}
        transform={transform}
        onSelect={(id) => picked.push(id)}
        onMove={(id, at) => moved.push([id, at])}
      />,
    )
    const pin = screen.getByTestId('note-pin-0')
    fireEvent.pointerDown(pin, { clientX: 100, clientY: 200, pointerId: 1 })
    fireEvent.pointerUp(pin, { clientX: 100, clientY: 200, pointerId: 1 })
    fireEvent.click(pin)

    expect(picked).toEqual(['note-0'])
    expect(moved).toHaveLength(0)
  })

  it('marks the selected pin, so a reader can see which it is', () => {
    renderEn(<NoteLayer notes={notesWithIds} transform={transform} selectedId="note-1" />)
    expect(screen.getByTestId('note-pin-0').dataset.selected).toBeUndefined()
    expect(screen.getByTestId('note-pin-1').dataset.selected).toBe('true')
  })

  it('reports a drag as one move, in map pixels', () => {
    const moved: [string, { x: number; y: number }][] = []
    renderEn(
      <NoteLayer notes={notesWithIds} transform={transform} onMove={(id, at) => moved.push([id, at])} />,
    )
    // `getBoundingClientRect` on the layer's own root: jsdom lays everything out at zero, so
    // the container point the drag ends at equals the drag's own client coordinates.
    const pin = screen.getByTestId('note-pin-0')
    fireEvent.pointerDown(pin, { clientX: 100, clientY: 200, pointerId: 1 })
    fireEvent.pointerMove(pin, { clientX: 140, clientY: 220, pointerId: 1 })
    fireEvent.pointerUp(pin, { clientX: 140, clientY: 220, pointerId: 1 })

    expect(moved).toHaveLength(1)
    const [id, at] = moved[0]
    expect(id).toBe('note-0')
    // toMapPoint: (140 - 10) / 0.5 = 260, (220 - 20) / 0.5 = 400
    expect(at).toEqual({ x: 260, y: 400 })
  })

  it('does not move a note that has no id yet', () => {
    const moved: unknown[] = []
    renderEn(
      <NoteLayer notes={notes} transform={transform} onMove={(id, at) => moved.push([id, at])} />,
    )
    const pin = screen.getByTestId('note-pin-0')
    fireEvent.pointerDown(pin, { clientX: 100, clientY: 200, pointerId: 1 })
    fireEvent.pointerMove(pin, { clientX: 140, clientY: 220, pointerId: 1 })
    fireEvent.pointerUp(pin, { clientX: 140, clientY: 220, pointerId: 1 })
    fireEvent.click(pin)
    expect(moved).toHaveLength(0)
    // With nothing to move (the id guard means the drag path never engaged at all), the
    // browser's trailing click reaches the ordinary open/close toggle unopposed and opens it —
    // checked through the note's text, the same way the sibling "still opens on a plain click"
    // test does, since the pin's own `data-testid` element renders whether it is open or not.
    expect(screen.getByText('Lust, a lot of kicks to do')).toBeTruthy()
  })

  it('does not reopen a dragged note when the browser fires its trailing click', () => {
    // A real drag's `pointerup` is followed by a `click` from the browser itself — that is the
    // hazard decision 8's note calls out. Firing it here proves the handler swallows it rather
    // than toggling the pin the drag just moved.
    renderEn(
      <NoteLayer notes={notesWithIds} transform={transform} onMove={() => {}} />,
    )
    const pin = screen.getByTestId('note-pin-0')
    fireEvent.pointerDown(pin, { clientX: 100, clientY: 200, pointerId: 1 })
    fireEvent.pointerMove(pin, { clientX: 140, clientY: 220, pointerId: 1 })
    fireEvent.pointerUp(pin, { clientX: 140, clientY: 220, pointerId: 1 })
    fireEvent.click(pin)

    expect(screen.queryByText('Lust, a lot of kicks to do')).toBeNull()
  })

  it('keeps the press to itself whenever a tool can act on the pin', () => {
    // The map starts a pan from any press it hears and takes pointer capture a few pixels later,
    // which retargets the click away from the pin. The eraser supplies `onSelect` and nothing
    // else, so a guard that only knows about dragging and drawing hands it the press instead —
    // and a hand that wobbles between down and up erases nothing and pans the map.
    const heard: string[] = []
    renderEn(
      <div onPointerDown={() => heard.push('map')}>
        <NoteLayer notes={notesWithIds} transform={transform} onSelect={() => {}} />
      </div>,
    )
    fireEvent.pointerDown(screen.getByTestId('note-pin-0'), { clientX: 100, clientY: 200, pointerId: 1 })
    expect(heard).toEqual([])
  })

  it('lets the press through when nothing can act on the pin', () => {
    // The other half of the same rule: with no tool active a pin is decoration, and swallowing
    // the press would cost the map a pan for no reason but where the hand landed.
    const heard: string[] = []
    renderEn(
      <div onPointerDown={() => heard.push('map')}>
        <NoteLayer notes={notesWithIds} transform={transform} />
      </div>,
    )
    fireEvent.pointerDown(screen.getByTestId('note-pin-0'), { clientX: 100, clientY: 200, pointerId: 1 })
    expect(heard).toEqual(['map'])
  })

  it('still opens on a plain click that never moved, once a drag is possible', () => {
    // Same wiring as the hazard test above, but with no movement: a click that was never a drag
    // must still behave like one, or `onMove` being wired at all would silently break clicks.
    renderEn(<NoteLayer notes={notes} transform={transform} onMove={() => {}} />)
    const pin = screen.getByTestId('note-pin-0')
    fireEvent.pointerDown(pin, { clientX: 100, clientY: 200, pointerId: 1 })
    fireEvent.pointerUp(pin, { clientX: 100, clientY: 200, pointerId: 1 })
    fireEvent.click(pin)

    expect(screen.getByText('Lust, a lot of kicks to do')).toBeTruthy()
  })
})
