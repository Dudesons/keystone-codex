// ABOUTME: The home page: one card per dungeon in the season pool, with its codex progress.
// ABOUTME: Progress counts what the reader sees, fallback to the base language included.

import { Link } from 'react-router-dom'
import { dungeonList, getDungeon, mapUrl } from '../lib/data'
import { contentProgress, getDungeonContent } from '../lib/content'
import { useI18n } from '../lib/i18n/context'
import LocaleSwitcher from '../components/LocaleSwitcher'
import SiteFooter from '../components/SiteFooter'
import { useSearch } from '../components/SearchPalette'

export default function Home() {
  const { t, plural, locale } = useI18n()
  const { open: openSearch } = useSearch()

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500">{t('home.eyebrow')}</p>
          <h1 className="mt-1 text-3xl font-bold text-ink-100">{t('home.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-400">
            {t('home.intro', { n: dungeonList.length })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={openSearch}
            className="rounded border border-ink-700 px-2 py-1 text-xs text-ink-400 transition hover:border-gold-500 hover:text-gold-400"
          >
            {t('search.open')}
          </button>
          <LocaleSwitcher />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dungeonList.map((summary) => {
          const dungeon = getDungeon(summary.slug)
          const content = getDungeonContent(summary.slug, locale)
          const progress = dungeon
            ? contentProgress(summary.slug, [...new Set(dungeon.enemies.map((e) => e.id))], locale)
            : { written: 0, total: 0 }

          return (
            <Link
              key={summary.slug}
              to={`/d/${summary.slug}`}
              className="group overflow-hidden rounded-lg border border-ink-700 bg-ink-900 transition hover:border-gold-500"
            >
              <div className="relative h-32 overflow-hidden bg-ink-950">
                <img
                  src={mapUrl(summary.slug)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover opacity-60 transition group-hover:opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-transparent" />
              </div>

              <div className="p-3">
                <h2 className="font-semibold text-ink-100 group-hover:text-gold-400">
                  {summary.englishName}
                </h2>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-400">
                  <span>{plural('home.bosses', summary.bosses)}</span>
                  <span>{plural('common.packs', summary.packCount)}</span>
                  <span>{plural('common.forces', summary.totalCount)}</span>
                  {content?.timer && (
                    <span className="text-gold-500">{t('common.minutes', { n: content.timer })}</span>
                  )}
                </div>
                {content?.summary && <p className="mt-2 text-xs text-ink-400">{content.summary}</p>}

                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-800">
                    <div
                      className="h-full rounded-full bg-gold-500"
                      style={{ width: `${progress.total ? (progress.written / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-ink-600 tabular-nums">
                    {t('home.cards', { written: progress.written, total: progress.total })}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <SiteFooter />
    </div>
  )
}
