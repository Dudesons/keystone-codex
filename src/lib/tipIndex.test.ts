// ABOUTME: Tests the season-wide tips grouping against the real dungeon pool, in both languages.
// ABOUTME: Asserts lower bounds, so writing another card raises the page without failing the suite.

import { describe, expect, it } from 'vitest'
import { getSeasonTips } from './tipIndex'
import { dungeonList } from './data'
import { getHighlights } from './highlights'

describe('getSeasonTips', () => {
  it('lists only dungeons that have tips', () => {
    const groups = getSeasonTips('en')
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) expect(group.tips.length).toBeGreaterThan(0)
  })

  it('holds the one tipped mob the codex has written', () => {
    const vale = getSeasonTips('en').find((g) => g.slug === 'the-blinding-vale')
    expect(vale?.tips.map((t) => t.npcId)).toContain(254850)
  })

  it('names each dungeon as the rest of the app does', () => {
    for (const group of getSeasonTips('en')) {
      const summary = dungeonList.find((d) => d.slug === group.slug)
      expect(group.name).toBe(summary?.englishName)
    }
  })

  it('keeps the order getHighlights already chose', () => {
    for (const group of getSeasonTips('en')) {
      expect(group.tips).toEqual(getHighlights(group.slug, 'en').tips)
    }
  })

  it('works in French, with the same dungeons', () => {
    expect(getSeasonTips('fr').map((g) => g.slug)).toEqual(getSeasonTips('en').map((g) => g.slug))
  })
})
