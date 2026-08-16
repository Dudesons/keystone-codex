/**
 * The EN | FR toggle. The browser decides on first load; this is how you override it.
 *
 * The app has no common shell, so it is placed in the header of each route rather than
 * once at the top.
 */

import { useI18n } from '../lib/i18n/context'
import { LOCALES } from '../lib/i18n/locales'

export default function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-ink-800 bg-ink-900 p-0.5"
      role="group"
      aria-label={t('locale.label')}
    >
      {LOCALES.map((value) => (
        <button
          key={value}
          onClick={() => setLocale(value)}
          aria-pressed={locale === value}
          className={`rounded px-2 py-1 text-[11px] font-semibold transition ${
            locale === value ? 'bg-gold-500/15 text-gold-400' : 'text-ink-500 hover:text-ink-100'
          }`}
        >
          {t(`locale.${value}`)}
        </button>
      ))}
    </div>
  )
}
