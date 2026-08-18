// ABOUTME: The route tab's tool strip: which object to place, and undo for the ones you placed.
// ABOUTME: Stateless — the page owns the active tool, because the map gesture needs it too.

import { useI18n } from '../../lib/i18n/context'
import type { TranslationKey } from '../../lib/i18n/en'
import BrushControls from './BrushControls'

export type Tool = 'note' | 'arrow' | 'freehand' | 'select' | 'erase'

const TOOLS: { tool: Tool; key: TranslationKey; glyph: string }[] = [
  { tool: 'select', key: 'map.toolSelect', glyph: '✥' },
  { tool: 'note', key: 'map.toolNote', glyph: '!' },
  { tool: 'arrow', key: 'map.toolArrow', glyph: '↗' },
  { tool: 'freehand', key: 'map.toolFreehand', glyph: '✎' },
  { tool: 'erase', key: 'map.toolErase', glyph: '⌫' },
]

/** The tools that draw, and so the ones the brush below the strip has anything to say about. */
const DRAWS = new Set<Tool>(['arrow', 'freehand'])

export default function ObjectToolbar({
  tool,
  onTool,
  colour,
  size,
  onColour,
  onSize,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  tool: Tool | null
  onTool: (tool: Tool | null) => void
  /** The brush the next stroke takes. MDT's hex, without the leading hash. */
  colour: string
  size: number
  onColour: (colour: string) => void
  onSize: (size: number) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-2 border-b border-ink-800 pb-2">
    <div className="flex items-center gap-1">
      {TOOLS.map(({ tool: candidate, key, glyph }) => {
        const active = tool === candidate
        return (
          <button
            key={candidate}
            // Clicking the active tool drops it, so the strip is its own way back to panning.
            onClick={() => onTool(active ? null : candidate)}
            title={t(key)}
            aria-label={t(key)}
            data-active={active ? 'true' : undefined}
            className={`rounded px-2 py-1 text-sm transition ${
              active ? 'bg-gold-500 text-ink-950' : 'text-ink-300 hover:bg-ink-800'
            }`}
          >
            {glyph}
          </button>
        )
      })}
      <span className="ml-auto flex gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title={t('map.undo')}
          aria-label={t('map.undo')}
          className="rounded px-2 py-1 text-sm text-ink-300 hover:bg-ink-800 disabled:opacity-40"
        >
          ↶
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title={t('map.redo')}
          aria-label={t('map.redo')}
          className="rounded px-2 py-1 text-sm text-ink-300 hover:bg-ink-800 disabled:opacity-40"
        >
          ↷
        </button>
      </span>
    </div>
    {/* Only under a tool that draws: the brush says nothing about placing a note, picking an
        object up or rubbing one out, and a control that cannot affect the next click is noise. */}
    {tool && DRAWS.has(tool) && (
      <BrushControls colour={colour} size={size} onColour={onColour} onSize={onSize} />
    )}
    </div>
  )
}
