// ABOUTME: The column's editing surface: a placed object's text, and a way to remove it.
// ABOUTME: Stateless — the page holds the object and writes each change to the document.

import { useI18n } from '../../lib/i18n/context'
import type { TranslationKey } from '../../lib/i18n/en'
import type { MdtObject } from '../../lib/mdt/objects'
import BrushControls from './BrushControls'

export default function ObjectEditor({
  object,
  hint = 'map.notePlaceHint',
  onChange,
  onDelete,
}: {
  object: MdtObject | null
  /** What to say while nothing is selected. The active tool decides it; this panel only shows it. */
  hint?: TranslationKey
  onChange: (object: MdtObject) => void
  onDelete: () => void
}) {
  const { t } = useI18n()

  if (!object) {
    return <p className="text-xs text-ink-400">{t(hint)}</p>
  }

  return (
    <div className="space-y-2">
      {object.kind === 'note' && (
        <label className="block space-y-1 text-xs text-ink-400">
          <span>{t('map.noteText')}</span>
          <textarea
            aria-label={t('map.noteText')}
            value={object.text}
            onChange={(e) => onChange({ ...object, text: e.target.value })}
            rows={4}
            className="w-full rounded border border-ink-700 bg-ink-850 px-2 py-1 text-ink-100"
          />
        </label>
      )}
      {object.kind === 'stroke' && (
        // The same strip the toolbar carries, pointed at this stroke instead of at the next one:
        // a drawing in the wrong colour is worth recolouring rather than redrawing.
        <BrushControls
          colour={object.color}
          size={object.size}
          onColour={(color) => onChange({ ...object, color })}
          onSize={(size) => onChange({ ...object, size })}
        />
      )}
      <button
        onClick={onDelete}
        className="rounded border border-threat-lethal/50 px-2 py-1 text-xs text-threat-lethal hover:bg-threat-lethal/10"
      >
        {t('common.delete')}
      </button>
    </div>
  )
}
