// ABOUTME: The column's editing surface: a placed object's text, and a way to remove it.
// ABOUTME: Stateless — the page holds the object and writes each change to the document.

import { useI18n } from '../../lib/i18n/context'
import type { MdtObject } from '../../lib/mdt/objects'

export default function ObjectEditor({
  object,
  onChange,
  onDelete,
}: {
  object: MdtObject | null
  onChange: (object: MdtObject) => void
  onDelete: () => void
}) {
  const { t } = useI18n()

  if (!object) {
    return <p className="text-xs text-ink-400">{t('map.notePlaceHint')}</p>
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
      <button
        onClick={onDelete}
        className="rounded border border-threat-lethal/50 px-2 py-1 text-xs text-threat-lethal hover:bg-threat-lethal/10"
      >
        {t('common.delete')}
      </button>
    </div>
  )
}
