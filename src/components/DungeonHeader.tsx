// ABOUTME: The bar both dungeon pages wear: name, forces, packs, timer, and the page toggle.
// ABOUTME: Page-specific controls come in as children, between the statistics and the switcher.

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { DungeonLookup } from '../lib/data'
import { getDungeonContent } from '../lib/content'
import { useI18n } from '../lib/i18n/context'
import LocaleSwitcher from './LocaleSwitcher'

export default function DungeonHeader({
  slug,
  lookup,
  view,
  note,
  children,
}: {
  slug: string
  lookup: DungeonLookup
  view: 'highlights' | 'map'
  note?: string
  children?: ReactNode
}) {
  const { t, plural, locale } = useI18n()
  const content = getDungeonContent(slug, locale)

  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-ink-800 px-4 py-2.5">
      <Link to="/" className="text-sm text-ink-400 hover:text-gold-400">
        ←
      </Link>
      <div className="min-w-0">
        <h1 className="truncate font-semibold text-ink-100">{lookup.dungeon.englishName}</h1>
        <p className="text-[11px] text-ink-400">
          {plural('common.forces', lookup.dungeon.totalCount)} ·{' '}
          {plural('common.packs', lookup.packs.size)}
          {content?.timer ? ` · ${t('common.minutes', { n: content.timer })}` : ''}
          {note ? ` · ${note}` : ''}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <Link
          to={view === 'map' ? `/d/${slug}` : `/d/${slug}/map`}
          className="rounded border border-ink-700 px-3 py-1 text-xs font-semibold text-ink-300 transition hover:border-gold-500 hover:text-gold-400"
        >
          {view === 'map' ? t('dungeon.toHighlights') : t('dungeon.toMap')}
        </Link>
        <LocaleSwitcher />
      </div>
    </header>
  )
}
