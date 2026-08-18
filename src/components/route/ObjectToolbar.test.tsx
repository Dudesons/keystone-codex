// ABOUTME: Tests the tool strip: which tool is active, what it reports, and the undo buttons.
// ABOUTME: Stateless — the page owns the tool, and this only says which one is showing.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderEn } from '../../test/render'
import ObjectToolbar, { type Tool } from './ObjectToolbar'

afterEach(cleanup)

const mount = (over: Partial<React.ComponentProps<typeof ObjectToolbar>> = {}) =>
  renderEn(
    <ObjectToolbar
      tool={null}
      onTool={() => {}}
      canUndo={false}
      canRedo={false}
      onUndo={() => {}}
      onRedo={() => {}}
      {...over}
    />,
  )

describe('ObjectToolbar', () => {
  it('offers every tool', () => {
    mount()
    for (const name of ['Note', 'Arrow', 'Draw', 'Select']) {
      expect(screen.getByRole('button', { name })).toBeDefined()
    }
  })

  it('reports the tool that was picked', () => {
    const picked: (Tool | null)[] = []
    mount({ onTool: (t) => picked.push(t) })
    fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))
    expect(picked).toEqual(['arrow'])
  })

  it('reports null when the active tool is clicked again', () => {
    const picked: (Tool | null)[] = []
    mount({ tool: 'arrow', onTool: (t) => picked.push(t) })
    fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))
    expect(picked).toEqual([null])
  })

  it('says which tool is active, in a way a test can read', () => {
    mount({ tool: 'freehand' })
    expect(screen.getByRole('button', { name: 'Draw' }).dataset.active).toBe('true')
    expect(screen.getByRole('button', { name: 'Note' }).dataset.active).toBeUndefined()
  })

  it('disables undo and redo when there is nothing to undo', () => {
    mount()
    expect(screen.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Redo' }).hasAttribute('disabled')).toBe(true)
  })

  it('undoes when there is something to undo', () => {
    let undone = 0
    mount({ canUndo: true, onUndo: () => (undone += 1) })
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(undone).toBe(1)
  })
})
