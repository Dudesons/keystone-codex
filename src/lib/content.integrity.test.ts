// ABOUTME: Checks that every image a card names really exists under public/tips/.
// ABOUTME: A typo there is a silent 404 in production, visible to no other test and no reviewer.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { splitFrontmatter } from './content'
import { getLookup } from './data'
import { parseTips } from './tips'

const root = fileURLToPath(new URL('../../', import.meta.url))

/** Every `.md` under content/, as [dungeon slug, file path]. */
function cards(): [string, string][] {
  const contentDir = join(root, 'content')
  return readdirSync(contentDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((dir) =>
      readdirSync(join(contentDir, dir.name))
        .filter((f) => f.endsWith('.md'))
        .map((f): [string, string] => [dir.name, join(contentDir, dir.name, f)]),
    )
}

/** The raw `image:` values a card declares, before the loader has had a chance to reject any. */
function declaredImages(file: string): string[] {
  const { data } = splitFrontmatter(readFileSync(file, 'utf8'))
  const tips = data.tips
  if (!Array.isArray(tips)) return []
  return tips.filter((t) => t && typeof t.image === 'string').map((t) => t.image as string)
}

describe('Image tips', () => {
  it('finds at least one card declaring one, so this test is not vacuous', () => {
    const declared = cards().flatMap(([, file]) => declaredImages(file))
    expect(declared.length).toBeGreaterThan(0)
  })

  it('names a file that exists under public/tips/<dungeon>/', () => {
    const missing = cards().flatMap(([slug, file]) =>
      declaredImages(file)
        .filter((image) => !existsSync(join(root, 'public', 'tips', slug, image)))
        .map((image) => `${file} → public/tips/${slug}/${image}`),
    )
    expect(missing).toEqual([])
  })

  /**
   * The file existing is not the same claim as the tip rendering: `parseTips` also rejects a
   * well-formed-looking value — a space, a leading underscore, an extension outside the
   * allowlist — and drops it with a `console.warn` nobody reads in CI. A committed file that
   * exists but whose declared name does not survive parsing is exactly as invisible in
   * production as a missing one, so count what parsing actually keeps, not just what exists.
   */
  it('parses into an image tip for every declared `image:` — not just a file that exists', () => {
    const mismatches = cards().flatMap(([, file]) => {
      const declared = declaredImages(file)
      if (!declared.length) return []
      const { data } = splitFrontmatter(readFileSync(file, 'utf8'))
      const parsed = parseTips(data.tips, file) ?? []
      const accepted = parsed.filter((t) => t.kind === 'image').length
      return accepted === declared.length
        ? []
        : [`${file}: declared ${declared.length} image tip(s), parseTips accepted ${accepted}`]
    })
    expect(mismatches).toEqual([])
  })
})

/** The raw `packs:` a card's tips declare, flattened. Scalars count as a list of one. */
function declaredPacks(file: string): number[] {
  const { data } = splitFrontmatter(readFileSync(file, 'utf8'))
  if (!Array.isArray(data.tips)) return []
  return data.tips.flatMap((t) => {
    const raw = t?.packs
    if (raw == null) return []
    return Array.isArray(raw) ? raw : [raw]
  })
}

describe('Tip pack scopes', () => {
  /**
   * `__fixtures__` is no dungeon in the pool, so there is no pack list to check its cards
   * against. Skipping it is the honest answer: the test cannot verify what it cannot load.
   */
  const real = () => cards().filter(([slug]) => getLookup(slug) !== undefined)

  // Real cards only: a fixture declaring `packs:` would keep this green even if every written
  // card lost its scope, which is the one thing a vacuity guard exists to notice.
  it('finds at least one card declaring one, so this test is not vacuous', () => {
    expect(real().flatMap(([, file]) => declaredPacks(file)).length).toBeGreaterThan(0)
  })

  it('names a pack that exists in that dungeon', () => {
    const missing = real().flatMap(([slug, file]) => {
      const packs = new Set([...getLookup(slug)!.packs.keys()])
      return declaredPacks(file)
        .filter((g) => !packs.has(g))
        .map((g) => `${file}: pack ${g} is not in ${slug}`)
    })
    expect(missing).toEqual([])
  })

  /**
   * At least one, not all: a pull that takes packs 44 and 45 together is a legitimate scope for
   * a tip on a mob that stands only in 44, and demanding both would reject a correct card.
   */
  it('names at least one pack the mob actually stands in', () => {
    const wrong = real().flatMap(([slug, file]) => {
      const declared = declaredPacks(file)
      if (!declared.length) return []
      const { data } = splitFrontmatter(readFileSync(file, 'utf8'))
      const enemy = getLookup(slug)!.dungeon.enemies.find((e) => e.id === Number(data.npcId))
      if (!enemy) return [`${file}: npcId ${data.npcId} is not in ${slug}`]
      const standsIn = new Set(enemy.clones.map((c) => c.g))
      return declared.some((g) => standsIn.has(g))
        ? []
        : [`${file}: declares ${declared.join(', ')} but stands in none of them`]
    })
    expect(wrong).toEqual([])
  })

  /**
   * Tips merge whole-list, so a `.fr.md` restating them must restate `packs:` too. If it does
   * not, the French map badges every clone where the English badges one — and `getIndicators`
   * is keyed by locale, so nothing on either screen reveals the disagreement.
   */
  it('declares the same packs in a translation as in its base card', () => {
    const drifted = cards()
      .filter(([, file]) => file.endsWith('.fr.md'))
      .flatMap(([, file]) => {
        const base = file.replace(/\.fr\.md$/, '.md')
        if (!existsSync(base)) return []
        const { data } = splitFrontmatter(readFileSync(file, 'utf8'))
        if (!Array.isArray(data.tips)) return [] // no tips restated: the base list is used whole
        const here = [...declaredPacks(file)].sort((a, b) => a - b).join(',')
        const there = [...declaredPacks(base)].sort((a, b) => a - b).join(',')
        return here === there ? [] : [`${file}: scopes ${here || '(none)'}, base scopes ${there || '(none)'}`]
      })
    expect(drifted).toEqual([])
  })
})
