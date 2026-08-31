// ABOUTME: Tests access to the generated MDT data: pool index, lookups, spells and URLs.
// ABOUTME: Runs against the committed data, so a broken regeneration fails here.

import { describe, expect, it } from 'vitest'
import {
  cloneKey,
  countForces,
  dungeonList,
  getDungeon,
  getLookup,
  mdtRelease,
  getNpcLabel,
  getSpell,
  iconUrl,
  mapUrl,
  parseCloneKey,
  portraitUrl,
  wowheadUrl,
} from './data'
import { MAP_HEIGHT, MAP_WIDTH } from './geometry'
import { DEFAULT_LOCALE } from './i18n/locales'

const SLUG = 'altar-of-fangs'

describe('Pool index', () => {
  it("exposes the season's dungeons", () => {
    expect(dungeonList.length).toBeGreaterThan(0)
    for (const d of dungeonList) {
      expect(d.slug).toBeTruthy()
      expect(d.mdtIndex).toBeGreaterThan(0)
      expect(d.totalCount).toBeGreaterThan(0)
    }
  })

  it('has a data file for every dungeon it announces', () => {
    for (const d of dungeonList) {
      expect(getDungeon(d.slug), d.slug).toBeDefined()
    }
  })

  it('returns undefined for an unknown dungeon', () => {
    expect(getDungeon('no-such-dungeon')).toBeUndefined()
  })
})

describe('Spells', () => {
  it('resolves a spell extracted from MDT', () => {
    const spell = getSpell(5543)
    expect(spell).toBeDefined()
    expect(spell!.name).toBe('Fade Out')
  })

  it('returns undefined for a spell absent from the data set', () => {
    expect(getSpell(999_999_999)).toBeUndefined()
  })

  it('serves the label in the requested language', () => {
    expect(getSpell(1_306_911, 'en')!.name).toBe('Dismember')
    expect(getSpell(1_306_911, 'fr')!.name).toBe('Démembrer')
  })

  it('localizes cast time and description too, not just the name', () => {
    const fr = getSpell(1_306_911, 'fr')!
    expect(fr.castTime).toBe("3 s d'incantation")
    expect(fr.range).toBe('Portée illimitée')
    expect(fr.description).toContain('dégâts physiques')
  })

  it('keeps a single icon whatever the language', () => {
    expect(getSpell(1_306_911, 'fr')!.icon).toBe(getSpell(1_306_911, 'en')!.icon)
  })

  it('takes the default language when none is given', () => {
    expect(getSpell(1_306_911)).toEqual(getSpell(1_306_911, DEFAULT_LOCALE))
  })
})

describe('Creature labels', () => {
  const chieftain = getLookup(SLUG)!.enemyById.get(270_306)!
  /**
   * Thundering Totem, in King's Rest: MDT gives it a `creatureType` that Wowhead omits, so it
   * is what the type fallback is for.
   *
   * That MDT's English name outranks Wowhead's is `buildNpcText`'s rule, not `getNpcLabel`'s,
   * and it is pinned in `scripts/wowhead-tooltip.test.mjs` against real Wowhead fixtures —
   * warning included. Asserting it here again needed a creature the two actually disagreed
   * about, and MDT has since renamed this one to match Wowhead.
   */
  const totem = getLookup('kings-rest')!.enemyById.get(135_761)!

  it('serves the mob name in the requested language', () => {
    expect(getNpcLabel(chieftain, 'en').name).toBe('Ritual Chieftain')
    expect(getNpcLabel(chieftain, 'fr').name).toBe('Chef du rituel')
  })

  it('localizes the creature type too, not just the name', () => {
    expect(getNpcLabel(chieftain, 'en').type).toBe('Humanoid')
    expect(getNpcLabel(chieftain, 'fr').type).toBe('Humanoïde')
  })

  it("falls back to MDT's creature type rather than leaving a hole", () => {
    // Wowhead gives this one no type at all; MDT says "Totem". A reader in either language
    // sees that rather than nothing.
    expect(getNpcLabel(totem, 'en').type).toBe('Totem')
    expect(getNpcLabel(totem, 'fr').type).toBe('Totem')
  })

  it('treats MDT\'s "Not specified" as no type at all', () => {
    // It is MDT's placeholder for a creature it files under nothing, not a creature type.
    // Falling back to it would print an English phrase into a French card, and say nothing
    // in either language.
    const coffin = getLookup('kings-rest')!.enemyById.get(136_256)!
    expect(coffin.creatureType).toBe('Not specified')
    expect(getNpcLabel(coffin, 'en').type).toBeUndefined()
    expect(getNpcLabel(coffin, 'fr').type).toBeUndefined()
  })

  it("falls back to MDT's name for a creature the pipeline never resolved", () => {
    // The invariant that a mob renders from MDT data alone reaches this too: an id Wowhead
    // has never answered for must still have a name.
    const unresolved = { ...chieftain, id: 888_002, name: 'Unresolved', creatureType: undefined }
    expect(getNpcLabel(unresolved, 'fr')).toEqual({ name: 'Unresolved', type: undefined })
  })

  it('takes the default language when none is given', () => {
    expect(getNpcLabel(chieftain)).toEqual(getNpcLabel(chieftain, DEFAULT_LOCALE))
  })
})

describe('wowheadUrl', () => {
  it('adds no prefix for English: wowhead.com serves English at its root', () => {
    expect(wowheadUrl(1_306_911, 'en')).toBe('https://www.wowhead.com/spell=1306911')
  })

  it('prefixes the language for the others', () => {
    expect(wowheadUrl(1_306_911, 'fr')).toBe('https://www.wowhead.com/fr/spell=1306911')
  })

  it('falls back to the default language with no argument', () => {
    expect(wowheadUrl(1_306_911)).toBe(wowheadUrl(1_306_911, DEFAULT_LOCALE))
  })
})

describe('Clone keys', () => {
  it('round-trips', () => {
    expect(parseCloneKey(cloneKey(7, 12))).toEqual({ enemyIdx: 7, cloneIdx: 12 })
  })

  it('produces a readable key', () => {
    expect(cloneKey(7, 12)).toBe('7:12')
  })
})

describe('getLookup', () => {
  it('returns undefined for an unknown dungeon', () => {
    expect(getLookup('no-such-dungeon')).toBeUndefined()
  })

  it('memoizes its result', () => {
    expect(getLookup(SLUG)).toBe(getLookup(SLUG))
  })

  it('indexes mobs by MDT index, never by position', () => {
    const lookup = getLookup(SLUG)!
    for (const enemy of lookup.dungeon.enemies) {
      expect(lookup.enemyByIdx.get(enemy.mdtIdx)).toBe(enemy)
    }
  })

  it('also indexes mobs by npcId', () => {
    const lookup = getLookup(SLUG)!
    const first = lookup.dungeon.enemies[0]
    expect(lookup.enemyById.get(first.id)).toBeDefined()
  })
})

describe('CC coverage', () => {
  const hasSome = (slug: string) => (getDungeon(slug)?.enemies ?? []).some((e) => e.cc.length > 0)
  const filled = dungeonList.filter((d) => hasSome(d.slug))
  const blank = dungeonList.filter((d) => !hasSome(d.slug))

  it('the pool holds both cases: dungeons MDT filled in and dungeons it left blank', () => {
    expect(filled.length).toBeGreaterThan(0)
    expect(blank.length).toBeGreaterThan(0)
  })

  it('reports data when at least one mob declares CC', () => {
    for (const d of filled) expect(getLookup(d.slug)!.hasCcData, d.slug).toBe(true)
  })

  /** No mob declaring anything means MDT never filled the dungeon in, not that every mob
   *  in it resists every form of control. */
  it('reports none when no mob declares any CC', () => {
    for (const d of blank) expect(getLookup(d.slug)!.hasCcData, d.slug).toBe(false)
  })
})

describe('Sparse clone indices', () => {
  /**
   * Deleting a clone in MDT leaves a hole, and that index is exactly what routes reference:
   * renumbering it would silently break every existing route.
   */
  const withHoles = dungeonList.flatMap((d) => {
    const dungeon = getDungeon(d.slug)
    if (!dungeon) return []
    return dungeon.enemies
      .filter((e) => e.clones.some((c, i) => c.mdtIdx !== i + 1))
      .map((e) => ({ slug: d.slug, enemy: e }))
  })

  it('the pool does contain mobs with holes in their clone indices', () => {
    expect(withHoles.length).toBeGreaterThan(0)
  })

  it('keeps the indices exactly as MDT gives them, without compacting', () => {
    for (const { slug, enemy } of withHoles) {
      const lookup = getLookup(slug)!
      for (const clone of enemy.clones) {
        expect(
          lookup.cloneByKey.get(cloneKey(enemy.mdtIdx, clone.mdtIdx)),
          `${slug} ${enemy.name} clone ${clone.mdtIdx}`,
        ).toBeDefined()
      }
      // The missing positions must under no circumstances have been filled in.
      const present = new Set(enemy.clones.map((c) => c.mdtIdx))
      const max = Math.max(...present)
      for (let i = 1; i <= max; i++) {
        if (present.has(i)) continue
        expect(lookup.cloneByKey.has(cloneKey(enemy.mdtIdx, i))).toBe(false)
      }
    }
  })
})

describe('Packs and lone clones', () => {
  const lookup = getLookup(SLUG)!

  it('groups clones pulled together under the same `g`', () => {
    expect(lookup.packs.size).toBeGreaterThan(0)
    for (const [g, pack] of lookup.packs) {
      expect(pack.g).toBe(g)
      expect(pack.members.length).toBeGreaterThan(0)
      for (const ref of pack.members) {
        const entry = lookup.cloneByKey.get(cloneKey(ref.enemyIdx, ref.cloneIdx))
        expect(entry).toBeDefined()
        expect(entry!.clone.g).toBe(g)
      }
    }
  })

  it("sums its members' forces", () => {
    for (const pack of lookup.packs.values()) {
      const expected = pack.members.reduce(
        (n, ref) => n + lookup.cloneByKey.get(cloneKey(ref.enemyIdx, ref.cloneIdx))!.enemy.count,
        0,
      )
      expect(pack.count).toBe(expected)
    }
  })

  it('keeps every pack centre and hull inside the image', () => {
    for (const pack of lookup.packs.values()) {
      expect(Number.isFinite(pack.center.x)).toBe(true)
      expect(Number.isFinite(pack.center.y)).toBe(true)
      expect(pack.hull.length).toBeGreaterThan(0)
      // Generous margin: the hull is grown 26 px beyond the real positions.
      expect(pack.center.x).toBeGreaterThan(-200)
      expect(pack.center.x).toBeLessThan(MAP_WIDTH + 200)
      expect(pack.center.y).toBeGreaterThan(-200)
      expect(pack.center.y).toBeLessThan(MAP_HEIGHT + 200)
    }
  })

  it('keeps lone clones (`g` null) out of packs: each pulls on its own', () => {
    const inSomePack = new Set(
      [...lookup.packs.values()].flatMap((p) => p.members.map((m) => cloneKey(m.enemyIdx, m.cloneIdx))),
    )
    for (const ref of lookup.loners) {
      const key = cloneKey(ref.enemyIdx, ref.cloneIdx)
      expect(inSomePack.has(key)).toBe(false)
      expect(lookup.cloneByKey.get(key)!.clone.g).toBeNull()
    }
  })

  it('files every clone either in a pack or among the loners', () => {
    const filed = new Set([
      ...[...lookup.packs.values()].flatMap((p) => p.members.map((m) => cloneKey(m.enemyIdx, m.cloneIdx))),
      ...lookup.loners.map((r) => cloneKey(r.enemyIdx, r.cloneIdx)),
    ])
    expect(filed.size).toBe(lookup.cloneByKey.size)
  })
})

describe('countForces', () => {
  const lookup = getLookup(SLUG)!

  it('adds up the forces of the referenced clones', () => {
    const pack = [...lookup.packs.values()][0]
    expect(countForces(lookup, pack.members)).toBe(pack.count)
  })

  it('ignores references that match nothing', () => {
    expect(countForces(lookup, [{ enemyIdx: 9999, cloneIdx: 9999 }])).toBe(0)
  })

  it('returns zero with no reference', () => {
    expect(countForces(lookup, [])).toBe(0)
  })

  it("covers the dungeon's required total when everything is picked up", () => {
    const all = [...lookup.cloneByKey.keys()].map(parseCloneKey)
    expect(countForces(lookup, all)).toBeGreaterThanOrEqual(lookup.dungeon.totalCount)
  })
})

describe('Asset URLs', () => {
  const base = import.meta.env.BASE_URL

  it('start from BASE_URL, to stay valid under a GitHub Pages subpath', () => {
    expect(iconUrl('spell_nature_invisibilty')).toBe(`${base}icons/spell_nature_invisibilty.jpg`)
    expect(portraitUrl(12345)).toBe(`${base}portraits/12345.webp`)
    expect(mapUrl(SLUG)).toBe(`${base}maps/${SLUG}.webp`)
  })
})

describe('MDT provenance', () => {
  it('names the MDT release the data was extracted from, so a page can credit it', () => {
    expect(mdtRelease.version).toMatch(/^\d+\.\d+/)
  })

  it('names the expansion that release covers', () => {
    expect(mdtRelease.expansion).toBeTruthy()
  })
})
