// ABOUTME: The colour and thickness a stroke is drawn in, as two rows of buttons.
// ABOUTME: Stateless — whoever mounts it decides whether it sets the next stroke or an existing one.

import { useI18n } from '../../lib/i18n/context'
import type { TranslationKey } from '../../lib/i18n/en'

/**
 * The colours on offer, as MDT's hex without the leading hash — the form `MdtStroke.color` holds.
 *
 * They are ours, not the addon's: MDT draws with a free colour picker rather than a palette, so
 * there was nothing to copy. Eight hues that stay apart from each other and read against a
 * dungeon map, starting with the one every stroke in the real export we have carries.
 */
export const STROKE_COLOURS: { colour: string; key: TranslationKey }[] = [
  { colour: 'ff365c', key: 'map.colourRed' },
  { colour: 'ff8a3d', key: 'map.colourOrange' },
  { colour: 'ffd23d', key: 'map.colourYellow' },
  { colour: '4ade80', key: 'map.colourGreen' },
  { colour: '38bdf8', key: 'map.colourBlue' },
  { colour: 'a78bfa', key: 'map.colourPurple' },
  { colour: 'f472b6', key: 'map.colourPink' },
  { colour: 'ffffff', key: 'map.colourWhite' },
]

/**
 * MDT stores a brush size as a plain number and its own picker is a slider, so these three are a
 * choice about the UI rather than about the format: a slider costs a drag and a read to answer
 * "how thick is this", where three buttons answer it at a glance. Any number a preset arrives
 * with is still drawn and still exported — nothing here narrows what a stroke may be.
 */
export const STROKE_SIZES: { size: number; key: TranslationKey }[] = [
  { size: 4, key: 'map.sizeSmall' },
  { size: 7, key: 'map.sizeMedium' },
  { size: 12, key: 'map.sizeLarge' },
]

/** What a stroke is drawn in until someone picks otherwise: MDT's own red, at the middle width. */
export const DEFAULT_COLOUR = STROKE_COLOURS[0].colour
export const DEFAULT_SIZE = STROKE_SIZES[1].size

export default function BrushControls({
  colour,
  size,
  onColour,
  onSize,
}: {
  /** MDT's hex, without the leading hash. Not necessarily one of `STROKE_COLOURS`. */
  colour: string
  size: number
  onColour: (colour: string) => void
  onSize: (size: number) => void
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wide text-ink-500">{t('map.colour')}</span>
        <div className="flex flex-wrap gap-1">
          {STROKE_COLOURS.map(({ colour: candidate, key }) => {
            const active = candidate === colour
            return (
              <button
                key={candidate}
                data-testid={`colour-${candidate}`}
                aria-pressed={active}
                aria-label={t(key)}
                title={t(key)}
                onClick={() => onColour(candidate)}
                style={{ backgroundColor: `#${candidate}` }}
                className={`h-6 w-6 rounded border transition ${
                  active ? 'border-gold-400 ring-2 ring-gold-400/60' : 'border-ink-700 hover:border-ink-500'
                }`}
              />
            )
          })}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wide text-ink-500">{t('map.thickness')}</span>
        <div className="flex gap-1">
          {STROKE_SIZES.map(({ size: candidate, key }) => {
            const active = candidate === size
            return (
              <button
                key={candidate}
                data-testid={`size-${candidate}`}
                aria-pressed={active}
                aria-label={t(key)}
                title={t(key)}
                onClick={() => onSize(candidate)}
                className={`flex h-6 flex-1 items-center justify-center rounded border transition ${
                  active ? 'border-gold-400 bg-gold-500/15' : 'border-ink-700 hover:border-ink-500'
                }`}
              >
                {/* The button shows the width it sets, rather than naming it: the label is on the
                    control for a screen reader, and the bar is the same claim for an eye. */}
                <span
                  className="w-4 rounded-full bg-ink-200"
                  style={{ height: `${Math.max(1, Math.round(candidate / 2))}px` }}
                />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
