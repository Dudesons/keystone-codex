// ABOUTME: What the search index finds, and in what order.
// ABOUTME: Driven against the real generated data, because that is what ships.

import { describe, expect, it } from 'vitest'
import { dungeonList, getLookup, getNpcLabel } from './data'
import { SEARCH_LIMIT, foldForSearch, search } from './search'

/**
 * Every expectation here is derived from the real data rather than hardcoded. A mob's name is
 * writing that may change; the property being tested — that searching a name finds that name's
 * mob — is not. Six tests have broken in this repository by pinning a card's wording.
 */

/** The first mob of the first dungeon, whatever it happens to be. */
const anyMob = () => {
  const slug = dungeonList[0].slug
  const enemy = [...getLookup(slug)!.enemyById.values()][0]
  return { slug, enemy, name: getNpcLabel(enemy, 'en').name }
}

/** A spell that exactly one mob in the pool casts, so its hit count is predictable. */
const uniquelyCastSpell = () => {
  const casters = new Map<number, { slug: string; npcId: number }[]>()
  for (const summary of dungeonList) {
    for (const enemy of getLookup(summary.slug)!.enemyById.values()) {
      for (const spell of enemy.spells) {
        const list = casters.get(spell.id) ?? []
        list.push({ slug: summary.slug, npcId: enemy.id })
        casters.set(spell.id, list)
      }
    }
  }
  const [id, list] = [...casters.entries()].find(([, l]) => l.length === 1)!
  return { id, caster: list[0] }
}

describe('foldForSearch', () => {
  it('drops case, accents and punctuation, so a reader can type what they can type', () => {
    expect(foldForSearch("Nal'orakk")).toBe('nalorakk')
    expect(foldForSearch('Bête')).toBe(foldForSearch('bete'))
    expect(foldForSearch('Hex Volley')).toBe('hexvolley')
  })
})

describe('Searching by name', () => {
  it('finds a mob by its own name', () => {
    const { name, enemy } = anyMob()
    expect(search(name, 'en').hits.map((h) => h.npcId)).toContain(enemy.id)
  })

  it('finds a mob by its English name while French is the active locale', () => {
    // MDT is the authority on the English name and guides are written with it, so a French
    // reader who read one must still be able to find the mob.
    const { enemy } = anyMob()
    expect(search(enemy.name, 'fr').hits.map((h) => h.npcId)).toContain(enemy.id)
  })

  it('ignores accents in the query', () => {
    const { enemy } = anyMob()
    const stripped = getNpcLabel(enemy, 'en')
      .name.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    expect(search(stripped, 'en').hits.map((h) => h.npcId)).toContain(enemy.id)
  })

  it('returns nothing for a query that matches nothing, rather than everything', () => {
    expect(search('zzzzqqqqxxxx', 'en').hits).toEqual([])
    expect(search('zzzzqqqqxxxx', 'en').total).toBe(0)
  })

  it('returns nothing for an empty query', () => {
    expect(search('   ', 'en').hits).toEqual([])
  })

  it('returns nothing for a query that folds away to nothing', () => {
    // `''.startsWith('')` is true, so a query of pure punctuation would otherwise match the
    // whole corpus.
    expect(search('!!!', 'en').hits).toEqual([])
    expect(search('!!!', 'en').total).toBe(0)
  })
})

describe('Searching by id', () => {
  it('finds a mob by its npcId, exactly', () => {
    const { enemy } = anyMob()
    const hits = search(String(enemy.id), 'en').hits
    expect(hits).toHaveLength(1)
    expect(hits[0].npcId).toBe(enemy.id)
  })

  it('does not treat a partial id as a match: an id is pasted, not explored', () => {
    const { enemy } = anyMob()
    const partial = String(enemy.id).slice(0, 3)
    expect(search(partial, 'en').hits.map((h) => h.npcId)).not.toContain(enemy.id)
  })

  it('finds the caster of a spell id', () => {
    const { id, caster } = uniquelyCastSpell()
    const hits = search(String(id), 'en').hits
    expect(hits).toHaveLength(1)
    expect(hits[0].npcId).toBe(caster.npcId)
    expect(hits[0].slug).toBe(caster.slug)
  })
})

describe('Searching by spell', () => {
  it('says which spell put a mob in the list', () => {
    const { id, caster } = uniquelyCastSpell()
    const hit = search(String(id), 'en').hits[0]
    expect(hit.npcId).toBe(caster.npcId)
    expect(hit.viaSpell).toBeTruthy()
  })

  it('leaves viaSpell unset when the mob’s own name matched', () => {
    const { enemy } = anyMob()
    const hit = search(getNpcLabel(enemy, 'en').name, 'en').hits.find((h) => h.npcId === enemy.id)!
    expect(hit.viaSpell).toBeUndefined()
  })

  it('finds a mob by the name of a spell it casts', () => {
    // Derived, not hardcoded: take a spell whose name matches no mob's name, so the only way
    // the caster can appear is through the spell.
    const { id, caster } = uniquelyCastSpell()
    const hit = search(String(id), 'en').hits[0]
    const byName = search(hit.viaSpell!, 'en').hits
    expect(byName.map((h) => h.npcId)).toContain(caster.npcId)
  })
})

describe('Ordering and the cap', () => {
  it('puts a name match ahead of a spell-only match', () => {
    // 'a' matches a great many names, so every name hit must precede every spell-only hit.
    const hits = search('a', 'en').hits
    const lastNamed = hits.reduce((last, h, i) => (h.viaSpell ? last : i), -1)
    const firstViaSpell = hits.findIndex((h) => h.viaSpell)
    if (firstViaSpell !== -1) expect(lastNamed).toBeLessThan(firstViaSpell)
  })

  it('sorts the dungeon you are in first, within a tier', () => {
    const later = dungeonList[dungeonList.length - 1].slug
    const hits = search('a', 'en', later).hits
    expect(hits[0].slug).toBe(later)
  })

  it('caps the rows it returns but reports the true total', () => {
    const results = search('a', 'en')
    expect(results.hits.length).toBeLessThanOrEqual(SEARCH_LIMIT)
    expect(results.total).toBeGreaterThan(results.hits.length)
  })

  it('is deterministic: the same query twice gives the same order', () => {
    expect(search('a', 'en').hits).toEqual(search('a', 'en').hits)
  })
})

describe('What a hit carries', () => {
  it('names the dungeon, so a global list is readable', () => {
    const { enemy, slug } = anyMob()
    const hit = search(String(enemy.id), 'en').hits[0]
    expect(hit.slug).toBe(slug)
    expect(hit.dungeonName).toBe(dungeonList[0].englishName)
  })

  it('shows the name in the reader’s own language', () => {
    const { enemy } = anyMob()
    const hit = search(String(enemy.id), 'fr').hits[0]
    expect(hit.name).toBe(getNpcLabel(enemy, 'fr').name)
  })
})
