// ABOUTME: The season's tips, grouped by dungeon — what the /tips page lists.
// ABOUTME: Pure derivation over getHighlights: a card written tomorrow raises the page for free.

/**
 * Every tip in the season, dungeon by dungeon.
 *
 * Nothing is authored for this view. `getHighlights` already collects the mobs carrying tips and
 * sorts them most-dangerous-first, so the index inherits that order rather than choosing a second
 * one that could disagree with the briefing's.
 *
 * `dungeonList` is the season pool, which is also what keeps `content/__fixtures__/` out: a
 * fixture has no entry in the generated dungeon index.
 */

import { dungeonList } from './data'
import { getHighlights, type HighlightTip } from './highlights'
import { DEFAULT_LOCALE, type Locale } from './i18n/locales'

export interface DungeonTips {
  slug: string
  /** English, as every other view names a dungeon — MDT has no other. */
  name: string
  tips: HighlightTip[]
}

/**
 * A dungeon nobody has written a tip for is left out rather than shown empty: a column of empty
 * headings reads as a broken page, not an honest one.
 */
export function getSeasonTips(locale: Locale = DEFAULT_LOCALE): DungeonTips[] {
  return dungeonList
    .map((summary) => ({
      slug: summary.slug,
      name: summary.englishName,
      tips: getHighlights(summary.slug, locale).tips,
    }))
    .filter((group) => group.tips.length > 0)
}
