// ABOUTME: The participant's own name, as shown wherever a session can be entered.
// ABOUTME: Keeps its own buffer so a trailing space survives being typed.

import { useEffect, useState, type Ref } from 'react'
import type { I18n } from '../../lib/i18n/context'

/**
 * The participant's own name: blank on a first visit, so choosing one is a real step rather
 * than accepting an invented default without reading it. Stays editable once a session is
 * open, since names get picked badly the first time.
 *
 * Shared by the panel and the arrival dialog: an invitation is refused without a name, so the
 * field has to be within reach of whichever of them is asking.
 */
export default function NameField({
  identity,
  onSetIdentity,
  t,
  ref,
}: {
  identity: string | null
  onSetIdentity: (name: string) => void
  t: I18n['t']
  /** Set only where the field is the first thing to answer, which the dialog decides. */
  ref?: Ref<HTMLInputElement>
}) {
  // `identity` comes back trimmed on every call (`setIdentity` normalises what gets persisted
  // and replicated to peers), so binding the input straight to it would erase a trailing space
  // the instant it was typed, and the next character would land against the trimmed string.
  // This field keeps its own buffer holding exactly what was typed, and only accepts a value
  // from outside when it isn't simply the trimmed echo of what this buffer already holds —
  // otherwise a change from elsewhere (the stored name loading, a session reset) would never
  // reach the field.
  const [value, setValue] = useState(identity ?? '')
  useEffect(() => {
    setValue((current) => (current.trim() === (identity ?? '') ? current : identity ?? ''))
  }, [identity])

  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-[10px] font-bold tracking-widest text-ink-400">
        {t('collab.name')}
      </span>
      <input
        ref={ref}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          onSetIdentity(e.target.value)
        }}
        placeholder={t('collab.namePlaceholder')}
        maxLength={20}
        className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-100 focus:border-gold-500 focus:outline-none"
      />
    </label>
  )
}
