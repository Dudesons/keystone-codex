// ABOUTME: A dungeon's briefing page: the shared header, the dungeon's written summary if it
// ABOUTME: has one, its mobs table, its trap list, its boss cards, and a placeholder when the codex holds nothing at all.

import { Link, useParams } from 'react-router-dom'
import DungeonHeader from '../components/DungeonHeader'
import MobTable from '../components/highlights/MobTable'
import TrapList from '../components/highlights/TrapList'
import BossStrip from '../components/highlights/BossStrip'
import { getLookup } from '../lib/data'
import { getDungeonContent } from '../lib/content'
import { getHighlights } from '../lib/highlights'
import { useI18n } from '../lib/i18n/context'

export default function HighlightsPage() {
  const { slug = '' } = useParams()
  const { t, locale } = useI18n()
  const lookup = getLookup(slug)

  if (!lookup) {
    return (
      <div className="p-8">
        <p className="text-ink-300">{t('dungeon.unknown')}</p>
        <Link to="/" className="text-gold-400 hover:underline">
          {t('dungeon.backHome')}
        </Link>
      </div>
    )
  }

  const content = getDungeonContent(slug, locale)
  const highlights = getHighlights(slug, locale)
  const empty =
    !highlights.mobs.length && !highlights.traps.length && !highlights.bosses.length

  return (
    <div className="flex h-full flex-col">
      <DungeonHeader slug={slug} lookup={lookup} view="highlights" />

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {content?.summary && (
            <p className="mb-8 max-w-3xl text-sm leading-relaxed text-ink-300">
              {content.summary}
            </p>
          )}
          {highlights.mobs.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-2 text-xs font-semibold tracking-[0.2em] text-gold-500">
                {t('highlights.mobs')}
              </h2>
              <MobTable slug={slug} mobs={highlights.mobs} />
            </section>
          )}
          {highlights.traps.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 text-xs font-semibold tracking-[0.2em] text-gold-500">
                {t('highlights.traps')}
              </h2>
              <TrapList slug={slug} traps={highlights.traps} />
            </section>
          )}
          {highlights.bosses.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 text-xs font-semibold tracking-[0.2em] text-gold-500">
                {t('highlights.bosses')}
              </h2>
              <BossStrip slug={slug} bosses={highlights.bosses} />
            </section>
          )}
          {empty && <p className="text-sm text-ink-400">{t('highlights.empty')}</p>}
        </div>
      </div>
    </div>
  )
}
