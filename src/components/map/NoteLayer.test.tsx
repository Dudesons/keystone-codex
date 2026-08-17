// ABOUTME: Tests the note pins: one per note, the text on hover, and kept open on click.
// ABOUTME: Positions are asserted through the transform, the one thing jsdom can still tell us.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { MdtNote } from '../../lib/mdt/objects'
import { renderEn } from '../../test/render'
import NoteLayer from './NoteLayer'

afterEach(cleanup)

const notes: MdtNote[] = [
  { kind: 'note', at: { x: 100, y: 200 }, sublevel: 1, text: 'Lust, a lot of kicks to do' },
  { kind: 'note', at: { x: 300, y: 400 }, sublevel: 1, text: 'Focus mob with shield' },
]

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
})
