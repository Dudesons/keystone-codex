// ABOUTME: The bar every dungeon page wears: name, forces, packs, timer, and the fixed tab menu
// ABOUTME: (Overview, Codex, Route). Page-specific controls come in as children.

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { DungeonLookup } from '../lib/data'
import { getDungeonContent } from '../lib/content'
import { useI18n } from '../lib/i18n/context'
import LocaleSwitcher from './LocaleSwitcher'
import { useSearch } from './SearchPalette'

/** Which of the three fixed tabs is current. */
export type DungeonTab = 'overview' | 'codex' | 'route'

export default function DungeonHeader({
  slug,
  lookup,
  view,
  note,
  children,
}: {
  slug: string
  lookup: DungeonLookup
  view: DungeonTab
  note?: string
  children?: ReactNode
}) {
  const { t, plural, locale } = useI18n()
  const { open: openSearch } = useSearch()
  const content = getDungeonContent(slug, locale)

  // Reused by every tab: the active one carries the gold treatment, the rest stay dim until
  // hovered. Real links, not buttons — a tab is an address, so it has to be one.
  const tab = (value: DungeonTab, to: string, label: string) => (
    <Link
      to={to}
      className={`rounded px-3 py-1 text-xs font-semibold transition ${
        view === value ? 'bg-gold-500/15 text-gold-400' : 'text-ink-400 hover:text-ink-100'
      }`}
    >
      {label}
    </Link>
  )

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
        <button
          onClick={openSearch}
          className="rounded border border-ink-800 px-2 py-1 text-xs text-ink-400 transition hover:border-gold-500 hover:text-gold-400"
        >
          {t('search.open')}
        </button>
        <div className="flex items-center gap-1 rounded-lg border border-ink-800 bg-ink-900 p-0.5">
          {tab('overview', `/d/${slug}`, t('tab.overview'))}
          {tab('codex', `/d/${slug}/codex`, t('tab.codex'))}
          {tab('route', `/d/${slug}/route`, t('tab.route'))}
        </div>
        <LocaleSwitcher />
      </div>
    </header>
  )
}
