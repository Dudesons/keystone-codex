// ABOUTME: A dungeon's briefing page: the shared header, the dungeon's written summary if it
// ABOUTME: has one, its mobs table, its trap list, and its boss cards.

import { useParams } from 'react-router-dom'
import DungeonHeader from '../components/DungeonHeader'
import UnknownDungeon from '../components/UnknownDungeon'
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

  if (!lookup) return <UnknownDungeon />

  const content = getDungeonContent(slug, locale)
  const highlights = getHighlights(slug, locale)

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
        </div>
      </div>
    </div>
  )
}
