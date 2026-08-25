// @vitest-environment jsdom
// ABOUTME: The app shell: that search is reachable from every page, by keyboard.
// ABOUTME: App was pure wiring until it mounted the palette; this is the test that follows.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { dungeonList } from './lib/data'
import { renderEn } from './test/render'

afterEach(cleanup)

const mountAt = (path: string) =>
  renderEn(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

/** The binding lives on `document`, so that is where a command has to arrive. */
const press = (key: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(document, { key, ...init })

describe('Reaching search from the keyboard', () => {
  it('opens on Ctrl+K from the home page', () => {
    mountAt('/')
    press('k', { ctrlKey: true })
    expect(screen.getByRole('combobox')).toBeDefined()
  })

  it('opens on Cmd+K, for the same reason', () => {
    mountAt('/')
    press('k', { metaKey: true })
    expect(screen.getByRole('combobox')).toBeDefined()
  })

  it('opens on a bare slash', () => {
    mountAt('/')
    press('/')
    expect(screen.getByRole('combobox')).toBeDefined()
  })

  it('leaves a slash typed into a text field alone', () => {
    // The route panel holds a name field and a room-code field. A slash typed into either is a
    // slash, and this is the case that will actually happen.
    mountAt('/')
    const field = document.createElement('input')
    document.body.appendChild(field)
    fireEvent.keyDown(field, { key: '/' })
    expect(screen.queryByRole('combobox')).toBeNull()
    field.remove()
  })

  it('leaves a slash typed into a textarea alone too', () => {
    mountAt('/')
    const area = document.createElement('textarea')
    document.body.appendChild(area)
    fireEvent.keyDown(area, { key: '/' })
    expect(screen.queryByRole('combobox')).toBeNull()
    area.remove()
  })

  it('is reachable from inside a dungeon too', () => {
    mountAt(`/d/${dungeonList[0].slug}`)
    press('k', { ctrlKey: true })
    expect(screen.getByRole('combobox')).toBeDefined()
  })

  it('ignores a bare k, which is a letter people type', () => {
    mountAt('/')
    press('k')
    expect(screen.queryByRole('combobox')).toBeNull()
  })
})
