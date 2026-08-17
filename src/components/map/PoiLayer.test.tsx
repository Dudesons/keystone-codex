// ABOUTME: Tests the map's item markers: one per POI, the entrance apart, the tooltip's text.
// ABOUTME: jsdom lays out at zero, so this asserts structure and labels rather than geometry.

// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLookup, getSpell } from '../../lib/data'
import type { Poi } from '../../lib/types'
import { renderEn, renderFr } from '../../test/render'
import PoiLayer, { PoiTooltip } from './PoiLayer'

afterEach(cleanup)

/** Murder Row is the one season dungeon with POIs; its data is the real thing. */
const pois = getLookup('murder-row')!.dungeon.pois

/** These layers are `<g>` elements: mounted bare, their children would not be in an svg tree. */
const svg = ({ children }: { children: ReactNode }) => <svg>{children}</svg>

describe('PoiLayer', () => {
  it('draws one marker per point of interest', () => {
    renderEn(<PoiLayer pois={pois} onHover={() => {}} />, { wrapper: svg })
    expect(screen.getAllByTestId(/^poi-/)).toHaveLength(pois.length)
  })

  it('reports the marker under the pointer, and its leaving', () => {
    const onHover = vi.fn()
    renderEn(<PoiLayer pois={pois} onHover={onHover} />, { wrapper: svg })
    const marker = screen.getByTestId('poi-1')
    fireEvent.mouseEnter(marker)
    expect(onHover).toHaveBeenLastCalledWith(1)
    fireEvent.mouseLeave(marker)
    expect(onHover).toHaveBeenLastCalledWith(null)
  })

  it('names the marker in the requested locale, not always English', () => {
    const item = pois.find((p) => p.info?.spellId)!
    const spellEn = getSpell(item.info!.spellId, 'en')!
    const spellFr = getSpell(item.info!.spellId, 'fr')!
    expect(spellFr.name).not.toBe(spellEn.name) // otherwise this proves nothing

    const { container } = renderFr(<PoiLayer pois={[item]} onHover={() => {}} />, { wrapper: svg })
    expect(container.querySelector('title')!.textContent).toBe(spellFr.name)
  })
})

describe('PoiTooltip', () => {
  it('names the spell an item points at', () => {
    const item = pois.find((p) => p.info?.spellId)!
    const spell = getSpell(item.info!.spellId, 'en')
    renderEn(<PoiTooltip poi={item} />)
    // An unresolved spell is rendered with its raw id, by design — assert whichever is true.
    expect(screen.getByText(spell ? spell.name : String(item.info!.spellId))).toBeTruthy()
  })

  it('names an entrance, which points at no spell', () => {
    const entrance: Poi = { type: 'dungeonEntrance', x: 0, y: -1, sublevel: 1, sizeMult: 1.5 }
    renderEn(<PoiTooltip poi={entrance} />)
    expect(screen.getByText('Dungeon entrance')).toBeTruthy()
  })
})
