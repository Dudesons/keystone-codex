// ABOUTME: A dungeon's briefing page: the shared header, the dungeon's written summary if it
// ABOUTME: has one, and a placeholder sentence when the codex holds nothing for it at all.

import { Link, useParams } from 'react-router-dom'
import DungeonHeader from '../components/DungeonHeader'
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
          {empty && <p className="text-sm text-ink-400">{t('highlights.empty')}</p>}
        </div>
      </div>
    </div>
  )
}
