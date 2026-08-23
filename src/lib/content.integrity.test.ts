// ABOUTME: Checks that every image a card names really exists under public/tips/.
// ABOUTME: A typo there is a silent 404 in production, visible to no other test and no reviewer.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { splitFrontmatter } from './content'
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
