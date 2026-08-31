// ABOUTME: The season-wide tips index: every written tip, grouped under the dungeon it belongs to.
// ABOUTME: A dungeon's name opens its map; a tip's chip opens the map on the pull it names.

import { Link } from 'react-router-dom'
import { getSeasonTips } from '../lib/tipIndex'
import { useI18n } from '../lib/i18n/context'
import LocaleSwitcher from '../components/LocaleSwitcher'
import SiteFooter from '../components/SiteFooter'
import TipCard from '../components/highlights/TipCard'

export default function TipsIndex() {
  const { t, locale } = useI18n()
  const groups = getSeasonTips(locale)

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <Link to="/" className="text-sm text-ink-400 hover:text-gold-400">
            ←
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-ink-100">{t('tipsIndex.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-400">{t('tipsIndex.intro')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LocaleSwitcher />
        </div>
      </header>

      {groups.length === 0 && <p className="text-sm text-ink-400">{t('tipsIndex.empty')}</p>}

      {groups.map((group) => (
        <section key={group.slug} className="mb-10">
          <h2 className="mb-3">
            <Link
              to={`/d/${group.slug}/codex`}
              className="text-xs font-semibold tracking-[0.2em] text-gold-500 hover:text-gold-400"
            >
              {group.name}
            </Link>
          </h2>
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            {group.tips.map((entry) => (
              <TipCard key={entry.npcId} slug={group.slug} entry={entry} />
            ))}
          </div>
        </section>
      ))}

      <SiteFooter />
    </div>
  )
}
