// ABOUTME: Tests the column's editing surface: a note's text, and deleting the object.
// ABOUTME: Stateless — the page holds the object and writes the change to the document.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderEn } from '../../test/render'
import ObjectEditor from './ObjectEditor'
import type { MdtNote, MdtObject } from '../../lib/mdt/objects'

afterEach(cleanup)

const note: MdtNote = { kind: 'note', at: { x: 10, y: 20 }, sublevel: 1, text: 'kick', id: '1:0' }

describe('ObjectEditor', () => {
  it('says what to do when nothing is placed yet', () => {
    renderEn(<ObjectEditor object={null} onChange={() => {}} onDelete={() => {}} />)
    expect(screen.getByText(/Click the map to place a note/)).toBeDefined()
  })

  it('shows the note’s text and reports every edit', () => {
    const seen: MdtObject[] = []
    renderEn(<ObjectEditor object={note} onChange={(o) => seen.push(o)} onDelete={() => {}} />)
    const field = screen.getByLabelText('Note text')
    expect((field as HTMLTextAreaElement).value).toBe('kick')

    fireEvent.change(field, { target: { value: 'kick then lust' } })

    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ kind: 'note', text: 'kick then lust', id: '1:0' })
  })

  it('reports a delete', () => {
    let deleted = 0
    renderEn(<ObjectEditor object={note} onChange={() => {}} onDelete={() => (deleted += 1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(deleted).toBe(1)
  })
})
