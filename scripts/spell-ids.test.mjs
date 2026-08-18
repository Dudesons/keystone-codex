// ABOUTME: Tests which spells the asset fetch has to resolve: mob spells and POI items.
// ABOUTME: A pure rule, kept apart from fetch-assets.mjs, which runs its job at import.

import { describe, expect, it } from 'vitest'
import { collectSpellIds } from './spell-ids.mjs'

describe('collectSpellIds', () => {
  it('collects the spells of every mob', () => {
    const dungeons = [
      { enemies: [{ spells: [{ id: 300 }, { id: 100 }] }], pois: [] },
      { enemies: [{ spells: [{ id: 200 }] }], pois: [] },
    ]
    expect(collectSpellIds(dungeons)).toEqual([100, 200, 300])
  })

  it('collects the spell a usable item points at', () => {
    const dungeons = [
      { enemies: [], pois: [{ type: 'genericItem', info: { texture: 1, spellId: 1223570, size: 15 } }] },
    ]
    expect(collectSpellIds(dungeons)).toEqual([1223570])
  })

  it('ignores a POI with no spell, such as an entrance', () => {
    const dungeons = [{ enemies: [], pois: [{ type: 'dungeonEntrance', sizeMult: 1.5 }] }]
    expect(collectSpellIds(dungeons)).toEqual([])
  })

  it('counts a spell shared by several items once', () => {
    const dungeons = [
      {
        enemies: [{ spells: [{ id: 1270638 }] }],
        pois: [{ info: { spellId: 1270638 } }, { info: { spellId: 1270638 } }],
      },
    ]
    expect(collectSpellIds(dungeons)).toEqual([1270638])
  })
})
