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
      colour="ff365c"
      size={7}
      onColour={() => {}}
      onSize={() => {}}
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
    for (const name of ['Note', 'Arrow', 'Draw', 'Select', 'Erase']) {
      expect(screen.getByRole('button', { name })).toBeDefined()
    }
  })

  it('shows the brush only under a tool that draws with it', () => {
    // Nothing is being drawn yet, so a colour and a width would describe nothing.
    mount()
    expect(screen.queryByTestId('colour-ff365c')).toBeNull()

    cleanup()
    mount({ tool: 'freehand' })
    expect(screen.getByTestId('colour-ff365c')).toBeTruthy()
    expect(screen.getByTestId('size-7')).toBeTruthy()

    cleanup()
    mount({ tool: 'arrow' })
    expect(screen.getByTestId('colour-ff365c')).toBeTruthy()
  })

  it('hides the brush under the tools that place, pick up and rub out', () => {
    for (const tool of ['note', 'select', 'erase'] as const) {
      cleanup()
      mount({ tool })
      expect(screen.queryByTestId('colour-ff365c')).toBeNull()
    }
  })

  it('reports the brush a drawing tool was given', () => {
    const colours: string[] = []
    const sizes: number[] = []
    mount({ tool: 'freehand', onColour: (c) => colours.push(c), onSize: (s) => sizes.push(s) })
    fireEvent.click(screen.getByTestId('colour-4ade80'))
    fireEvent.click(screen.getByTestId('size-12'))
    expect(colours).toEqual(['4ade80'])
    expect(sizes).toEqual([12])
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
