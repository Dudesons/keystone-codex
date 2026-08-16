// ABOUTME: Tests the loading and merging of content/**.md against the real files.
// ABOUTME: Covers a written entry, an untouched stub, the bilingual pair, and the fallback.

import { describe, expect, it } from 'vitest'
import { ROLES, contentProgress, getDungeonContent, getMobContent, isRole } from './content'
import { dungeonList, getDungeon } from './data'

/**
 * These tests read the real files under `content/`. Two entries serve as landmarks: one is
 * written, the other is an untouched stub exactly as `npm run scaffold` produces it.
 *
 * The stub is *found* rather than named. Altar of Fangs is fully written now, and pinning a
 * npcId here would mean editing this file every time an entry is finished — a test that
 * punishes the work it protects. If the whole codex is ever written, the lookup returns
 * undefined and the stub tests fail loudly, which is the right moment to rewrite them
 * against a fixture instead of against real content.
 */
const SLUG = 'altar-of-fangs'
const WRITTEN = 270306 // Ritual Chieftain
const NO_ENTRY = 999_999

/** The first entry across the pool that `npm run scaffold` produced and nobody has touched. */
function findStub(): { slug: string; npcId: number } {
  for (const summary of dungeonList) {
    const dungeon = getDungeon(summary.slug)
    if (!dungeon) continue
    for (const npcId of new Set(dungeon.enemies.map((e) => e.id))) {
      if (getMobContent(summary.slug, npcId)?.isStub) return { slug: summary.slug, npcId }
    }
  }
  throw new Error('No untouched stub left in content/ — see the note above this function.')
}

const stub = findStub()

describe('isRole', () => {
  it('recognises the vocabulary the scaffold template offers', () => {
    for (const role of ROLES) expect(isRole(role), role).toBe(true)
  })

  it('rejects anything else, so an unexpected value can pass through untranslated', () => {
    // `role` is free text in the frontmatter: a typo or a word we never planned must not
    // become a missing translation key on screen.
    expect(isRole('healer')).toBe(false)
    expect(isRole('Melee')).toBe(false)
    expect(isRole('')).toBe(false)
    expect(isRole(undefined)).toBe(false)
  })
})

describe('Written mob entry', () => {
  const entry = getMobContent(SLUG, WRITTEN)

  it('exists and carries its npcId', () => {
    expect(entry).toBeDefined()
    expect(entry!.npcId).toBe(WRITTEN)
  })

  it('reads the human judgement out of the frontmatter', () => {
    expect(entry!.threat).toBe('high')
    expect(entry!.role).toBe('melee')
    expect(entry!.trap).toContain('Immune to every CC')
  })

  it('keeps the spell annotations with their tag and priority', () => {
    const dismember = entry!.spells?.find((s) => s.id === 1306911)
    expect(dismember).toMatchObject({ tag: 'tank', prio: 1 })
    expect(dismember!.note).toContain('581k')
  })

  it('converts the prose to HTML', () => {
    expect(entry!.html).toContain('<p>')
    expect(entry!.html).toContain('<strong>Dismember</strong>')
  })

  it('does not emit the HTML helper comments into the render', () => {
    expect(entry!.html).not.toContain('<!--')
    expect(entry!.html).not.toContain('To confirm in game')
  })

  it('does not count as a stub', () => {
    expect(entry!.isStub).toBe(false)
  })
})

describe('Unwritten stub', () => {
  const entry = getMobContent(stub.slug, stub.npcId)

  it('loads even though nothing has been written', () => {
    expect(entry).toBeDefined()
    expect(entry!.npcId).toBe(stub.npcId)
  })

  it('invents no judgement: no threat, no trap, no prose', () => {
    expect(entry!.threat).toBeFalsy()
    expect(entry!.trap).toBeFalsy()
    expect(entry!.html.trim()).toBe('')
  })

  it('is marked as a stub: `tag: todo` does not count as writing', () => {
    expect(entry!.isStub).toBe(true)
    expect(entry!.spells?.every((s) => s.tag === 'todo')).toBe(true)
  })
})

describe('Mob with no file', () => {
  it('returns undefined rather than failing — the codex fills in gradually', () => {
    expect(getMobContent(SLUG, NO_ENTRY)).toBeUndefined()
  })

  it('returns undefined for an unknown dungeon', () => {
    expect(getMobContent('no-such-dungeon', WRITTEN)).toBeUndefined()
  })
})

describe('Dungeon entry', () => {
  it('loads `_dungeon.md` and renders its route plan', () => {
    const dungeon = getDungeonContent(SLUG)
    expect(dungeon).toBeDefined()
    expect(dungeon!.html).toContain('Route plan')
  })

  it('leaves timer and summary empty until they are filled in', () => {
    const dungeon = getDungeonContent(SLUG)!
    expect(dungeon.timer).toBeFalsy()
    expect(dungeon.summary).toBeFalsy()
  })

  it('returns undefined for an unknown dungeon', () => {
    expect(getDungeonContent('no-such-dungeon')).toBeUndefined()
  })
})

/**
 * Ritual Chieftain is the reference bilingual entry: an English base
 * (`270306-ritual-chieftain.md`) and a French translation (`.fr.md`) carrying text only.
 * That pair is what exercises the field-by-field merge.
 */
describe('Translated entry', () => {
  const base = getMobContent(SLUG, WRITTEN, 'en')!
  const translated = getMobContent(SLUG, WRITTEN, 'fr')!

  it('takes the text from the translation', () => {
    expect(translated.trap).toContain('Immunisé à tous les CC')
    expect(translated.html).toContain('séquence qui tue')
  })

  it('inherits the judgements from the base, which the translation does not repeat', () => {
    // `threat`, `role`, `tag` and `prio` do not appear in the .fr.md: duplicating them would
    // guarantee they drift apart eventually.
    expect(translated.threat).toBe('high')
    expect(translated.role).toBe('melee')
    expect(translated.spells?.find((s) => s.id === 1306911)).toMatchObject({ tag: 'tank', prio: 1 })
  })

  it('merges the spell notes by id', () => {
    const dismemberFr = translated.spells?.find((s) => s.id === 1306911)
    const dismemberEn = base.spells?.find((s) => s.id === 1306911)
    expect(dismemberFr!.note).toContain('581k physique')
    expect(dismemberEn!.note).toContain('581k physical')
    expect(translated.spells).toHaveLength(base.spells!.length)
  })

  it('counts as written in both languages', () => {
    expect(base.isStub).toBe(false)
    expect(translated.isStub).toBe(false)
  })
})

describe('Falling back to the base language', () => {
  it('serves the base entry when the translation is missing', () => {
    // The stub has no .fr.md: a French reader sees the base rather than a hole.
    expect(getMobContent(stub.slug, stub.npcId, 'fr')).toEqual(
      getMobContent(stub.slug, stub.npcId, 'en'),
    )
  })

  it('serves the base dungeon plan in both languages', () => {
    expect(getDungeonContent(SLUG, 'fr')!.html).toBe(getDungeonContent(SLUG, 'en')!.html)
  })

  it('fabricates nothing for a mob with no file at all', () => {
    expect(getMobContent(SLUG, NO_ENTRY, 'fr')).toBeUndefined()
  })
})

describe('contentProgress', () => {
  it('only counts entries carrying actual writing', () => {
    expect(contentProgress(SLUG, [WRITTEN])).toEqual({ written: 1, total: 1 })
    expect(contentProgress(stub.slug, [stub.npcId])).toEqual({ written: 0, total: 1 })
  })

  it('counts what the reader sees: a fallback to the base counts as readable', () => {
    // Ritual Chieftain is written in both languages; the stub is written in neither. Neither
    // count changes with the locale, because the fallback serves the base either way.
    expect(contentProgress(SLUG, [WRITTEN], 'fr')).toEqual({ written: 1, total: 1 })
    expect(contentProgress(stub.slug, [stub.npcId], 'fr')).toEqual({ written: 0, total: 1 })
  })

  it('counts a mob with no file as unwritten', () => {
    expect(contentProgress(SLUG, [NO_ENTRY])).toEqual({ written: 0, total: 1 })
  })

  it('returns a zero total for an empty list', () => {
    expect(contentProgress(SLUG, [])).toEqual({ written: 0, total: 0 })
  })
})
