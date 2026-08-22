# Mob tips and a contributor guide — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a card can carry tips — a sentence, a YouTube video or Short, or a committed image — shown wherever the mob is shown, and never exported to MDT; plus a contributor guide in English and French for people who edit the codex without an agent.

**Architecture:** a new pure module `src/lib/tips.ts` parses and validates the `tips:` frontmatter; `src/lib/content.ts` carries the result through its existing merge, fallback and cache; a new `MobTips` component renders it inside `MobCard`, which the Route tab's `MobPanel` already mounts, so the route builder inherits the feature without being edited.

**Tech Stack:** TypeScript, React 19, Vite, Tailwind 4, Vitest (`app` project: node by default, jsdom per-file), Playwright, `yaml`, `marked`.

**Spec:** [docs/plans/2026-08-21-mob-tips-and-contributor-guide-design.md](2026-08-21-mob-tips-and-contributor-guide-design.md) — read it before task 1. Its 14 numbered decisions are the argument behind everything below.

## Global Constraints

- **Shell on this machine:** `node` and `npm` are not on the Bash tool's PATH. Prefix every run: `export PATH="/c/Program Files/nodejs:$PATH"`. `rm` is denied by the permission layer — overwrite with the Write tool instead.
- **English** for code, comments, tests, commit messages, `CONTRIBUTING.md` and skills. Two exceptions only: `content/**.md` and `CONTRIBUTING.fr.md`.
- **Every new file starts with two `// ABOUTME: ` lines** saying what it does.
- **No mocks.** Tests read the real generated data and the real `content/**.md` through the existing loader.
- **Component test files** carry `// @vitest-environment jsdom` on line 4 (after the ABOUTME pair), declare their own `afterEach(cleanup)` — Testing Library runs without `globals: true` — and mount through `renderEn` / `renderFr` from `src/test/render.tsx`, never bare `render`.
- **Never pin a test to a card's wording.** Derive expectations by calling `getMobContent`; assert that a field is carried, not what it says. Six tests have broken this way.
- **Commit style:** imperative subject, no `feat:`/`fix:` prefix, body explains *why*. Never `--no-verify`.
- **Run `npm test` before every commit.** Its output must be pristine.
- **Nothing under `content/` may ever reach an MDT string.** No task below imports `content.ts` into `src/lib/mdt/`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/tips.ts` | **new.** Parse one raw `tips:` entry into a `Tip`; extract a YouTube id, timestamp and orientation; validate an image filename; build the embed, watch and image URLs. No React, no glob. |
| `src/lib/tips.test.ts` | **new.** Every accepted URL form and every rejection. |
| `src/lib/content.ts` | Carries `Tip[]` through the existing parse → merge → fallback → cache path. Gains no parsing of its own. |
| `src/components/codex/MobTips.tsx` | **new.** Renders a tip list: text, click-to-load video, image. Owns the "has the reader clicked play" state. |
| `src/components/codex/Badges.tsx` | Gains `BaseLanguageMark`, moved out of `MobCard.tsx` so both it and `MobTips` can use it. |
| `src/components/codex/MobCard.tsx` | Mounts `MobTips` after the prose, behind `!compact`. Loses its private `BaseLanguageMark`. |
| `src/lib/content.integrity.test.ts` | **new.** Every `image:` declared under `content/` names a file that exists under `public/tips/`. |
| `e2e/tips.spec.ts` | **new.** The built app, on its deployed sub-path: no iframe before the click, one with the right video id after. |
| `CONTRIBUTING.md` / `CONTRIBUTING.fr.md` | **new.** The human guide, as a translated pair. |

---

## Task 1: Parsing a tip

**Files:**
- Create: `src/lib/tips.ts`
- Test: `src/lib/tips.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Tip`, `parseTips(raw: unknown, where: string): Tip[] | undefined`, `youtube(url: string): Video | null`, `embedUrl(v: {videoId: string; start?: number}): string`, `watchUrl(videoId: string): string`, `tipImageUrl(slug: string, file: string): string`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/tips.test.ts`:

```ts
// ABOUTME: Tests the tip parser — which YouTube URLs are accepted, and what is rejected.
// ABOUTME: Pure input/output: no files, no DOM, so every rejection can be stated as a case.

import { describe, expect, it, vi } from 'vitest'
import { embedUrl, parseTips, tipImageUrl, watchUrl, youtube } from './tips'

describe('youtube', () => {
  it('reads the id out of every form someone actually pastes', () => {
    expect(youtube('https://www.youtube.com/watch?v=9D0gCU8Tp5Y')).toMatchObject({ videoId: '9D0gCU8Tp5Y', portrait: false })
    expect(youtube('https://youtu.be/9D0gCU8Tp5Y')).toMatchObject({ videoId: '9D0gCU8Tp5Y', portrait: false })
    expect(youtube('https://www.youtube.com/embed/9D0gCU8Tp5Y')).toMatchObject({ videoId: '9D0gCU8Tp5Y', portrait: false })
  })

  it('marks a Short as portrait, which is the only reason the form is distinguished', () => {
    expect(youtube('https://www.youtube.com/shorts/9D0gCU8Tp5Y')).toMatchObject({ videoId: '9D0gCU8Tp5Y', portrait: true })
  })

  it('keeps a timestamp, with or without its trailing s', () => {
    expect(youtube('https://youtu.be/9D0gCU8Tp5Y?t=95')?.start).toBe(95)
    expect(youtube('https://www.youtube.com/watch?v=9D0gCU8Tp5Y&t=95s')?.start).toBe(95)
    expect(youtube('https://youtu.be/9D0gCU8Tp5Y')?.start).toBeUndefined()
    // A timestamp we cannot read is no timestamp, not a broken one.
    expect(youtube('https://youtu.be/9D0gCU8Tp5Y?t=1h2m')?.start).toBeUndefined()
  })

  it('refuses anything that is not a YouTube video id', () => {
    expect(youtube('https://www.youtube.com/watch?v=tooshort')).toBeNull()
    expect(youtube('https://vimeo.com/9D0gCU8Tp5Y')).toBeNull()
    expect(youtube('https://www.youtube.com/results?search_query=x')).toBeNull()
    expect(youtube('javascript:alert(1)')).toBeNull()
    expect(youtube('not a url at all')).toBeNull()
  })
})

describe('URLs', () => {
  it('embeds through the no-cookie host, autoplaying because the click already happened', () => {
    expect(embedUrl({ videoId: '9D0gCU8Tp5Y' })).toBe(
      'https://www.youtube-nocookie.com/embed/9D0gCU8Tp5Y?autoplay=1&rel=0',
    )
    expect(embedUrl({ videoId: '9D0gCU8Tp5Y', start: 95 })).toBe(
      'https://www.youtube-nocookie.com/embed/9D0gCU8Tp5Y?autoplay=1&rel=0&start=95',
    )
  })

  it('links out to the canonical watch page', () => {
    expect(watchUrl('9D0gCU8Tp5Y')).toBe('https://www.youtube.com/watch?v=9D0gCU8Tp5Y')
  })

  it('starts an image from BASE_URL, to stay valid under a GitHub Pages subpath', () => {
    expect(tipImageUrl('the-blinding-vale', 'a.webp')).toBe(
      `${import.meta.env.BASE_URL}tips/the-blinding-vale/a.webp`,
    )
  })
})

describe('parseTips', () => {
  it('reads the three kinds, taking the key as the kind', () => {
    const tips = parseTips(
      [
        { text: 'Kick the second cast.' },
        { video: 'https://www.youtube.com/shorts/9D0gCU8Tp5Y', label: 'The pull' },
        { image: 'beams.webp', label: 'Where they land' },
      ],
      'card.md',
    )
    expect(tips).toEqual([
      { kind: 'text', text: 'Kick the second cast.' },
      { kind: 'video', videoId: '9D0gCU8Tp5Y', portrait: true, label: 'The pull' },
      { kind: 'image', file: 'beams.webp', label: 'Where they land' },
    ])
  })

  it('drops an entry that names no kind, or two, and warns rather than throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseTips([{ label: 'orphan' }], 'card.md')).toBeUndefined()
    expect(parseTips([{ text: 'a', video: 'https://youtu.be/9D0gCU8Tp5Y' }], 'card.md')).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it('keeps the good entries when one is bad, because a card must never break over content', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const tips = parseTips([{ text: 'kept' }, { video: 'https://vimeo.com/x' }], 'card.md')
    expect(tips).toEqual([{ kind: 'text', text: 'kept' }])
    warn.mockRestore()
  })

  it('refuses an image that is anything but a bare filename', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const file of ['../secret.webp', 'sub/dir.webp', 'C:\\x.webp', 'https://example.com/x.webp', 'x.svg', '.webp']) {
      expect(parseTips([{ image: file }], 'card.md'), file).toBeUndefined()
    }
    warn.mockRestore()
  })

  it('treats a missing or malformed list as no tips at all', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseTips(undefined, 'card.md')).toBeUndefined()
    expect(parseTips(null, 'card.md')).toBeUndefined()
    expect(parseTips('a string', 'card.md')).toBeUndefined()
    expect(parseTips([], 'card.md')).toBeUndefined()
    warn.mockRestore()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/tips.test.ts
```

Expected: FAIL — `Failed to resolve import "./tips"`.

- [ ] **Step 3: Write `src/lib/tips.ts`**

```ts
// ABOUTME: Parses a card's `tips:` entries — a sentence, a YouTube video, or a committed image.
// ABOUTME: Pure: no glob and no React, so every accepted and rejected form is testable directly.

/**
 * Reading the `tips:` list of a card.
 *
 * A tip is written with one key naming its kind — `text:`, `video:` or `image:` — so there is no
 * separate `kind:` field that could disagree with the value beside it. An entry naming two kinds,
 * or none, is not a mismatch to reconcile: it is malformed, and is dropped with a warning.
 *
 * Nothing here reaches the network. A `video:` is reduced to its eleven-character id, and the
 * embed URL is built only when a reader clicks; an `image:` is a bare filename resolved against
 * `public/tips/<dungeon>/`, so the field cannot address a host we do not control.
 */

export type Tip =
  | { kind: 'text'; text: string }
  | { kind: 'video'; videoId: string; start?: number; portrait: boolean; label?: string }
  | { kind: 'image'; file: string; label?: string }

export interface Video {
  videoId: string
  start?: number
  /** A Short. The only reason the URL form survives parsing: it decides the aspect ratio. */
  portrait: boolean
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * A bare filename and nothing else.
 *
 * Anchored, and with no `/`, `\` or leading dot admitted, so the field cannot climb out of its
 * directory, name another host, or carry a scheme. SVG is absent deliberately: it is a document
 * that can carry script, not an image.
 */
const IMAGE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(webp|png|jpe?g|gif)$/i

/** `t=90` and `t=90s` both mean ninety seconds. Anything else means no timestamp. */
export function startSeconds(value: string | null): number | undefined {
  const m = value ? /^(\d+)s?$/.exec(value) : null
  const n = m ? Number(m[1]) : 0
  return n > 0 ? n : undefined
}

/** The id, the timestamp and the orientation, or null if this is not a YouTube video URL. */
export function youtube(url: string): Video | null {
  let parsed: URL
  try {
    parsed = new URL(String(url).trim())
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null

  const host = parsed.hostname.replace(/^(www|m)\./, '')
  const [, first, second] = parsed.pathname.split('/')

  let id: string | undefined
  let portrait = false

  if (host === 'youtu.be') {
    id = first
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') id = parsed.searchParams.get('v') ?? undefined
    else if (first === 'shorts') (id = second), (portrait = true)
    else if (first === 'embed') id = second
  }

  if (!id || !VIDEO_ID.test(id)) return null
  const start = startSeconds(parsed.searchParams.get('t'))
  return start ? { videoId: id, portrait, start } : { videoId: id, portrait }
}

/**
 * The frame we load once the reader has clicked.
 *
 * `youtube-nocookie.com` because the click is the only consent we have, and `autoplay=1` because
 * that click already said "play" — the reader should not have to press a second button.
 */
export const embedUrl = (v: { videoId: string; start?: number }) =>
  `https://www.youtube-nocookie.com/embed/${v.videoId}?autoplay=1&rel=0${v.start ? `&start=${v.start}` : ''}`

/** Where the link beside the play button goes, for a browser that blocks the frame. */
export const watchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`

/** Same construction as `iconUrl` and `mapUrl`: relative to the deployed base path. */
export const tipImageUrl = (slug: string, file: string) =>
  `${import.meta.env.BASE_URL}tips/${slug}/${file}`

const KINDS = ['text', 'video', 'image'] as const

function parseTip(raw: unknown, where: string): Tip | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    console.warn(`${where}: a tip must be a mapping, entry ignored`)
    return null
  }
  const entry = raw as Record<string, unknown>
  const named = KINDS.filter((k) => typeof entry[k] === 'string' && (entry[k] as string).trim())
  if (named.length !== 1) {
    console.warn(`${where}: a tip needs exactly one of text/video/image, got ${named.length}, entry ignored`)
    return null
  }

  const kind = named[0]
  const value = (entry[kind] as string).trim()
  const label = typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : undefined

  if (kind === 'text') return { kind: 'text', text: value }

  if (kind === 'video') {
    const video = youtube(value)
    if (!video) {
      console.warn(`${where}: not a YouTube video URL: ${value}, entry ignored`)
      return null
    }
    return label ? { kind: 'video', ...video, label } : { kind: 'video', ...video }
  }

  if (!IMAGE_FILE.test(value)) {
    console.warn(`${where}: an image tip must be a bare filename under public/tips/: ${value}, entry ignored`)
    return null
  }
  return label ? { kind: 'image', file: value, label } : { kind: 'image', file: value }
}

/** The whole list. Returns undefined rather than an empty array, so "no tips" has one shape. */
export function parseTips(raw: unknown, where: string): Tip[] | undefined {
  if (raw == null) return undefined
  if (!Array.isArray(raw)) {
    console.warn(`${where}: \`tips:\` must be a list, ignored`)
    return undefined
  }
  const tips = raw.map((entry) => parseTip(entry, where)).filter((t): t is Tip => t !== null)
  return tips.length ? tips : undefined
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/tips.test.ts
```

Expected: PASS, every case.

- [ ] **Step 5: Typecheck and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run typecheck
```

```bash
git add src/lib/tips.ts src/lib/tips.test.ts
git commit -m "Read a tip out of a card, and refuse everything else

A tip names its kind with its key, so no `kind:` field can disagree with
the value beside it. A video is reduced to its id here rather than
embedded: nothing reaches YouTube until a reader asks for it. An image is
a bare filename, so the field cannot name a host we do not control.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Carrying tips through the loader

**Files:**
- Modify: `src/lib/content.ts`
- Modify: `content/__fixtures__/263109-ulateks-chosen.md`
- Create: `content/__fixtures__/888002-tips-translated.md`, `content/__fixtures__/888002-tips-translated.fr.md`
- Test: `src/lib/content.test.ts`

**Interfaces:**
- Consumes: `parseTips`, `type Tip` from task 1.
- Produces: `MobContent.tips?: Tip[]`, `MobFallback.tips: boolean`.

**Why two fixtures:** `content.test.ts` reads real files, and the two existing fixtures are both spoken for — `270306` is the untouched scaffold output that `content-stub.test.mjs` regenerates byte-for-byte (**never hand-edit it**), and `263109`'s `.fr.md` is deliberately partial. So `263109` gets tips in its base only, pinning the *fallback*; a new `888002` pair carries tips on both sides, pinning *replacement*. The id is synthetic, like the `888_001` enemy already used in `MobCard.test.tsx`; the `__fixtures__` slug matches no dungeon, so neither is visible to the app.

- [ ] **Step 1: Add tips to the existing fixture base only**

Append to the frontmatter of `content/__fixtures__/263109-ulateks-chosen.md`, immediately before the closing `---`:

```yaml
# Tips, in the base language only: the .fr.md sibling deliberately carries none, which is what
# pins `fallback.tips`. The image names a real committed file under public/tips/__fixtures__/.
tips:
  - text: "Fixture tip: the sentence a reader gets when no translation exists yet."
  - video: https://www.youtube.com/shorts/9D0gCU8Tp5Y
    label: "Fixture video"
  - image: example.webp
    label: "Fixture image"
```

- [ ] **Step 2: Create the translated pair**

`content/__fixtures__/888002-tips-translated.md`:

```markdown
---
# A card whose translation carries its own `tips:`. It exists to pin the other half of decision 7:
# a `.fr.md` that names the key replaces the whole list rather than merging into it, and no
# fallback mark is shown. The npcId is synthetic — the __fixtures__ slug matches no dungeon, so
# nothing here is reachable from the app.
npcId: 888002

tips:
  - text: "Base tip."
---
```

`content/__fixtures__/888002-tips-translated.fr.md`:

```markdown
---
npcId: 888002

# Replaces the base list whole: a French reader sees this one tip and not the base's.
tips:
  - text: "Astuce traduite."
---
```

- [ ] **Step 3: Write the failing tests**

Append to `src/lib/content.test.ts`:

```ts
describe('Tips', () => {
  const withTips = getMobContent('__fixtures__', 263_109)

  it('reads the three kinds off the frontmatter', () => {
    expect(withTips!.tips).toEqual([
      { kind: 'text', text: 'Fixture tip: the sentence a reader gets when no translation exists yet.' },
      { kind: 'video', videoId: '9D0gCU8Tp5Y', portrait: true, label: 'Fixture video' },
      { kind: 'image', file: 'example.webp', label: 'Fixture image' },
    ])
  })

  it('falls back to the base list, and says so, when the translation carries none', () => {
    const fr = getMobContent('__fixtures__', 263_109, 'fr')
    expect(fr!.tips).toEqual(withTips!.tips)
    expect(fr!.fallback.tips).toBe(true)
  })

  it('replaces the whole list when the translation names the key', () => {
    const en = getMobContent('__fixtures__', 888_002)
    const fr = getMobContent('__fixtures__', 888_002, 'fr')
    expect(en!.tips).toEqual([{ kind: 'text', text: 'Base tip.' }])
    expect(fr!.tips).toEqual([{ kind: 'text', text: 'Astuce traduite.' }])
    expect(fr!.fallback.tips).toBe(false)
  })

  it('never marks a fallback in the base language itself', () => {
    expect(withTips!.fallback.tips).toBe(false)
  })

  it('counts a card carrying nothing but a tip as written', () => {
    // 888002 has no threat, no trap, no prose and no annotated spell — only a tip. Someone who
    // found the video that explains the fight has put something here, and the bar measures
    // whether there is anything to read.
    expect(getMobContent('__fixtures__', 888_002)!.isStub).toBe(false)
  })
})
```

- [ ] **Step 4: Run them and watch them fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/content.test.ts
```

Expected: FAIL — `tips` is undefined on `MobContent`, and `fallback.tips` does not exist.

- [ ] **Step 5: Wire `src/lib/content.ts`**

Five edits, in file order:

1. After the existing `marked` import, add: `import { parseTips, type Tip } from './tips'`
2. In `interface MobFallback`, after `prose: boolean`, add:

```ts
  /** The reader is being served the base language's tips, because the translation names none. */
  tips: boolean
```

3. In `interface MobContent` and in `interface RawMob`, add `tips?: Tip[]` after `spells`.
4. In the file loop, inside the `slot(mobFiles, ...)` assignment, after the `spells:` line, add:

```ts
    tips: parseTips(data.tips, filePath),
```

5. In `fallbackOf`, change the early return to `{ trap: false, prose: false, tips: false, notes: [] }`, and add to the returned object:

```ts
    tips: Boolean(base?.tips?.length) && !translation?.tips,
```

6. In `mergeMob`, add `const tips = translation?.tips ?? base?.tips` beside the existing locals, return `tips,` in the object, and extend the `isStub` expression with `!tips?.length`:

```ts
    isStub:
      !prose &&
      !trap &&
      !threat &&
      !tips?.length &&
      !spells?.some((s) => s.note || (s.tag && s.tag !== 'todo')),
```

- [ ] **Step 6: Run the whole suite**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
```

Expected: PASS. If `contentProgress` assertions moved, it is because a fixture now counts as written — the fixture slug is not in the pool, so they must not have. Investigate rather than adjust the number.

- [ ] **Step 7: Commit**

```bash
git add src/lib/content.ts src/lib/content.test.ts content/__fixtures__
git commit -m "Carry a card's tips through the loader, translation and all

Tips ride the existing merge rather than a second path: one list, replaced
whole by a translation that names the key, and marked as base-language
when it does not. Merging per tip would need a hand-written key per entry,
which is exactly the field a contributor mistypes.

A card carrying nothing but a tip now counts as written. The rule the flag
encodes is that a human put something here, and someone who found the
video that explains the fight has.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: The tips component

**Files:**
- Create: `src/components/codex/MobTips.tsx`, `src/components/codex/MobTips.test.tsx`
- Modify: `src/components/codex/Badges.tsx` (gains `BaseLanguageMark`), `src/components/codex/MobCard.tsx` (loses it), `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`

**Interfaces:**
- Consumes: `Tip`, `embedUrl`, `watchUrl`, `tipImageUrl` (task 1); `inlineMarkdown` from `src/lib/content.ts`.
- Produces: `export default function MobTips({ slug, tips, fallback }: { slug: string; tips: Tip[]; fallback: boolean })`; `export function BaseLanguageMark()` from `Badges.tsx`.

**Why the move:** `BaseLanguageMark` is a private function inside `MobCard.tsx` today, and `MobTips` needs the same mark. `Badges.tsx` already holds `ThreatBadge` and `TagBadge` and is the right home. Move it verbatim — comment included — rather than duplicating it.

- [ ] **Step 1: Add the three UI strings**

In `src/lib/i18n/en.ts`, after the `'mob.untranslated'` line:

```ts
  // Tips
  'tip.section': 'TIPS',
  'tip.play': 'Play video',
  'tip.openOnYouTube': 'Open on YouTube',
```

In `src/lib/i18n/fr.ts`, at the matching position:

```ts
  // Astuces
  'tip.section': 'ASTUCES',
  'tip.play': 'Lire la vidéo',
  'tip.openOnYouTube': 'Ouvrir sur YouTube',
```

`fr.ts` is typed against `en.ts`, so a missing key fails `tsc` — that check replaces a completeness test.

- [ ] **Step 2: Write the failing test**

Create `src/components/codex/MobTips.test.tsx`:

```tsx
// ABOUTME: Tests the tips section: the three kinds, and the click that loads the embed.
// ABOUTME: The iframe assertion is the point — nothing may reach YouTube before the click.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

afterEach(cleanup)
import type { Tip } from '../../lib/tips'
import { DEFAULT_LOCALE } from '../../lib/i18n/locales'
import { renderEn, renderFr } from '../../test/render'
import MobTips from './MobTips'

const SLUG = 'the-blinding-vale'
const text: Tip = { kind: 'text', text: 'Kick the **second** cast.' }
const video: Tip = { kind: 'video', videoId: '9D0gCU8Tp5Y', portrait: true, label: 'The pull' }
const image: Tip = { kind: 'image', file: 'beams.webp', label: 'Where they land' }

describe('Text tips', () => {
  it('renders its markdown inline', () => {
    const { container } = renderEn(<MobTips slug={SLUG} tips={[text]} fallback={false} />)
    expect(container.querySelector('strong')?.textContent).toBe('second')
  })
})

describe('Video tips', () => {
  it('loads nothing before the reader clicks', () => {
    const { container } = renderEn(<MobTips slug={SLUG} tips={[video]} fallback={false} />)
    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByRole('button', { name: 'The pull' })).toBeTruthy()
  })

  it('swaps in a no-cookie embed for that video once clicked', () => {
    const { container } = renderEn(<MobTips slug={SLUG} tips={[video]} fallback={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'The pull' }))

    const frame = container.querySelector('iframe')!
    expect(frame).toBeTruthy()
    expect(frame.getAttribute('src')).toContain('youtube-nocookie.com/embed/9D0gCU8Tp5Y')
  })

  it('offers a way out to YouTube, for a browser that blocks the frame', () => {
    renderEn(<MobTips slug={SLUG} tips={[video]} fallback={false} />)
    const link = screen.getByRole('link', { name: 'Open on YouTube' })
    expect(link.getAttribute('href')).toBe('https://www.youtube.com/watch?v=9D0gCU8Tp5Y')
  })

  it('falls back to a generic label when the card names none', () => {
    renderFr(<MobTips slug={SLUG} tips={[{ ...video, label: undefined }]} fallback={false} />)
    expect(screen.getByRole('button', { name: 'Lire la vidéo' })).toBeTruthy()
  })
})

describe('Image tips', () => {
  it('resolves under the deployed base path, and captions itself', () => {
    renderEn(<MobTips slug={SLUG} tips={[image]} fallback={false} />)
    const img = screen.getByRole('img', { name: 'Where they land' })
    expect(img.getAttribute('src')).toBe(`${import.meta.env.BASE_URL}tips/${SLUG}/beams.webp`)
  })
})

describe('The section itself', () => {
  it('renders nothing at all for an empty list', () => {
    const { container } = renderEn(<MobTips slug={SLUG} tips={[]} fallback={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('marks the whole section when it is showing the base language', () => {
    renderFr(<MobTips slug={SLUG} tips={[text]} fallback />)
    expect(screen.getByText(DEFAULT_LOCALE.toUpperCase())).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/codex/MobTips.test.tsx
```

Expected: FAIL — `Failed to resolve import "./MobTips"`.

- [ ] **Step 4: Move `BaseLanguageMark` into `Badges.tsx`**

Cut the whole `BaseLanguageMark` function — its doc comment included — out of `MobCard.tsx`, paste it at the end of `src/components/codex/Badges.tsx` with `export` in front of `function`, and add the two imports it needs there if they are absent (`useI18n` from `../../lib/i18n/context`, `DEFAULT_LOCALE` from `../../lib/i18n/locales`). In `MobCard.tsx`, add `BaseLanguageMark` to the existing named import from `./Badges` and drop the now-unused `DEFAULT_LOCALE` import if nothing else there uses it.

- [ ] **Step 5: Write `src/components/codex/MobTips.tsx`**

```tsx
// ABOUTME: A card's tips: a sentence, a click-to-load YouTube embed, or a committed image.
// ABOUTME: Nothing reaches YouTube until the reader clicks the button — that click is the consent.

import { useState } from 'react'
import { inlineMarkdown } from '../../lib/content'
import { embedUrl, tipImageUrl, watchUrl, type Tip } from '../../lib/tips'
import { useI18n } from '../../lib/i18n/context'
import { BaseLanguageMark } from './Badges'

export default function MobTips({
  slug,
  tips,
  /** The list fell back to the base language: mark the section, not each row. */
  fallback,
}: {
  slug: string
  tips: Tip[]
  fallback: boolean
}) {
  const { t } = useI18n()
  if (!tips.length) return null

  return (
    <div className="border-t border-ink-700 px-3 py-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <div className="text-[10px] font-bold tracking-widest text-ink-400">{t('tip.section')}</div>
        {fallback && <BaseLanguageMark />}
      </div>
      <ul className="space-y-2">
        {/* The index is the key: the list is replaced whole by a translation, never reordered. */}
        {tips.map((tip, i) => (
          <li key={i}>
            {tip.kind === 'text' && (
              <p
                className="text-xs leading-snug text-ink-300"
                dangerouslySetInnerHTML={{ __html: inlineMarkdown(tip.text) }}
              />
            )}
            {tip.kind === 'video' && <VideoTip tip={tip} />}
            {tip.kind === 'image' && (
              <figure>
                <img
                  src={tipImageUrl(slug, tip.file)}
                  alt={tip.label ?? ''}
                  loading="lazy"
                  className="w-full rounded border border-ink-700"
                />
                {tip.label && (
                  <figcaption className="mt-0.5 text-[11px] text-ink-400">{tip.label}</figcaption>
                )}
              </figure>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A video, loaded only once asked for.
 *
 * The button is ours and the frame is not: until it is clicked, this component makes no request
 * to anyone. The link beside it is the way out for a browser that refuses the frame — and the
 * way to watch it full size, which an inline embed is bad at.
 */
function VideoTip({ tip }: { tip: Extract<Tip, { kind: 'video' }> }) {
  const { t } = useI18n()
  const [playing, setPlaying] = useState(false)
  const label = tip.label ?? t('tip.play')

  if (playing) {
    return (
      <div
        className={`overflow-hidden rounded border border-ink-700 ${
          tip.portrait ? 'mx-auto aspect-[9/16] max-w-[240px]' : 'aspect-video'
        }`}
      >
        <iframe
          src={embedUrl(tip)}
          title={label}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setPlaying(true)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded border border-ink-600 bg-ink-800 px-2 py-1.5 text-left text-xs text-ink-100 hover:border-gold-400 hover:text-gold-400"
      >
        <span aria-hidden="true">▶</span>
        <span className="truncate">{label}</span>
      </button>
      <a
        href={watchUrl(tip.videoId)}
        target="_blank"
        rel="noreferrer"
        title={t('tip.openOnYouTube')}
        aria-label={t('tip.openOnYouTube')}
        className="shrink-0 rounded px-1 text-ink-400 hover:text-gold-400"
      >
        ↗
      </a>
    </div>
  )
}
```

- [ ] **Step 6: Run the tests and the typecheck**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/codex && npm run typecheck
```

Expected: PASS, `MobCard.test.tsx` included — the `BaseLanguageMark` move must not change anything it asserts.

- [ ] **Step 7: Commit**

```bash
git add src/components/codex src/lib/i18n
git commit -m "Draw a tip, and load a video only when asked

The play button is ours and the frame is not: a card with a video tip
makes no request to anyone until a reader clicks it, which is the only
consent we have to give on their behalf. A Short gets a portrait frame,
because the alternative is two black bars and a stamp-sized video.

BaseLanguageMark moves to Badges, where the other badges live, so the
tips section can carry the same mark as the trap and the prose.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Mounting it on the card

**Files:**
- Modify: `src/components/codex/MobCard.tsx`
- Test: `src/components/codex/MobCard.test.tsx`, `src/components/route/MobPanel.test.tsx`

**Interfaces:**
- Consumes: `MobTips` (task 3), `MobContent.tips` and `MobContent.fallback.tips` (task 2).
- Produces: nothing new. `MobPanel` is deliberately not modified — it mounts `MobCard` already.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/codex/MobCard.test.tsx`. The fixture card `__fixtures__/263109` carries the tips; the enemy is the real one, so the card renders exactly as it does in the app:

```tsx
describe('Tips', () => {
  it('shows the section for a card that carries tips', () => {
    const { container } = renderEn(<MobCard slug="__fixtures__" enemy={chosen} />)
    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByRole('button', { name: 'Fixture video' })).toBeTruthy()
  })

  it('hides it in compact, where the prose and the CC are hidden too', () => {
    renderEn(<MobCard slug="__fixtures__" enemy={chosen} compact />)
    expect(screen.queryByRole('button', { name: 'Fixture video' })).toBeNull()
  })

  it('shows no section at all for a card that carries none', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.queryByText('TIPS')).toBeNull()
  })
})
```

Append to `src/components/route/MobPanel.test.tsx` — the point of the feature is that the route builder gets it:

```tsx
it('carries a mob tip into the route builder, which is where a router reads it', () => {
  renderEn(<MobPanel slug="__fixtures__" dungeon={dungeon} enemy={chosen} frozen={false} onUnfreeze={() => {}} />)
  expect(screen.getByRole('button', { name: 'Fixture video' })).toBeTruthy()
})
```

Reuse whatever `dungeon` and enemy constants that file already defines; `chosen` is the enemy with id `263109` — derive it the way the file derives its others, and do not add a new hard-coded `Enemy` literal if one is already in scope.

- [ ] **Step 2: Run them and watch them fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/codex/MobCard.test.tsx src/components/route/MobPanel.test.tsx
```

Expected: FAIL — no button with that name; the card renders no tips.

- [ ] **Step 3: Mount `MobTips` in `MobCard.tsx`**

Add the import beside the others: `import MobTips from './MobTips'`. Then, as the **last** child of the `<article>`, after the `content?.html` block:

```tsx
      {!compact && content?.tips && content.tips.length > 0 && (
        <MobTips slug={slug} tips={content.tips} fallback={content.fallback.tips} />
      )}
```

`content.tips.length > 0` rather than `content.tips.length &&`: a bare length would render a literal `0` when the list is empty.

- [ ] **Step 4: Run the whole suite**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "Show a mob's tips wherever the mob is shown

Mounted on the card rather than on a panel, so the Route tab's left column
inherits it without being touched: MobPanel already mounts MobCard, and a
router reading a pack is exactly who the tips are for. Compact keeps
hiding what a list view has no room for.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: The first real tip, and the file that proves it exists

**Files:**
- Create: `public/tips/__fixtures__/example.webp`, `public/tips/the-blinding-vale/.gitkeep` *(only if the directory would otherwise be empty)*
- Create: `src/lib/content.integrity.test.ts`
- Modify: `src/lib/content.ts` (export `splitFrontmatter`), `content/the-blinding-vale/254850-sporeblight-belcher.md`, `content/the-blinding-vale/254850-sporeblight-belcher.fr.md`

**Interfaces:**
- Consumes: `splitFrontmatter` from `content.ts`, newly exported.
- Produces: nothing consumed by later tasks except the real tip, which task 6 asserts on.

**The real tip:** the Short is `https://www.youtube.com/shorts/9D0gCU8Tp5Y` — *"How to safely execute the most DANGEROUS pull in Blinding Vale!"* by **Naowh // Robin**, verified through YouTube's oEmbed endpoint. RwlRwlRwlRwl identified the subject as **the pull after the first boss**, and chose **Sporeblight Belcher** (275 forces, 42% of the dungeon) as the card that carries it. Attribute the creator in the label; do not restate the video's claims as if they were ours.

**The fixture image:** `example.webp` must be a real WebP. Copy an existing committed one rather than generating a placeholder:

```bash
mkdir -p public/tips/__fixtures__ && cp public/portraits/101209.webp public/tips/__fixtures__/example.webp
```

- [ ] **Step 1: Create the image directory and the fixture file**

Run the copy above, then confirm it is a real file:

```bash
ls -l public/tips/__fixtures__/example.webp
```

Expected: a non-zero size.

- [ ] **Step 2: Write the failing integrity test**

Create `src/lib/content.integrity.test.ts`:

```ts
// ABOUTME: Checks that every image a card names really exists under public/tips/.
// ABOUTME: A typo there is a silent 404 in production, visible to no other test and no reviewer.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { splitFrontmatter } from './content'

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
})
```

- [ ] **Step 3: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/content.integrity.test.ts
```

Expected: FAIL — `splitFrontmatter` is not exported.

- [ ] **Step 4: Export `splitFrontmatter`**

In `src/lib/content.ts`, change `function splitFrontmatter(` to `export function splitFrontmatter(` and add one line to its neighbourhood explaining why it is public:

```ts
/** Exported for the integrity test, which reads the same frontmatter straight off disk. */
```

- [ ] **Step 5: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/content.integrity.test.ts
```

Expected: PASS — the `263109` fixture declares `example.webp`, which now exists.

- [ ] **Step 6: Add the real tip to Sporeblight Belcher**

In `content/the-blinding-vale/254850-sporeblight-belcher.md`, immediately before the closing `---` of the frontmatter:

```yaml
tips:
  - video: https://www.youtube.com/shorts/9D0gCU8Tp5Y
    label: "Naowh — taking the pull after the first boss"
```

In `content/the-blinding-vale/254850-sporeblight-belcher.fr.md`, at the matching position — the whole list is restated, which is what a translated `tips:` means:

```yaml
tips:
  - video: https://www.youtube.com/shorts/9D0gCU8Tp5Y
    label: "Naowh — prendre le pull après le premier boss"
```

- [ ] **Step 7: See it in the browser**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run dev -- --port 5199 --strictPort > /dev/null 2>&1 &
```

Then `preview_start {url: "http://localhost:5199/#/d/the-blinding-vale/codex/mob/254850"}` and `read_page`. Confirm the tips section renders with the button and no `iframe`. Kill it afterwards by port:

```bash
powershell -NoProfile -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 5199 -State Listen -ErrorAction SilentlyContinue).OwningProcess -Force"
```

- [ ] **Step 8: Run the whole suite and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
```

```bash
git add public/tips src/lib/content.ts src/lib/content.integrity.test.ts content/the-blinding-vale
git commit -m "Give Blinding Vale's worst pull a video, and check images exist

A filename nobody committed is a 404 in production that no test and no
reviewer would catch, so the integrity test reads what the cards declare
and looks for the file. It asserts a non-empty subject first: a check that
passes because it found nothing to check is worse than no check.

The tip itself is Naowh's Short on the pull after the first boss, on the
275-force pack the dungeon cannot be routed around.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: End to end, in a real browser

**Files:**
- Create: `e2e/tips.spec.ts`

**Interfaces:**
- Consumes: the real tip committed in task 5.
- Produces: nothing.

**Why the codex route and not the Route tab:** map blips carry `data-clone`, a clone id — there is no attribute that addresses "the blip for npc 254850", so hovering the right mob in a real browser is not reliably expressible. The codex route `#/d/<slug>/codex/mob/<npcId>` addresses the card directly, and the component under test is the same `MobCard` either way. The Route tab's own mounting is covered by `MobPanel.test.tsx` in task 4. What only a real browser can prove is what this spec asserts: that the production build, served under its deployed sub-path, creates the frame on click.

- [ ] **Step 1: Write the spec**

Create `e2e/tips.spec.ts`:

```ts
// ABOUTME: A video tip in the real build: no frame before the click, the right frame after.
// ABOUTME: Never loads YouTube itself — the assertion is on the iframe's src, not on its content.

import { test, expect } from '@playwright/test'

/** Naowh's Short on the pull after the first boss, committed on Sporeblight Belcher's card. */
const VIDEO_ID = '9D0gCU8Tp5Y'

test('a video tip loads its embed only once the reader asks', async ({ page }) => {
  await page.goto('./#/d/the-blinding-vale/codex/mob/254850')

  const card = page.locator('[data-npc="254850"]')
  await expect(card).toBeVisible()

  // Before the click the page has contacted nobody: the button is ours, the frame is not.
  await expect(card.locator('iframe')).toHaveCount(0)

  await card.getByRole('button', { name: /Naowh/ }).click()

  const frame = card.locator('iframe')
  await expect(frame).toHaveCount(1)
  await expect(frame).toHaveAttribute('src', new RegExp(`youtube-nocookie\\.com/embed/${VIDEO_ID}`))
})

test('the link out survives the deployed sub-path', async ({ page }) => {
  await page.goto('./#/d/the-blinding-vale/codex/mob/254850')

  const link = page.locator('[data-npc="254850"]').getByRole('link', { name: 'Open on YouTube' })
  await expect(link).toHaveAttribute('href', `https://www.youtube.com/watch?v=${VIDEO_ID}`)
})
```

- [ ] **Step 2: Run it and watch it pass — after watching it fail**

First prove it can fail. Temporarily change `VIDEO_ID` to `0000000000X`, run, and confirm the second assertion fails:

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx playwright test e2e/tips.spec.ts
```

Expected: FAIL on the `src` regex. Restore the real id and run again.

Expected: PASS, both tests. Playwright starts `wrangler dev` and `vite preview --base=/keystone-codex/` itself; neither the network nor a Cloudflare account is needed.

Note: `getByRole` matches an accessible name as a case-insensitive **substring** by default — that is why the button locator uses `/Naowh/` and the link locator, whose name is an exact known string, does not need `exact: true` here. If a second control on the card ever matches, add it rather than loosening the regex.

- [ ] **Step 3: Commit**

```bash
git add e2e/tips.spec.ts
git commit -m "Prove in a real browser that the embed appears only on demand

jsdom does not really execute an iframe pointed at a third-party origin,
and the deployed sub-path is exactly what an asset URL gets wrong, so the
one thing worth a real browser here is the frame: absent before the click,
present with the right video id after. The suite never loads YouTube — it
asserts on the src, not on what is behind it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: A fresh card advertises the field

**Files:**
- Modify: `scripts/content-stub.mjs`
- Test: `scripts/content-stub.test.mjs`
- Regenerate: `content/__fixtures__/270306-ritual-chieftain.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

**Careful:** `content/__fixtures__/270306-ritual-chieftain.md` is generated by `buildMobStub()` and `content-stub.test.mjs` compares it byte-for-byte. Changing the template **must** be followed by regenerating that fixture, or the suite goes red.

- [ ] **Step 1: Write the failing test**

In `scripts/content-stub.test.mjs`, in the describe covering `buildMobStub`:

```js
it('advertises tips without turning the field on', () => {
  const stub = buildMobStub(enemy, spells)
  // Commented out on purpose: an empty `tips:` would parse to null on every scaffolded card.
  expect(stub).toContain('# tips:')
  expect(stub).not.toMatch(/^tips:/m)
})
```

Use whatever `enemy` / `spells` fixtures that file already builds; do not introduce new ones.

- [ ] **Step 2: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run scripts/content-stub.test.mjs
```

Expected: FAIL — the stub contains no `# tips:`.

- [ ] **Step 3: Add the hint to the template**

In `scripts/content-stub.mjs`, in `buildMobStub`, immediately after the two `trap` lines and before `lines.push('---')`:

```js
  lines.push('')
  lines.push('# Tips: a sentence, a YouTube link, or a screenshot committed under public/tips/.')
  lines.push('# See CONTRIBUTING.md. Uncomment and fill in — an empty `tips:` is not a tip.')
  lines.push('# tips:')
  lines.push('#   - text: "…"')
```

- [ ] **Step 4: Regenerate the committed stub fixture**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run scripts/content-stub.test.mjs
```

If that test compares against the committed fixture and fails on the diff, regenerate the fixture the way `content-stub.test.mjs` documents — read the file before assuming a command exists for it — then re-run until both the template test and the byte-comparison pass. **Do not edit the fixture by hand** to match.

- [ ] **Step 5: Run the whole suite and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
```

```bash
git add scripts content/__fixtures__/270306-ritual-chieftain.md
git commit -m "Tell a fresh card that tips exist

A field nobody can see is a field nobody uses. Commented out rather than
present and empty: an empty `tips:` parses to null on every scaffolded
card, which is noise the loader would have to keep stepping over.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: The contributor guide

**Files:**
- Create: `CONTRIBUTING.md`, `CONTRIBUTING.fr.md`

**Interfaces:**
- Consumes: everything above — it documents the format as built.
- Produces: the document task 9 links to instead of restating.

**Both files land in the same commit.** They are a translated pair; nothing tests a document, so the only protection against drift is that rule.

- [ ] **Step 1: Write `CONTRIBUTING.md`**

English. Structure, in order, with these exact headings:

1. `# Contributing to Keystone Codex` — one paragraph: what the codex is, that anyone who plays can improve a card, and a link to `CONTRIBUTING.fr.md`.
2. `## What you can edit, and what you can't` — **the first thing, per decision 14.** A two-column table: *hand-written* (`content/**.md`: threat, role, spell `tag`/`prio`/`note`, trap, prose, tips) versus *generated, never edited by hand* (spell names, icons, descriptions, cast times, mob names, forces, positions, applicable CC — from MDT and Wowhead, rewritten by `npm run data`). Close with the sentence that a wrong spell name is a data problem, not a card problem, and belongs in an issue.
3. `## Two ways to edit` — `### In the browser` (open the file on GitHub, pencil icon, *Propose changes*, open a pull request; uploading an image via *Add file → Upload files*), then `### On your machine` (`npm install`, `npm run dev`, the card hot-reloads as you save; `npm test` and `npm run typecheck` before pushing).
4. `## Anatomy of a card` — the annotated example, exactly:

```markdown
---
npcId: 270306
threat: high              # low | medium | high | lethal
role: melee               # caster | melee | patrol | miniboss | add
spells:
  - id: 1306911
    tag: tank             # kick | frontal | dodge | dispel | tank | soak | ignore
    prio: 1
    note: "581k physical on the current target."
trap: "Immune to every CC: you have to burst it."
tips:
  - text: "Pull it into the corridor — the frontal has nowhere to reach the healer."
---

Free-form prose: positioning, focus order, cooldowns.
```

5. `## Recipes` — one `###` per task, each with a worked example: *Add or change a trap* · *Annotate a spell* · *Rate a mob's threat* (link to the scale in the skill rather than restating it) · *Write the prose* · *Add a tip* · *Translate a card into French* · *A mob has no file yet* · *A spell name is wrong*.
6. Inside *Add a tip*, the three kinds, verbatim:

```yaml
tips:
  - text: "Kick the second cast, not the first — the first is baited."
  - video: https://www.youtube.com/shorts/9D0gCU8Tp5Y
    label: "Naowh — the pull after the first boss"
  - image: zuljan-beams.webp
    label: "Where the beams land"
```

   With these rules stated plainly: a `label:` is required on a video and an image and optional on text; accepted video URLs are `watch?v=`, `youtu.be/`, `/shorts/` and `/embed/`, with an optional `?t=90`; an image is a **bare filename** committed to `public/tips/<dungeon>/`, `.webp` preferred, named after what it shows; nothing is embedded until a reader clicks; and **credit the creator in the label**.
7. Inside *Translate a card into French*, state what decision 7 means for tips: `.fr.md` carries `note`, `trap`, prose and — if it names `tips:` at all — the **whole** list, since a partial list is not merged. Leaving `tips:` out is fine and shows the base language with an `EN` mark.
8. `## Before you open a pull request` — one card per PR where possible; `npm test` and `npm run typecheck` locally, or let CI say it; what CI will not catch (a claim the data does not support).
9. `## House rules` — the two that matter most for a public repo: write what the data holds and nothing more; do not paste someone else's guide, link it as a tip instead.
10. `## Where to ask` — open an issue.

- [ ] **Step 2: Write `CONTRIBUTING.fr.md`**

The same document in French, same headings in the same order, same code blocks (YAML keys and values stay as they are — only prose and the `label:` / `note:` example strings are translated). Head it with a link back to `CONTRIBUTING.md`.

- [ ] **Step 3: Check the links resolve**

```bash
grep -o "](\([^)]*\))" CONTRIBUTING.md CONTRIBUTING.fr.md
```

Every relative target must exist. Check each by hand — a dead link in the document that teaches people the repository is worse than no document.

- [ ] **Step 4: Commit both together**

```bash
git add CONTRIBUTING.md CONTRIBUTING.fr.md
git commit -m "Write down how to edit the codex without an agent

The repository documented how to run the extraction chain and nowhere
documented how to write a card, which left the people most able to improve
one — the people who actually play the dungeons — with nothing to read.

It opens with what cannot be edited, because that is the mistake a
newcomer makes first: spell names come from Wowhead and mob forces from
MDT, and editing either by hand is work the next extraction erases.

French and English land together. Nothing tests a document, so the pair
staying in step is a rule or it is nothing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: Point everything at it

**Files:**
- Modify: `.claude/skills/codex-content/SKILL.md`, `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: `CONTRIBUTING.md` from task 8.
- Produces: nothing.

- [ ] **Step 1: Give the skill its tips section**

In `.claude/skills/codex-content/SKILL.md`, in the `## Fields` section, after the paragraph on `note:` and `trap:` being markdown, add:

```markdown
**Tips are for what a card cannot say.** A `tips:` entry carries a sentence, a YouTube video or
Short, or a screenshot committed under `public/tips/<dungeon>/`. The format is in
[`CONTRIBUTING.md`](../../../CONTRIBUTING.md); what belongs here is the judgement:

- **A tip is not a second prose block.** If it can be written as a sentence in the card, write it
  there. A tip earns its place when the thing being explained is spatial or timed — where to
  stand, what the pull looks like when it goes wrong.
- **Credit the creator in the `label:`.** We link other people's work; we do not present it as
  ours, and we do not transcribe a video's claims into the card as if they were sourced.
- **A video is not a source.** The rules in *What may be written at all* are unchanged: a figure
  goes in the card only if MDT or Wowhead holds it. A video may contradict them, and if it does,
  say so in the prose rather than quietly following it.
- **Tips are never exported to MDT**, like everything else under `content/`.
```

- [ ] **Step 2: Delegate the format**

In the same `## Fields` section, after the sentence about `threat`, `role`, `tag` and `prio` living only in the base file, add:

```markdown
The full field reference — every key, its allowed values, and what a `.fr.md` may carry — is
[`CONTRIBUTING.md`](../../../CONTRIBUTING.md). It is written for contributors who do not use an
agent, and it is the one place the format is defined; this skill keeps the judgement.
```

Then read the rest of the skill and delete any sentence that now merely restates the format. **Keep every judgement.** The threat scale, "What may be written at all", the two tooling traps and the cross-link address all stay here.

- [ ] **Step 3: Point the README at the guide**

In `README.md`, in `## Editing the codex`: add `tips:` to the fenced example (one `- text:` entry is enough), and after the example add:

```markdown
**Writing your first card?** [CONTRIBUTING.md](CONTRIBUTING.md) walks through it — in the
browser or locally, with a recipe per task ([en français](CONTRIBUTING.fr.md)).
```

- [ ] **Step 4: Record the two rules in CLAUDE.md**

In `# Repository Overview` → `## Invariants not to break`, add:

```markdown
- **Nothing under `content/` ever reaches an MDT string.** The codec serialises the route
  document only; tips, traps and prose are ours and stay ours. A share string carries a route.
```

In `# Git & Version Control` → `## Language`, after the paragraph on what is deliberately not
English-only, add:

```markdown
`CONTRIBUTING.md` and `CONTRIBUTING.fr.md` are a translated pair: **both land in the same commit
or neither does.** Nothing tests a document, so that rule is the only thing keeping them in step.
```

- [ ] **Step 5: Run everything one last time**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test && npm run typecheck && npm run build
```

Expected: all PASS. Then `npx playwright test` for the E2E suite.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/codex-content/SKILL.md README.md CLAUDE.md
git commit -m "Send contributors to the guide, and keep the judgement in the skill

One rule, one home: the format now lives in CONTRIBUTING.md, where the
people who follow it will look, and the skill keeps what it is actually
for — the threat scale, what may be claimed at all, and now what earns a
tip rather than a sentence of prose.

Two rules get written down because nothing enforces them: content never
reaches an MDT string, and the two contributor guides land together.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage.** Decision 1 → task 2 fixtures. 2 → task 1 `parseTip`. 3 → task 1 `youtube`. 4 → task 3 `VideoTip`. 5 → task 1 `IMAGE_FILE` + `tipImageUrl`, task 5 integrity. 6 → task 1 warn-and-drop. 7 → task 2 merge. 8 → task 2 `isStub`. 9 → task 4 mount. 10 → task 9 CLAUDE.md. 11 → tasks 8 and 9. 12 → task 8 step 4. 13 and 14 → task 8 step 1. The spec's open E2E question is resolved by task 6, which exists.

**Type consistency.** `Tip` is defined once in task 1 and imported everywhere after. `parseTips(raw, where)`, `youtube(url)`, `embedUrl({videoId, start})`, `watchUrl(videoId)`, `tipImageUrl(slug, file)` keep the same signatures in tasks 2, 3 and 5. `MobTips` takes `{ slug, tips, fallback }` in task 3 and is mounted with exactly those three props in task 4. `BaseLanguageMark` is exported from `Badges.tsx` in task 3 step 4 before task 3 step 5 imports it.

**Known soft spots, called out rather than hidden.** Task 4's `MobPanel.test.tsx` addition reuses constants that file already defines — the implementer must read it first rather than pasting a new `Enemy` literal. Task 7 step 4 depends on how `content-stub.test.mjs` regenerates its committed fixture; that file is to be read, not guessed at. Task 8 specifies a document by its headings and its exact code blocks rather than its full prose, which is the most a plan can pin without writing the document twice.
