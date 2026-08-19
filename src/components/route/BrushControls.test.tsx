// ABOUTME: Tests the colour and thickness strip: what it offers, what it marks, what it reports.
// ABOUTME: The same control serves a new stroke and a selected one, so it only ever reports.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderEn, renderFr } from '../../test/render'
import BrushControls, { STROKE_COLOURS, STROKE_SIZES } from './BrushControls'

afterEach(cleanup)

const noop = () => {}

describe('BrushControls', () => {
  it('offers every colour in the palette', () => {
    renderEn(<BrushControls colour="ff365c" size={7} onColour={noop} onSize={noop} />)
    for (const { colour } of STROKE_COLOURS) {
      expect(screen.getByTestId(`colour-${colour}`)).toBeTruthy()
    }
  })

  it('marks the colour in use, and only that one', () => {
    renderEn(<BrushControls colour="4ade80" size={7} onColour={noop} onSize={noop} />)
    expect(screen.getByTestId('colour-4ade80').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('colour-ff365c').getAttribute('aria-pressed')).toBe('false')
  })

  it('reports the colour picked, as MDT’s hex without the hash', () => {
    const picked: string[] = []
    renderEn(<BrushControls colour="ff365c" size={7} onColour={(c) => picked.push(c)} onSize={noop} />)
    fireEvent.click(screen.getByTestId('colour-38bdf8'))
    expect(picked).toEqual(['38bdf8'])
  })

  it('offers exactly the three thicknesses, and marks the one in use', () => {
    renderEn(<BrushControls colour="ff365c" size={12} onColour={noop} onSize={noop} />)
    for (const { size } of STROKE_SIZES) expect(screen.getByTestId(`size-${size}`)).toBeTruthy()
    expect(screen.getByTestId('size-12').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('size-4').getAttribute('aria-pressed')).toBe('false')
  })

  it('reports the thickness picked', () => {
    const picked: number[] = []
    renderEn(<BrushControls colour="ff365c" size={7} onColour={noop} onSize={(s) => picked.push(s)} />)
    fireEvent.click(screen.getByTestId('size-4'))
    expect(picked).toEqual([4])
  })

  it('marks nothing when the stroke’s colour is not one of the swatches', () => {
    // A preset written elsewhere carries whatever colour its author picked, and MDT offers a
    // full picker rather than a palette. Showing none of ours as active is the truth; showing
    // the nearest would claim an edit the reader never made.
    renderEn(<BrushControls colour="123456" size={7} onColour={noop} onSize={noop} />)
    const pressed = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.getAttribute('data-testid'))
    expect(pressed).toEqual(['size-7'])
  })

  it('names its controls in the reader’s language', () => {
    renderFr(<BrushControls colour="ff365c" size={7} onColour={noop} onSize={noop} />)
    expect(screen.getByLabelText('Rouge')).toBeTruthy()
    expect(screen.getByLabelText('Fin')).toBeTruthy()
  })
})
