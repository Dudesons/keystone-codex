# Tip discoverability implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a reader learns a mob has a tip before scrolling to it — from a badge on the card that jumps to the section, a `?` badge on the map blip, and a section on the Overview listing every tip in the dungeon.

**Architecture:** one derivation feeds all three. `MobIndicators` gains `hasTips`, filled from the `getMobContent` call `getIndicators` already makes, beside the `hasTrap` that is already there. The card badge and the map badge read that flag. The Overview needs the tips themselves, so `getHighlights` gains a `tips` list shaped like its existing `traps` list, rendered by a `TipList` that mounts the real `MobTips` — which is what carries the no-request-before-click guarantee.

**Tech Stack:** TypeScript, React 19, Vite, Tailwind 4, Vitest (`app` project: node by default, jsdom per-file), Playwright.

**Spec:** [docs/plans/2026-08-23-tip-discoverability-design.md](2026-08-23-tip-discoverability-design.md) — read it before task 1. Its 7 numbered decisions are the argument behind everything below.

## Global Constraints

- **Shell on this machine:** `node` and `npm` are not on the Bash tool's PATH. Prefix every run: `export PATH="/c/Program Files/nodejs:$PATH"`. `rm` is denied by the permission layer — overwrite with the Write tool instead.
- **English** for code, comments, tests and commit messages. French belongs in `src/lib/i18n/fr.ts` values and `content/**.md` only.
- **Every new file starts with two `// ABOUTME: ` lines** saying what it does.
- **No mocks.** Tests read the real generated data and the real `content/**.md` through the existing loader.
- **Component test files** carry `// @vitest-environment jsdom` on line 4 (after the ABOUTME pair), declare their own `afterEach(cleanup)` — Testing Library runs without `globals: true` — and mount through `renderEn` / `renderFr` from `src/test/render.tsx`, never bare `render`.
- **Never pin a test to a card's wording.** Derive expectations by calling `getMobContent` or the dictionary; assert that a field is carried, not what it says. Six tests have broken this way.
- **jsdom implements neither `Element.prototype.scrollIntoView` nor `ResizeObserver`.** Stub what the file you mount needs, as `CodexPanel.test.tsx` and `DungeonPage.test.tsx` already do.
- **Every i18n key lands in both dictionaries.** They are typed against each other; one alone is a type error, by design.
- **Commit style:** imperative subject, no `feat:`/`fix:` prefix, body explains *why*. Never `--no-verify`.
- **Run `npm test` before every commit.** Its output must be pristine. Known exception: the `relay` project intermittently prints `TypeError: Can't call WebSocket send() after close()`, which is **undocumented** and unrelated — CLAUDE.md's e2e paragraph describes a different message in a different runtime. Do not cite CLAUDE.md for it.
- **This branch is cut from `tips-and-contributing-design`, not `main`.** Everything it builds on ships in PR #13.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/indicators.ts` | Gains `hasTips: boolean`. The single derivation both badges read. |
| `src/components/codex/Badges.tsx` | Gains `TipsJumpBadge` — a button, unlike its neighbours, because it navigates. |
| `src/components/codex/MobTips.tsx` | Gains a stable `id` on its section so something can scroll to it. |
| `src/components/codex/MobCard.tsx` | Renders the badge in the header behind `!compact`. |
| `src/components/map/DungeonMap.tsx` | One `badges.push` entry and one `Legend` row. |
| `src/lib/highlights.ts` | Gains `HighlightTip` and `DungeonHighlights.tips`. |
| `src/components/highlights/TipList.tsx` | **new.** Mounts `MobTips` per mob, shaped like `TrapList`. |
| `src/routes/HighlightsPage.tsx` | The fourth section. |
| `e2e/tips.spec.ts` | Two scenarios appended: the map badge, and the Overview making no third-party request before the click. |

---

## Task 1: The flag every surface reads

**Files:**
- Modify: `src/lib/indicators.ts`
- Test: `src/lib/indicators.test.ts`

**Interfaces:**
- Consumes: `getMobContent(slug, npcId, locale)` and `MobContent.tips?: Tip[]`, both already shipped.
- Produces: `MobIndicators.hasTips: boolean` — read by tasks 3 and 4.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/indicators.test.ts`. Find the existing `describe` for `getIndicators` and follow the shape of the `hasTrap` tests already there — reuse whatever helper that file uses to obtain an `Enemy`; do not paste a fresh literal.

```ts
describe('hasTips', () => {
  it('is true for a mob whose card carries tips', () => {
    const enemy = enemyOf('the-blinding-vale', 254_850)
    expect(getIndicators('the-blinding-vale', enemy).hasTips).toBe(true)
  })

  it('is false for a mob whose card carries none', () => {
    const enemy = enemyOf('the-blinding-vale', 254_850)
    const other = firstEnemyWithout('the-blinding-vale', (c) => Boolean(c?.tips?.length))
    expect(getIndicators('the-blinding-vale', other).hasTips).toBe(false)
    expect(getIndicators('the-blinding-vale', enemy).hasTips).toBe(true)
  })

  it('answers per locale, because a translation replaces the list', () => {
    const enemy = enemyOf('the-blinding-vale', 254_850)
    // Both locales carry tips on this card. The point is that the cache key varies:
    // asking in French must not return the English answer by accident.
    expect(getIndicators('the-blinding-vale', enemy, 'fr').hasTips).toBe(true)
  })
})
```

If `enemyOf` / `firstEnemyWithout` do not exist in that file, write the lookup inline using `getLookup(slug)!.enemyById.get(id)!` — the pattern `indicators.test.ts` already uses. **Read the file first and match it.**

- [ ] **Step 2: Run the tests and watch them fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run --project app src/lib/indicators.test.ts
```

Expected: FAIL — `hasTips` is `undefined`, not `true`. If it fails because `enemyOf` is not defined, fix the test's plumbing and re-run until the failure is the assertion.

- [ ] **Step 3: Add the field**

In `src/lib/indicators.ts`, add to the `MobIndicators` interface, immediately after `hasTrap`:

```ts
  hasTrap: boolean
  /** The card carries at least one tip. Locale-sensitive: a translation replaces the list whole. */
  hasTips: boolean
```

and in the `indicators` object literal inside `getIndicators`, immediately after the `hasTrap` line:

```ts
    hasTrap: Boolean(content?.trap),
    hasTips: Boolean(content?.tips?.length),
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run --project app src/lib/indicators.test.ts
```

Expected: PASS.

- [ ] **Step 5: Full suite and typecheck**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run typecheck && npm test
```

Expected: all green. `MobIndicators` is constructed in exactly one place, so nothing else should need changing — if the typecheck says otherwise, read the error rather than casting around it.

- [ ] **Step 6: Commit**

```bash
git add src/lib/indicators.ts src/lib/indicators.test.ts
git commit -m "$(cat <<'EOF'
Let the indicators say whether a card has tips

Three surfaces are about to ask the same question, and getIndicators is
already reading the card to answer hasTrap. Asking twice would mean two
answers to keep in step, and a second cache keyed slightly differently.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: A section worth scrolling to

**Files:**
- Modify: `src/components/codex/MobTips.tsx`
- Test: `src/components/codex/MobTips.test.tsx`

**Interfaces:**
- Produces: `tipsSectionId(npcId: number): string`, exported from `MobTips.tsx` — task 3 uses it to build the scroll target, and the id must be computed the same way in both places.

Why an exported function rather than a literal: `MobCard` renders the badge and `MobTips` renders the target, and a hardcoded string in two files is a rename waiting to break silently. The route builder can also mount several cards at once, so the id must be per mob, not a constant.

- [ ] **Step 1: Write the failing test**

Append to `src/components/codex/MobTips.test.tsx`:

```ts
it('gives its section an id derived from the mob, so a badge can scroll to it', () => {
  const { container } = renderEn(
    <MobTips slug="__fixtures__" npcId={263_109} tips={[{ kind: 'text', text: 'x' }]} fallback={false} />,
  )
  expect(container.querySelector(`#${CSS.escape(tipsSectionId(263_109))}`)).not.toBeNull()
})
```

Import `tipsSectionId` alongside the default import at the top of the file.

- [ ] **Step 2: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run --project app src/components/codex/MobTips.test.tsx
```

Expected: FAIL — `tipsSectionId` is not exported (a TypeScript/import error), then once imported, no element carries the id.

- [ ] **Step 3: Add the prop and the id**

In `src/components/codex/MobTips.tsx`, export the helper above the component:

```ts
/**
 * The scroll target for a card's tips.
 *
 * `MobCard` renders the badge and this component renders the target, so the id is computed in
 * one place rather than written as a literal in two. It is keyed by the mob because the route
 * builder can hold more than one card at a time.
 */
export const tipsSectionId = (npcId: number) => `tips-${npcId}`
```

Add `npcId` to the props type and destructuring:

```ts
export default function MobTips({
  slug,
  npcId,
  tips,
  /** The list fell back to the base language: mark the section, not each row. */
  fallback,
}: {
  slug: string
  npcId: number
  tips: Tip[]
  fallback: boolean
}) {
```

and put the id and a scroll margin on the section's root element, replacing its opening tag:

```tsx
    <div id={tipsSectionId(npcId)} className="scroll-mt-2 border-t border-ink-700 px-3 py-3">
```

`scroll-mt-2` matches the margin `MobCard`'s `<article>` already carries, so a jump does not park the heading flush against the top of the scroll container.

- [ ] **Step 4: Pass `npcId` at the existing mount**

`src/components/codex/MobCard.tsx` already mounts `MobTips`. The typecheck will fail until it passes the new prop:

```tsx
      {!compact && content?.tips && content.tips.length > 0 && (
        <MobTips
          slug={slug}
          npcId={enemy.id}
          tips={content.tips}
          fallback={content.fallback.tips}
        />
      )}
```

- [ ] **Step 5: Run the tests and the typecheck**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run --project app src/components/codex/MobTips.test.tsx && npm run typecheck
```

Expected: PASS and clean. Other tests in that file construct `MobTips` directly and will need `npcId` added — fix each rather than making the prop optional. An optional prop here would let a caller silently produce a section nothing can jump to.

- [ ] **Step 6: Full suite, then commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
git add src/components/codex/MobTips.tsx src/components/codex/MobTips.test.tsx src/components/codex/MobCard.tsx
git commit -m "$(cat <<'EOF'
Give the tips section an address

A badge is about to scroll to it, and the route builder can hold several
cards at once, so the target has to name its mob. The id is computed by an
exported helper rather than written as a literal in the two files that
need to agree on it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: The badge that jumps

**Files:**
- Modify: `src/components/codex/Badges.tsx`, `src/components/codex/MobCard.tsx`, `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`
- Test: `src/components/codex/MobCard.test.tsx`

**Interfaces:**
- Consumes: `MobIndicators.hasTips` (task 1), `tipsSectionId` (task 2).
- Produces: `TipsJumpBadge({ npcId }: { npcId: number })`, exported from `Badges.tsx`.

- [ ] **Step 1: Add the interface string to both dictionaries**

In `src/lib/i18n/en.ts`, after `'tip.openOnYouTube'` (line 77):

```ts
  'tip.jump': 'Has tips — jump to them',
```

In `src/lib/i18n/fr.ts`, after `'tip.openOnYouTube'` (line 78):

```ts
  'tip.jump': 'Contient des astuces — y aller',
```

- [ ] **Step 2: Write the failing tests**

Append to `src/components/codex/MobCard.test.tsx`. Read the file first: it already defines the enemies it uses and imports `en` — reuse both.

```ts
describe('Tips badge', () => {
  it('marks a card whose mob has tips', () => {
    renderEn(<MobCard slug="__fixtures__" enemy={chosen} />)
    expect(screen.getByRole('button', { name: en['tip.jump'] })).toBeTruthy()
  })

  it('leaves a card without tips unmarked', () => {
    renderEn(<MobCard slug="__fixtures__" enemy={stub} />)
    expect(screen.queryByRole('button', { name: en['tip.jump'] })).toBeNull()
  })

  it('does not offer the jump in compact, where the section is not rendered', () => {
    renderEn(<MobCard slug="__fixtures__" enemy={chosen} compact />)
    expect(screen.queryByRole('button', { name: en['tip.jump'] })).toBeNull()
  })

  it('scrolls the tips section into view when clicked', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    renderEn(<MobCard slug="__fixtures__" enemy={chosen} />)
    await userEvent.click(screen.getByRole('button', { name: en['tip.jump'] }))
    expect(scrollIntoView).toHaveBeenCalled()
  })
})
```

`chosen` and `stub` are the constants that file already defines — check their names and use whatever it calls the fixture mob that carries tips (`263109`) and one that does not. jsdom has no `scrollIntoView`; the fourth test installs it, so make sure the file restores or reassigns it rather than leaking into later tests, following whatever cleanup convention the file already uses.

- [ ] **Step 3: Run them and watch them fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run --project app src/components/codex/MobCard.test.tsx
```

Expected: FAIL — no such button. The compact and no-tips tests will pass already; that is fine and expected, they are guarding against a future regression, not driving this step.

- [ ] **Step 4: Write the badge**

Append to `src/components/codex/Badges.tsx`:

```tsx
/**
 * Says the card has tips, and takes the reader to them.
 *
 * A button rather than a badge, because it acts. The tips section sits at the bottom of the
 * card, below the spell list, which is right for reading and wrong for discovery — this is the
 * announcement that ordering costs.
 */
export function TipsJumpBadge({ npcId }: { npcId: number }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      title={t('tip.jump')}
      aria-label={t('tip.jump')}
      onClick={(e) => {
        // The header is clickable in the route builder: selecting the mob and jumping to its
        // tips are different intents, and this one must not also fire that one.
        e.stopPropagation()
        document
          .getElementById(tipsSectionId(npcId))
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }}
      className="shrink-0 rounded border border-gold-500/40 bg-gold-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-gold-400 hover:border-gold-400 hover:bg-gold-500/20"
    >
      ?
    </button>
  )
}
```

Add the import at the top of `Badges.tsx`:

```ts
import { tipsSectionId } from './MobTips'
```

- [ ] **Step 5: Render it in the card header**

In `src/components/codex/MobCard.tsx`, add `TipsJumpBadge` to the existing import from `./Badges`, then render it in the header beside the other badges, behind the same guard the section uses:

```tsx
        {!compact && ind.hasTips && <TipsJumpBadge npcId={enemy.id} />}
```

Place it where the header's badge row lives — read the header and put it beside `ThreatBadge`, not in a new row of its own.

**Do not make this conditional on anything else.** The `!compact` half is what keeps it honest: compact hides the section, so a badge there would scroll to nothing.

- [ ] **Step 6: Run the tests and watch them pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run --project app src/components/codex/MobCard.test.tsx && npm run typecheck
```

Expected: PASS, clean.

- [ ] **Step 7: Full suite, then commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
git add src/components/codex/Badges.tsx src/components/codex/MobCard.tsx src/components/codex/MobCard.test.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit -m "$(cat <<'EOF'
Announce a card's tips in its header

Tips sit at the bottom of the card because the trap and the spell list are
what a router reads mid-pull. That ordering is still right, but it left the
section invisible until you scrolled past everything — in the route
builder's narrow column, invisible in practice.

The badge hides in compact for the same reason the section does: a control
that scrolls to something not rendered is worse than no control.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: The map badge

**Files:**
- Modify: `src/components/map/DungeonMap.tsx`, `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`
- Test: `src/components/map/DungeonMap.test.tsx`

**Interfaces:**
- Consumes: `MobIndicators.hasTips` (task 1).

- [ ] **Step 1: Add both strings to both dictionaries**

`src/lib/i18n/en.ts`, after `'map.badgeDispel'`:

```ts
  'map.badgeTips': 'Has tips',
```

after `'legend.dispel'`:

```ts
  'legend.tips': 'Something written about this mob',
```

`src/lib/i18n/fr.ts`, after `'map.badgeDispel'`:

```ts
  'map.badgeTips': 'Contient des astuces',
```

after `'legend.dispel'`:

```ts
  'legend.tips': 'Quelque chose d’écrit sur ce mob',
```

- [ ] **Step 2: Write the failing tests**

Append to `src/components/map/DungeonMap.test.tsx`. That file is large and already has a helper for rendering the map and finding a blip by `data-clone` — read it and reuse. The badge is an SVG `<title>` inside the blip group, matching how the existing `K` badge is tested.

```ts
describe('Tips badge', () => {
  it('marks the blip of a mob whose card has tips', () => {
    const { container } = renderMap('the-blinding-vale')
    const blip = blipFor(container, 254_850)
    expect(within(blip).queryByText('?')).not.toBeNull()
  })

  it('leaves a mob without tips unmarked', () => {
    const { container } = renderMap('the-blinding-vale')
    const blip = blipFor(container, npcWithoutTips)
    expect(within(blip).queryByText('?')).toBeNull()
  })

  it('gives the legend a row for it', () => {
    renderEn(/* the map, as the file's other legend tests mount it */)
    expect(screen.getByText(en['legend.tips'])).toBeTruthy()
  })
})
```

**Read the existing kick-badge and legend tests in that file and mirror them exactly** — including how they locate a blip, since blips are keyed by `data-clone` (`enemyIndex:cloneIndex`) and not by npc id. If the file has no `blipFor` helper, find how the kick tests reach a blip and do the same.

- [ ] **Step 3: Run them and watch them fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run --project app src/components/map/DungeonMap.test.tsx
```

Expected: FAIL — no `?` glyph, no legend row.

- [ ] **Step 4: Push the badge**

In `src/components/map/DungeonMap.tsx`, in the `badges` array inside the blip component, after the dispel line:

```ts
  if (ind.dispel.length) badges.push({ color: '#7f6fd0', glyph: 'D', title: t('map.badgeDispel') })
  if (ind.hasTips) badges.push({ color: '#e0b552', glyph: '?', title: t('map.badgeTips') })
```

Gold (`#e0b552`) is the colour the app already uses for "ours, written by a human" — the boss ring and the card's own accents. The other four badge colours all mean a mechanic; this one does not, and reading differently is the point.

- [ ] **Step 5: Add the legend row**

In `Legend()`, append to `rows`:

```ts
    ['#7f6fd0', 'D', t('legend.dispel')],
    ['#e0b552', '?', t('legend.tips')],
```

- [ ] **Step 6: Run the tests and watch them pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run --project app src/components/map/DungeonMap.test.tsx && npm run typecheck
```

Expected: PASS, clean. Some existing tests count badges on a blip — if any now fail because a mob gained a fifth badge, **read the assertion before changing it**: a count that rose because this badge is genuinely there is a correct update; a count you lower to make green is a buried regression.

- [ ] **Step 7: Full suite, then commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
git add src/components/map/DungeonMap.tsx src/components/map/DungeonMap.test.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit -m "$(cat <<'EOF'
Mark the mobs someone has written about on the map

The map is where a route gets planned, and until now nothing on it said a
mob had anything written about it — the reader had to open every card to
find out. One glyph in the badge arc that already exists, gold rather than
a mechanic colour, because it means "ours" and not "watch out".

Per blip rather than per pack: a pack marker cannot say which card to open.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Every tip in the dungeon, in one list

**Files:**
- Modify: `src/lib/highlights.ts`
- Test: `src/lib/highlights.test.ts`

**Interfaces:**
- Consumes: `MobContent.tips`, `MobContent.fallback.tips`, `Tip` from `src/lib/tips.ts`.
- Produces: `HighlightTip` and `DungeonHighlights.tips` — task 6 renders them.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/highlights.test.ts`:

```ts
describe('tips', () => {
  it('lists a mob whose card carries tips', () => {
    const { tips } = getHighlights('the-blinding-vale')
    expect(tips.map((x) => x.npcId)).toContain(254_850)
  })

  it('carries the tips themselves, not a flag', () => {
    const { tips } = getHighlights('the-blinding-vale')
    const entry = tips.find((x) => x.npcId === 254_850)!
    expect(entry.tips).toEqual(getMobContent('the-blinding-vale', 254_850)!.tips)
  })

  it('names the mob in the reader’s language', () => {
    const en = getHighlights('the-blinding-vale').tips.find((x) => x.npcId === 254_850)!
    const fr = getHighlights('the-blinding-vale', 'fr').tips.find((x) => x.npcId === 254_850)!
    expect(fr.mobName).not.toBe(en.mobName)
  })

  it('includes a mob the shortlist excludes', () => {
    // The point of a separate section: the mob table only holds mobs with a prio:1 spell that
    // also clear earnsARow, so a tip on any other mob would otherwise never reach this page.
    const { mobs, tips } = getHighlights('the-blinding-vale')
    const shortlisted = new Set(mobs.map((m) => m.npcId))
    expect(tips.some((x) => !shortlisted.has(x.npcId))).toBe(true)
  })
})
```

**The fourth test may not hold today** — it depends on whether any mob outside the shortlist currently carries a tip. Run it. If it fails because only shortlisted mobs have tips, that is a fact about the content, not a bug: change the assertion to prove the *mechanism* instead — that `tips` is built from every non-boss mob with tips regardless of `earnsARow` — by asserting `tips.length` equals the number of mobs in the pool whose content has tips. Say in your report which you did and why.

- [ ] **Step 2: Run them and watch them fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run --project app src/lib/highlights.test.ts
```

Expected: FAIL — `tips` is `undefined` on the result.

- [ ] **Step 3: Add the type**

In `src/lib/highlights.ts`, after the `HighlightTrap` interface:

```ts
/**
 * A mob's tips, on the briefing page.
 *
 * Unlike the traps list, this one is not an overflow of the mob table: it holds every mob with
 * tips, shortlisted or not. The table's shortlist drops any mob without a `prio: 1` spell that
 * clears `earnsARow`, and a tip is worth reading whatever the mob's threat.
 */
export interface HighlightTip {
  npcId: number
  mobName: string
  threat?: Threat
  tips: Tip[]
  /** The list fell back to the base language — `MobTips` marks the section with it. */
  fallback: boolean
}
```

Add `tips: HighlightTip[]` to `DungeonHighlights`, documented:

```ts
  /** Every mob carrying tips, shortlisted or not, most dangerous first. */
  tips: HighlightTip[]
```

Import the `Tip` type at the top:

```ts
import type { Tip } from './tips'
```

- [ ] **Step 4: Fill it**

Update `EMPTY` (line 151):

```ts
const EMPTY: DungeonHighlights = { mobs: [], traps: [], bosses: [], tips: [] }
```

Declare the accumulator beside the others in `getHighlights`:

```ts
  const tips: HighlightTip[] = []
```

Inside the `for` loop, **before** the `if (enemy.isBoss)` branch — so bosses are included, since a boss is exactly the kind of mob a video explains:

```ts
    if (content?.tips?.length) {
      tips.push({
        npcId: enemy.id,
        mobName: name,
        threat: content.threat,
        tips: content.tips,
        fallback: content.fallback.tips,
      })
    }
```

Sort it beside the other sorts:

```ts
  tips.sort(
    (a, b) => rankOf(a.threat) - rankOf(b.threat) || a.mobName.localeCompare(b.mobName, locale),
  )
```

and add it to the returned object:

```ts
  const highlights: DungeonHighlights = {
    mobs,
    traps,
    bosses: orderBosses(bosses, bossOrder, getDungeonContent(slug, locale)?.bosses),
    tips,
  }
```

- [ ] **Step 5: Run the tests and watch them pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run --project app src/lib/highlights.test.ts && npm run typecheck
```

Expected: PASS, clean.

- [ ] **Step 6: Full suite, then commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
git add src/lib/highlights.ts src/lib/highlights.test.ts
git commit -m "$(cat <<'EOF'
Collect a dungeon's tips for the briefing

The mob table is a shortlist — no prio:1 spell clearing earnsARow, no row —
and the traps list exists to catch what it drops. Tips have the same
problem and get the same answer, except this list holds every mob with
tips rather than only the ones the table missed: a tip is worth reading
whatever its mob's threat, and bosses are exactly what a video explains.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: The Overview section

**Files:**
- Create: `src/components/highlights/TipList.tsx`, `src/components/highlights/TipList.test.tsx`
- Modify: `src/routes/HighlightsPage.tsx`, `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`
- Test: `src/routes/HighlightsPage.test.tsx`

**Interfaces:**
- Consumes: `HighlightTip` (task 5), `MobTips` and its `{ slug, npcId, tips, fallback }` props (task 2).

- [ ] **Step 1: Add the heading to both dictionaries**

`src/lib/i18n/en.ts`, after `'highlights.traps'`:

```ts
  'highlights.tips': 'TIPS',
```

`src/lib/i18n/fr.ts`, after `'highlights.traps'`:

```ts
  'highlights.tips': 'ASTUCES',
```

- [ ] **Step 2: Write the failing test**

Create `src/components/highlights/TipList.test.tsx`:

```tsx
// ABOUTME: TipList shows every mob with tips, linking to its card and mounting the real player.
// ABOUTME: The embed must stay unloaded until the reader clicks — that is the whole contract.

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TipList from './TipList'
import { getHighlights } from '../../lib/highlights'
import { renderEn } from '../../test/render'

afterEach(cleanup)

const tips = getHighlights('the-blinding-vale').tips

describe('TipList', () => {
  it('renders nothing when the dungeon has no tips', () => {
    const { container } = renderEn(<TipList slug="the-blinding-vale" tips={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('names each mob and links to its card', () => {
    renderEn(<TipList slug="the-blinding-vale" tips={tips} />)
    const link = screen.getByRole('link', { name: tips[0].mobName })
    expect(link.getAttribute('href')).toContain(`/d/the-blinding-vale/codex/mob/${tips[0].npcId}`)
  })

  it('loads no embed until the reader clicks', async () => {
    const { container } = renderEn(<TipList slug="the-blinding-vale" tips={tips} />)
    expect(container.querySelectorAll('iframe')).toHaveLength(0)
    await userEvent.click(screen.getAllByRole('button')[0])
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
  })
})
```

The third test assumes the first button on the page is a play button. If the dungeon's first tip is not a video, select the button by its label instead — read `getHighlights('the-blinding-vale').tips` and pick deliberately rather than by position.

- [ ] **Step 3: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run --project app src/components/highlights/TipList.test.tsx
```

Expected: FAIL — the module does not exist.

- [ ] **Step 4: Write the component**

Create `src/components/highlights/TipList.tsx`:

```tsx
// ABOUTME: The briefing's tips: every mob someone has written a tip for, linking to its card.
// ABOUTME: It mounts the card's own MobTips, so a video still loads only once the reader asks.

import { Link } from 'react-router-dom'
import type { HighlightTip } from '../../lib/highlights'
import { ThreatBadge } from '../codex/Badges'
import MobTips from '../codex/MobTips'

/**
 * Mounting `MobTips` rather than rendering the tips here is deliberate: the guarantee that
 * nothing reaches YouTube before a click lives inside that component, in its own state. A
 * second renderer would have to earn that guarantee again, and would be free to forget it.
 */
export default function TipList({ slug, tips }: { slug: string; tips: HighlightTip[] }) {
  if (!tips.length) return null

  return (
    <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
      {tips.map((entry) => (
        <div
          key={entry.npcId}
          data-tips={entry.npcId}
          className="rounded border border-ink-700 bg-ink-850"
        >
          <div className="flex items-center gap-2 px-3 pt-3">
            <Link
              to={`/d/${slug}/codex/mob/${entry.npcId}`}
              className="text-xs font-semibold text-ink-100 hover:text-gold-400"
            >
              {entry.mobName}
            </Link>
            <ThreatBadge threat={entry.threat} />
          </div>
          <MobTips
            slug={slug}
            npcId={entry.npcId}
            tips={entry.tips}
            fallback={entry.fallback}
          />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Mount it on the page**

In `src/routes/HighlightsPage.tsx`, import `TipList`, and add a section after the traps section and before the bosses section:

```tsx
          {highlights.tips.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 text-xs font-semibold tracking-[0.2em] text-gold-500">
                {t('highlights.tips')}
              </h2>
              <TipList slug={slug} tips={highlights.tips} />
            </section>
          )}
```

- [ ] **Step 6: Run the tests and watch them pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run --project app src/components/highlights/TipList.test.tsx src/routes/HighlightsPage.test.tsx && npm run typecheck
```

Expected: PASS, clean. `MobTips` renders its own `id` per mob and this page mounts one per mob, so the ids stay unique — if a test complains about duplicate ids, that is a real finding, report it.

- [ ] **Step 7: Full suite, then commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
git add src/components/highlights/TipList.tsx src/components/highlights/TipList.test.tsx src/routes/HighlightsPage.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit -m "$(cat <<'EOF'
Put a dungeon's tips on its briefing page

Somebody planning a run reads the briefing before they open a single card,
and until now the tips were reachable only by opening cards one at a time.

The section mounts the card's own MobTips rather than rendering the tips
itself. The rule that nothing reaches YouTube before a click lives in that
component; reusing it carries the rule along instead of asking a second
renderer to remember it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Proving it in a real browser

**Files:**
- Modify: `e2e/tips.spec.ts`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write the failing scenarios**

Append to `e2e/tips.spec.ts`, matching the file's existing style — it already defines `VIDEO_ID` and drives the built app on its deployed sub-path:

```ts
test('the map marks a mob that has tips', async ({ page }) => {
  await page.goto('./#/d/the-blinding-vale/route')
  // Blips are addressed by clone id (enemyIndex:cloneIndex), never by npc id — Sporeblight
  // Belcher is enemy index 4, so its clones are the `5:` group.
  const blip = page.locator('[data-clone^="5:"]').first()
  await expect(blip).toBeVisible()
  await expect(blip.getByText('?')).toBeVisible()
})

test('the briefing page loads no embed until asked', async ({ page }) => {
  const thirdParty: string[] = []
  page.on('request', (r) => {
    if (/youtube|ytimg|googlevideo/.test(new URL(r.url()).hostname)) thirdParty.push(r.url())
  })

  await page.goto('./#/d/the-blinding-vale')
  const card = page.locator(`[data-tips="254850"]`)
  await expect(card).toBeVisible()
  expect(thirdParty).toEqual([])
  await expect(card.locator('iframe')).toHaveCount(0)

  await card.getByRole('button').first().click()
  await expect(card.locator('iframe')).toHaveAttribute(
    'src',
    new RegExp(`youtube-nocookie\\.com/embed/${VIDEO_ID}`),
  )
})
```

**Playwright matches an accessible name as a case-insensitive substring by default.** This has bitten this repo before. If either locator matches more than one element and fails strict mode, add `exact: true` rather than loosening the selector.

- [ ] **Step 2: Watch them fail for the right reason**

Before running against the real build, break each assertion deliberately — assert `'!'` instead of `'?'`, and assert a video id that is not on the card — and confirm the failures are about the assertion, not about a locator that never resolved or a page that never loaded. Then restore.

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run test:e2e
```

This builds the app and starts two servers; give it a generous timeout rather than assuming it hung.

- [ ] **Step 3: Run the whole e2e suite**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run test:e2e
```

Expected: every scenario passes, the new two included.

- [ ] **Step 4: Full suite, typecheck, then commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run typecheck && npm test
git add e2e/tips.spec.ts
git commit -m "$(cat <<'EOF'
Prove the new surfaces in a real browser

The map badge is drawn into SVG and the briefing mounts a second copy of
the player, which is exactly the kind of thing jsdom approximates rather
than executes. The briefing scenario asserts the claim itself — zero
requests to any YouTube host before the click — rather than the proxy of
counting iframes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Tell CLAUDE.md what changed

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the e2e coverage row**

`CLAUDE.md`'s end-to-end table row enumerates the Playwright scenarios. Add the two from task 7: the map's tips badge, and the briefing page's embed making no third-party request before the click.

- [ ] **Step 2: Nothing else**

Do not reorganise the file, do not add observations about test-suite noise, and do not restate what the design document already says. This step exists so the table does not go stale again — it was already two specs behind once.

- [ ] **Step 3: Commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
Record the two scenarios the e2e suite gained

The table listing what end-to-end actually covers was two specs behind
once already. Two more landed; this keeps the map honest.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

**Spec coverage.** Decision 1 → task 1. Decision 2 → tasks 2 and 3. Decision 3 → task 3 step 5, and its dedicated compact test in step 2. Decision 4 → task 4. Decision 5 → task 4 (one glyph, one legend row, no per-kind branch anywhere). Decision 6 → tasks 5 and 6. Decision 7 → task 6 step 4, where `TipList` mounts `MobTips` rather than rendering tips itself, and task 7's request-collector scenario, which is what proves the guarantee survived the reuse.

**Type consistency.** `MobIndicators.hasTips` is defined in task 1 and read in tasks 3 and 4. `tipsSectionId(npcId: number): string` is exported in task 2 and imported in task 3. `MobTips`'s props become `{ slug, npcId, tips, fallback }` in task 2 and are passed with exactly those four names in task 2 step 4 and task 6 step 4. `HighlightTip` is defined in task 5 and consumed in task 6 with the same five fields. `DungeonHighlights.tips` is added to both the interface and `EMPTY` in task 5, so the type and its empty value cannot drift.

**Known soft spots, named rather than hidden.**

- Task 3's tests reuse constants `MobCard.test.tsx` already defines; the implementer must read that file rather than pasting new enemy literals. This exact trap was called out in the tips plan and was still worth repeating.
- Task 4's badge may break existing tests that count badges on a blip. The step says to read the assertion before changing it, because a lowered count is how a regression gets buried — a fault this repository has already had a review catch once.
- Task 5's fourth test asserts something about the *content*, not the code: that some mob outside the shortlist carries tips. It may not hold. The step tells the implementer to prove the mechanism instead, and to report which they did.
- Task 6's third test picks "the first button", which is only the play button if the dungeon's first tip is a video. The step says to choose deliberately instead.
- Task 2 makes `npcId` a required prop, which breaks every existing `MobTips` construction in the test suite. That is intended: an optional prop would let a caller render a section nothing can jump to, silently.
