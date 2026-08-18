# Hover intelligence — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan task by task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** hovering a mob in the Route tab shows what it contributes to the dungeon's forces, how
efficiently it contributes it, and its codex entry — in a column beside the map.

**Architecture:** one pure module computes the numbers, one small component displays them, and it
is mounted in two places: a new left-hand column (Route tab only) and the existing map tooltip
(both tabs). The column mounts the same `MobCard` the Codex tab already uses. The map starts
reporting its hovered mob and a right-click upward; the page owns the hovered and frozen state.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind 4, Vitest (projects `app` node + jsdom),
Testing Library.

**Spec:** [`docs/plans/2026-08-18-mdt-hover-intelligence-design.md`](2026-08-18-mdt-hover-intelligence-design.md).
Read it before Task 1 — it argues every choice below, including the ones that cost something.

## Read this before trusting any code in this plan

**The code in this plan has never run.** On the slice A branch, four defects came from code
written into a plan document and taken as verified: a string rendered twice, a wrapper element a
test helper mistook for a mob blip, a `transform` on one element with the test id on another, and
a layer copied from `PeerCursors` **without its `pointer-events-none`**, which made the whole map
unclickable in Route mode and was caught only by a reviewer opening a real browser.

Treat every snippet here as a draft you are expected to correct. When you correct one, say so
plainly in your report and say why. Correcting the plan is the expected outcome, not a failure.

## Global Constraints

- **Everything committed is in English** — code, comments, tests, commit messages. The UI and
  `content/**.md` are the only translated surfaces.
- **Commit style:** imperative mood, no `feat:`/`fix:` prefix. The subject says what the commit
  does to the repository; the body says **why**, never what.
- **Never** `--no-verify`, `--no-hooks`, `--no-pre-commit-hook`.
- **Never** `git add -A` or `git commit -a` — another session commits to this repository
  concurrently. Run `git status` first and stage only named paths.
- **`npm test` must be green with no skips before every commit**, and `npm run typecheck` clean.
- Component test files carry `// @vitest-environment jsdom` at the top and declare their own
  `afterEach(cleanup)` — Testing Library runs without `globals: true`, so without it renders pile
  up and `screen` queries start matching several elements.
- Mount components through `src/test/render.tsx` (`renderEn` / `renderFr`), never Testing
  Library's bare `render`: components need a `LocaleProvider`.
- Every new UI string goes into **both** `src/lib/i18n/en.ts` and `src/lib/i18n/fr.ts`.
- **`routeToLua` is not touched.** Nothing in this slice writes to a route or a preset.

## Commands on this machine

`node` and `npm` may not be on the Bash tool's PATH. Check with `node --version`; if it fails:

```
export PATH="/c/Program Files/nodejs:$PATH"
```

`rm` is denied by the permission layer — delete with `node -e "require('fs').unlinkSync('…')"`.

## File map

| File | Responsibility | Task |
| --- | --- | --- |
| `src/lib/contribution.ts` | **new** — what a mob contributes, and MDT's colour for it. Pure. | 1 |
| `src/lib/contribution.test.ts` | **new** — anchored on values the game itself prints. | 1 |
| `src/components/codex/MobStats.tsx` | **new** — the forces / share / score block. | 2 |
| `src/components/codex/MobStats.test.tsx` | **new** | 2 |
| `src/lib/i18n/en.ts`, `fr.ts` | the share and score labels (Task 2), the column's empty state and pin label (Task 4) | 2, 4 |
| `src/components/map/DungeonMap.tsx` | mounts `MobStats` in `CloneTooltip`; reports hover and right-click upward; gains `suppressCloneTooltip` | 2, 3, 5 |
| `src/components/map/DungeonMap.test.tsx` | the two new props | 3 |
| `src/components/route/MobPanel.tsx` | **new** — the left column | 4 |
| `src/components/route/MobPanel.test.tsx` | **new** | 4 |
| `src/routes/DungeonPage.tsx` | owns hovered/frozen state, mounts the column, gates the tooltip | 5 |
| `src/routes/DungeonPage.test.tsx` | the whole behaviour, end to end in jsdom | 5 |

---

## Task 1: What a mob contributes

**Files:**
- Create: `src/lib/contribution.ts`
- Create: `src/lib/contribution.test.ts`

**Interfaces:**
- Consumes: `Enemy` and `Dungeon` from `src/lib/types.ts`; `getLookup` from `src/lib/data.ts`
  (tests only).
- Produces:
  ```ts
  export interface Contribution {
    /** Forces one unit of this mob gives. */
    count: number
    /** Those forces as a percentage of the dungeon's requirement, 0–100. */
    share: number
    /** MDT's efficiency score, or null when it would say nothing. */
    score: number | null
  }
  export function contribution(enemy: Enemy, dungeon: Dungeon): Contribution
  export function scoreColor(score: number): string
  ```

**Why `share` is 0–100 and not 0–1:** `formatPercent(locale, value, digits)` in
`src/lib/i18n/format.ts` divides by 100 itself — its doc comment says "`value` is a percentage,
0–100, the way the route stats compute it". Matching `routeStats` keeps one convention.

- [ ] **Step 1: Write the failing test**

Create `src/lib/contribution.test.ts`:

```ts
// ABOUTME: Tests what a mob contributes to a dungeon's forces, and MDT's colour for its score.
// ABOUTME: Anchored on two mobs whose numbers the game itself prints, not on our own output.

import { describe, expect, it } from 'vitest'
import { getLookup } from './data'
import { contribution, scoreColor } from './contribution'
import type { Enemy } from './types'

const lookup = getLookup('murder-row')!
const { dungeon } = lookup
const byName = (name: string): Enemy => {
  const enemy = dungeon.enemies.find((e) => e.name === name)
  if (!enemy) throw new Error(`no mob named ${name} in ${dungeon.slug}`)
  return enemy
}

describe('contribution — against what MDT prints', () => {
  /**
   * Murder Row requires 690 forces. MDT's own tooltip for Bribed Captain reads
   * "Forces: 35 (5.07%)" and "Efficiency score: 4.2". These assertions exist to fail if the
   * extraction stops carrying the field the formula divides by, or if MDT changes the formula.
   */
  it('reproduces the share and the score MDT shows for Bribed Captain', () => {
    const c = contribution(byName('Bribed Captain'), dungeon)
    expect(c.count).toBe(35)
    expect(c.share.toFixed(2)).toBe('5.07')
    expect(c.score!.toFixed(1)).toBe('4.2')
  })

  it('separates two mobs of equal forces by their health', () => {
    const captain = contribution(byName('Bribed Captain'), dungeon)
    const golem = contribution(byName('Defiled Golem'), dungeon)
    expect(golem.count).toBe(captain.count)
    expect(golem.share).toBeCloseTo(captain.share, 9)
    // The golem has more health for the same forces, so it is the worse pull.
    expect(golem.score!.toFixed(1)).toBe('3.9')
    expect(golem.score!).toBeLessThan(captain.score!)
  })
})

describe('contribution — when a score would say nothing', () => {
  const dummy = (over: Partial<Enemy>): Enemy =>
    ({ name: 'x', id: 1, mdtIdx: 1, count: 10, health: 1_000_000, level: 80, scale: 1, cc: [], spells: [], clones: [], ...over }) as Enemy

  it('gives no score to a mob that grants no forces', () => {
    const c = contribution(dummy({ count: 0 }), dungeon)
    expect(c.count).toBe(0)
    expect(c.share).toBe(0)
    expect(c.score).toBeNull()
  })

  it('gives no score rather than an Infinity when health is missing', () => {
    const c = contribution(dummy({ health: 0 }), dungeon)
    expect(c.score).toBeNull()
    expect(c.share).toBeGreaterThan(0)
  })

  it('finds every zero-force mob the dungeon actually holds', () => {
    // Half of Murder Row gives nothing. This is the common case, not an edge case.
    const none = dungeon.enemies.filter((e) => contribution(e, dungeon).score === null)
    expect(none.length).toBeGreaterThan(10)
  })
})

describe('scoreColor — MDT’s ramp, whose channels do not saturate together', () => {
  it('is red at zero', () => {
    expect(scoreColor(0)).toBe('#ff0000')
  })

  it('is yellow at five, where green saturates but red has not yet vanished', () => {
    expect(scoreColor(5)).toBe('#ffff00')
  })

  it('is green at ten, and stays green above it', () => {
    expect(scoreColor(10)).toBe('#00ff00')
    expect(scoreColor(40)).toBe('#00ff00')
  })

  it('never emits a channel outside a byte', () => {
    for (const s of [-5, 0, 1, 4.9, 7.5, 10, 100]) {
      expect(scoreColor(s)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run --project app src/lib/contribution.test.ts
```

Expected: every test fails — `Failed to resolve import "./contribution"`.

- [ ] **Step 3: Write the module**

Create `src/lib/contribution.ts`:

```ts
// ABOUTME: What one unit of a mob contributes to a dungeon's forces, and MDT's efficiency score.
// ABOUTME: Pure: the formula and its colour ramp are MDT's, transcribed from the addon source.

import type { Dungeon, Enemy } from './types'

export interface Contribution {
  /** Forces one unit of this mob gives. */
  count: number
  /** Those forces as a percentage of the dungeon's requirement, 0–100. */
  share: number
  /**
   * MDT's efficiency score — forces per point of health — or `null` when it would say nothing.
   *
   * Null rather than zero for a mob that grants no forces: the score measures a ratio the mob
   * has no numerator for, and half of some dungeons are in that case. Null rather than
   * `Infinity` when health is absent, so a broken extraction shows a gap instead of a number.
   */
  score: number | null
}

/**
 * `Modules/DungeonEnemies.lua:515`, transcribed:
 *
 *     local score = 2.5 * (count / totalCount) * 13000 / (health / 20000)
 *
 * `health` is the creature's base health, which is what `Enemy.health` carries — not a value
 * scaled to a key level.
 */
export function contribution(enemy: Enemy, dungeon: Dungeon): Contribution {
  const required = dungeon.totalCount || 1
  const share = (enemy.count / required) * 100
  const scorable = enemy.count > 0 && enemy.health > 0
  return {
    count: enemy.count,
    share,
    score: scorable ? (2.5 * (enemy.count / required) * 13000) / (enemy.health / 20000) : null,
  }
}

const channel = (v: number): string =>
  Math.round(Math.max(0, Math.min(1, v)) * 255)
    .toString(16)
    .padStart(2, '0')

/**
 * MDT's own ramp: `RGBToHex(max(0, min(1, 2 * (1 - v))), min(1, 2 * v), 0)` with `v = score / 10`.
 *
 * The two channels do not saturate at the same score. Green is full at 5 while red is still
 * full, so the middle of the ramp is yellow; red only reaches zero at 10. It is not a straight
 * red-to-green fade, however much it reads like one.
 */
export function scoreColor(score: number): string {
  const v = score / 10
  return `#${channel(2 * (1 - v))}${channel(2 * v)}00`
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
npx vitest run --project app src/lib/contribution.test.ts
```

Expected: PASS, all of them. If `'5.07'` or `'4.2'` disagrees, **do not adjust the expectation** —
those two numbers are what the game printed. Print the computed value, work out why it differs,
and report it.

- [ ] **Step 5: Commit**

```bash
git status --short
git add src/lib/contribution.ts src/lib/contribution.test.ts
git commit
```

Subject: `Compute what a mob contributes, the way MDT does`. In the body, say why the test
asserts two specific mobs: the numbers come from the game's own tooltip, so the test fails if we
drift from MDT rather than merely from ourselves.

---

## Task 2: The statistics block, mounted in the map tooltip

**Files:**
- Create: `src/components/codex/MobStats.tsx`
- Create: `src/components/codex/MobStats.test.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`
- Modify: `src/components/map/DungeonMap.tsx` (inside `CloneTooltip`, around line 584)

**Interfaces:**
- Consumes: `contribution`, `scoreColor` from Task 1.
- Produces:
  ```tsx
  export default function MobStats(props: { enemy: Enemy; dungeon: Dungeon }): ReactElement
  ```

This is the block the Codex tab gains for free: `CloneTooltip` is mounted in both tabs.

- [ ] **Step 1: Add the two strings**

In `src/lib/i18n/en.ts`, beside the other `map.*` entries (around line 104):

```ts
  'map.share': 'of the dungeon',
  'map.score': 'efficiency',
```

In `src/lib/i18n/fr.ts`, at the matching position:

```ts
  'map.share': 'du donjon',
  'map.score': 'efficacité',
```

- [ ] **Step 2: Write the failing test**

Create `src/components/codex/MobStats.test.tsx`:

```tsx
// ABOUTME: Tests the forces / share / score block shared by the map tooltip and the mob panel.
// ABOUTME: Reads the real dungeon pool: the numbers under test are the committed ones.

// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { getLookup } from '../../lib/data'
import { scoreColor } from '../../lib/contribution'
import { renderEn, renderFr } from '../../test/render'
import MobStats from './MobStats'
import type { Enemy } from '../../lib/types'

afterEach(cleanup)

const { dungeon } = getLookup('murder-row')!
const byName = (name: string): Enemy => dungeon.enemies.find((e) => e.name === name)!

describe('MobStats', () => {
  it('shows the forces, the share and the score the game shows', () => {
    renderEn(<MobStats enemy={byName('Bribed Captain')} dungeon={dungeon} />)
    expect(screen.getByText('35 forces')).toBeDefined()
    expect(screen.getByText('5.07%')).toBeDefined()
    expect(screen.getByTestId('mob-score').textContent).toBe('4.2')
  })

  it('paints the score in MDT’s colour for it', () => {
    renderEn(<MobStats enemy={byName('Bribed Captain')} dungeon={dungeon} />)
    const score = screen.getByTestId('mob-score')
    // Not a literal: the colour is Task 1's business, and duplicating it here would let the
    // two drift apart while both stayed green.
    expect(score.style.color).toBe(scoreColor(4.235930681818182))
  })

  it('says a mob gives nothing rather than printing a zero score', () => {
    const free = dungeon.enemies.find((e) => e.count === 0)!
    renderEn(<MobStats enemy={free} dungeon={dungeon} />)
    expect(screen.getByText('no forces')).toBeDefined()
    expect(screen.queryByTestId('mob-score')).toBeNull()
  })

  it('formats the share in the reader’s language', () => {
    renderFr(<MobStats enemy={byName('Bribed Captain')} dungeon={dungeon} />)
    // fr-FR uses a comma and a narrow no-break space before the sign.
    expect(screen.getByTestId('mob-share').textContent).toContain(',')
  })
})
```

**Note on the colour assertion:** `4.235930681818182` is the unrounded score. If it does not
match, print `contribution(byName('Bribed Captain'), dungeon).score` and use the printed value —
the point of the assertion is that `MobStats` calls `scoreColor` with the real score, not the
rounded one.

- [ ] **Step 3: Run it and watch it fail**

```bash
npx vitest run --project app src/components/codex/MobStats.test.tsx
```

Expected: FAIL — `Failed to resolve import "./MobStats"`.

- [ ] **Step 4: Write the component**

Create `src/components/codex/MobStats.tsx`:

```tsx
// ABOUTME: A mob's forces, its share of the dungeon's requirement, and MDT's efficiency score.
// ABOUTME: Mounted both in the map tooltip and in the route's mob panel, so they cannot diverge.

import { contribution, scoreColor } from '../../lib/contribution'
import { useI18n } from '../../lib/i18n/context'
import type { Dungeon, Enemy } from '../../lib/types'

export default function MobStats({ enemy, dungeon }: { enemy: Enemy; dungeon: Dungeon }) {
  const { t, plural, percent } = useI18n()
  const { count, share, score } = contribution(enemy, dungeon)

  if (count === 0) return <div className="text-xs text-ink-400">{t('common.noForce')}</div>

  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="font-semibold text-ink-100 tabular-nums">{plural('common.forces', count)}</span>
      <span data-testid="mob-share" className="text-ink-400 tabular-nums">
        {percent(share, 2)} {t('map.share')}
      </span>
      {score != null && (
        <span className="ml-auto text-ink-400">
          {t('map.score')}{' '}
          <span
            data-testid="mob-score"
            className="font-semibold tabular-nums"
            style={{ color: scoreColor(score) }}
          >
            {score.toFixed(1)}
          </span>
        </span>
      )}
    </div>
  )
}
```

**`percent` may not exist on the i18n context.** `formatPercent` lives in
`src/lib/i18n/format.ts` and takes `(locale, value, digits)`. Check what `useI18n()` actually
exposes — `RoutePanel.tsx` calls `formatPercent(...)` and `DungeonMap.tsx` destructures
`{ t, plural, locale }`. Use whichever of the two this codebase already uses in components, and
say in your report which one you found. Do not add a helper to the context for this.

- [ ] **Step 5: Run it and watch it pass**

```bash
npx vitest run --project app src/components/codex/MobStats.test.tsx
```

- [ ] **Step 6: Mount it in the map tooltip**

In `src/components/map/DungeonMap.tsx`, inside `CloneTooltip`, replace the forces line — today:

```tsx
      <div className="mt-0.5 text-xs text-ink-400">
        {enemy.count > 0 ? plural('common.forces', enemy.count) : t('common.noForce')}
        {pack && ` · ${t('map.pack', { g: pack.g, n: pack.count })}`}
        {clone.patrol?.length ? ` · ${t('map.patrol')}` : ''}
      </div>
```

with:

```tsx
      <MobStats enemy={enemy} dungeon={lookup.dungeon} />
      <div className="mt-0.5 text-xs text-ink-400">
        {pack && t('map.pack', { g: pack.g, n: pack.count })}
        {clone.patrol?.length ? ` · ${t('map.patrol')}` : ''}
      </div>
```

Add the import at the top of the file:

```tsx
import MobStats from '../codex/MobStats'
```

`plural` may become unused in `CloneTooltip` — remove it from that destructure if so, and only
if so. Do not touch other uses of it in the file.

- [ ] **Step 7: Run the whole suite**

```bash
npm test
npm run typecheck
```

`DungeonMap.test.tsx` may assert on the old tooltip text. If it fails, read what it was pinning:
if it pinned the forces count, point it at `MobStats`'s output instead of deleting it.

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/components/codex/MobStats.tsx src/components/codex/MobStats.test.tsx \
        src/lib/i18n/en.ts src/lib/i18n/fr.ts src/components/map/DungeonMap.tsx
git commit
```

Subject: `Show what a hovered mob is worth, not just its raw forces`.

---

## Task 3: The map reports its hovered mob, and a right-click

**Files:**
- Modify: `src/components/map/DungeonMap.tsx`
- Modify: `src/components/map/DungeonMap.test.tsx`

**Interfaces:**
- Produces, added to `DungeonMap`'s `Props`:
  ```ts
  /** The mob under the cursor, or null when it leaves. Fires on every blip enter and leave. */
  onHoverClone?: (ref: CloneRef | null) => void
  /** Right-click on a mob. The map neither freezes nor knows what freezing means. */
  onCloneContextMenu?: (ref: CloneRef) => void
  ```

`hoverClone` is local state in `DungeonMap` today and never reaches the page — `DungeonPage`'s
`hoveredNpc` comes only from `CodexPanel`'s `onHoverMob`. That is the gap this task closes.

- [ ] **Step 1: Write the failing tests**

Add to `src/components/map/DungeonMap.test.tsx`. Use that file's own mount idiom and its
`blips()` helper (which filters on `[data-clone]`) rather than a second way of finding a blip:

```tsx
describe('Reporting the hovered mob', () => {
  it('names the mob the cursor entered, and null when it leaves', () => {
    const seen: (CloneRef | null)[] = []
    const { container } = renderEn(
      <DungeonMap slug="altar-of-fangs" lookup={getLookup('altar-of-fangs')!} onHoverClone={(r) => seen.push(r)} />,
    )
    const blip = blips(container)[0]
    fireEvent.mouseEnter(blip)
    fireEvent.mouseLeave(blip)
    expect(seen).toHaveLength(2)
    expect(seen[0]).toMatchObject({ enemyIdx: expect.any(Number), cloneIdx: expect.any(Number) })
    expect(seen[1]).toBeNull()
  })

  it('reports a right-click on a mob without treating it as a click', () => {
    const menued: CloneRef[] = []
    const clicked: CloneRef[] = []
    const { container } = renderEn(
      <DungeonMap
        slug="altar-of-fangs"
        lookup={getLookup('altar-of-fangs')!}
        onCloneClick={(r) => clicked.push(r)}
        onCloneContextMenu={(r) => menued.push(r)}
      />,
    )
    fireEvent.contextMenu(blips(container)[0])
    expect(menued).toHaveLength(1)
    expect(clicked).toEqual([])
  })

  it('suppresses the browser menu on a mob, and only on a mob', () => {
    const { container } = renderEn(
      <DungeonMap slug="altar-of-fangs" lookup={getLookup('altar-of-fangs')!} onCloneContextMenu={() => {}} />,
    )
    const onBlip = fireEvent.contextMenu(blips(container)[0])
    // fireEvent returns false when a handler called preventDefault.
    expect(onBlip).toBe(false)
    const onMap = fireEvent.contextMenu(container.querySelector('svg')!)
    expect(onMap).toBe(true)
  })
})
```

Import `CloneRef` in the test file if it is not already imported — check the existing imports
before adding a duplicate.

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run --project app src/components/map/DungeonMap.test.tsx
```

Expected: the three new ones fail; the existing ones still pass.

- [ ] **Step 3: Add the props and thread them through**

In `DungeonMap`'s `Props` interface (around line 41), add the two entries from **Interfaces**
above, and add `onHoverClone` and `onCloneContextMenu` to the destructured parameter list.

In the blip loop (around line 271), extend the two existing handlers rather than replacing them,
and add a third:

```tsx
                  onEnter={() => {
                    setHoverClone(key)
                    setHoverPack(clone.g)
                    onHoverClone?.({ enemyIdx: enemy.mdtIdx, cloneIdx: clone.mdtIdx })
                  }}
                  onLeave={() => {
                    setHoverClone(null)
                    setHoverPack(null)
                    onHoverClone?.(null)
                  }}
                  onContextMenu={(e) => {
                    // Only on a blip: the rest of the map keeps the browser's own menu.
                    e.preventDefault()
                    onCloneContextMenu?.({ enemyIdx: enemy.mdtIdx, cloneIdx: clone.mdtIdx })
                  }}
```

In `BlipProps` (the interface above `function Blip`), add:

```ts
  onContextMenu?: (e: React.MouseEvent) => void
```

and in `Blip`'s destructured parameters add `onContextMenu`, then put it on the same `<g>` that
already carries `onClick`. Read that element before editing: `onClick`'s exact position tells
you which element is the hit target.

- [ ] **Step 4: Run them and watch them pass**

```bash
npx vitest run --project app src/components/map/DungeonMap.test.tsx
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git status --short
git add src/components/map/DungeonMap.tsx src/components/map/DungeonMap.test.tsx
git commit
```

Subject: `Let the page hear which mob the cursor is on`. Body: the map kept its hovered mob to
itself, so nothing outside it could react; and a right-click has to reach the page because
freezing a panel is not the map's business.

---

## Task 4: The mob panel

**Files:**
- Create: `src/components/route/MobPanel.tsx`
- Create: `src/components/route/MobPanel.test.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`

**Interfaces:**
- Consumes: `MobStats` (Task 2), `MobCard` from `src/components/codex/MobCard`.
- Produces:
  ```tsx
  export default function MobPanel(props: {
    slug: string
    dungeon: Dungeon
    /** The mob to show, or null for the empty state. */
    enemy: Enemy | null
    /** True when the panel is holding this mob against the hover. */
    frozen: boolean
    /** Called when the pin in the header is clicked. Only rendered when frozen. */
    onUnfreeze: () => void
  }): ReactElement
  ```

The panel owns no state. `DungeonPage` decides which mob it shows and whether it is frozen —
`RoutePanel` is built the same way, and its tests pass a recorder in place of the actions.

- [ ] **Step 1: Add the two strings**

`src/lib/i18n/en.ts`, beside the other `route.*` entries:

```ts
  'route.hoverAMob': 'Hover a mob on the map to read its entry. Right-click to keep it here.',
  'route.unpin': 'Stop holding this mob',
```

`src/lib/i18n/fr.ts`:

```ts
  'route.hoverAMob': 'Survole un mob sur la carte pour lire sa fiche. Clic droit pour la garder ici.',
  'route.unpin': 'Ne plus retenir ce mob',
```

- [ ] **Step 2: Write the failing test**

Create `src/components/route/MobPanel.test.tsx`:

```tsx
// ABOUTME: Tests the route tab's left column: empty state, statistics, codex entry, pin.
// ABOUTME: The panel owns no state — the page decides what it shows and whether it is held.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getLookup } from '../../lib/data'
import { renderEn } from '../../test/render'
import MobPanel from './MobPanel'
import type { Enemy } from '../../lib/types'

afterEach(cleanup)

// `MobCard` scrolls its own card into view; jsdom implements neither of these.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

const { dungeon } = getLookup('murder-row')!
const byName = (name: string): Enemy => dungeon.enemies.find((e) => e.name === name)!

const mount = (over: Partial<React.ComponentProps<typeof MobPanel>> = {}) =>
  renderEn(
    <MobPanel
      slug="murder-row"
      dungeon={dungeon}
      enemy={byName('Bribed Captain')}
      frozen={false}
      onUnfreeze={() => {}}
      {...over}
    />,
  )

describe('MobPanel', () => {
  it('tells you what to do when nothing is hovered yet', () => {
    mount({ enemy: null })
    expect(screen.getByText(/Hover a mob on the map/)).toBeDefined()
  })

  it('names the mob and shows what it is worth', () => {
    mount()
    expect(screen.getByText('Bribed Captain')).toBeDefined()
    expect(screen.getByTestId('mob-score').textContent).toBe('4.2')
  })

  it('shows the same codex entry the codex tab shows', () => {
    const { container } = mount()
    // MobCard renders the mob's portrait; its absence means the card is not mounted.
    expect(container.querySelector('img')).toBeTruthy()
  })

  it('offers no pin while it is following the hover', () => {
    mount()
    expect(screen.queryByRole('button', { name: 'Stop holding this mob' })).toBeNull()
  })

  it('offers a pin once it is holding a mob, and reports the click', () => {
    let released = 0
    mount({ frozen: true, onUnfreeze: () => (released += 1) })
    fireEvent.click(screen.getByRole('button', { name: 'Stop holding this mob' }))
    expect(released).toBe(1)
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

```bash
npx vitest run --project app src/components/route/MobPanel.test.tsx
```

- [ ] **Step 4: Write the component**

Create `src/components/route/MobPanel.tsx`:

```tsx
// ABOUTME: The route tab's left column: what the hovered mob is worth, and its codex entry.
// ABOUTME: Stateless — the page decides which mob it shows and whether it is held against hover.

import MobCard from '../codex/MobCard'
import MobStats from '../codex/MobStats'
import { useI18n } from '../../lib/i18n/context'
import type { Dungeon, Enemy } from '../../lib/types'

export default function MobPanel({
  slug,
  dungeon,
  enemy,
  frozen,
  onUnfreeze,
}: {
  slug: string
  dungeon: Dungeon
  enemy: Enemy | null
  frozen: boolean
  onUnfreeze: () => void
}) {
  const { t } = useI18n()

  if (!enemy) {
    return (
      <p className="rounded border border-ink-700 bg-ink-850 px-3 py-2 text-xs text-ink-400">
        {t('route.hoverAMob')}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate font-semibold text-ink-100">{enemy.name}</h2>
        {enemy.isBoss && <span className="shrink-0 text-xs text-gold-400">{t('map.boss')}</span>}
        {frozen && (
          <button
            onClick={onUnfreeze}
            title={t('route.unpin')}
            aria-label={t('route.unpin')}
            className="shrink-0 rounded px-1 text-gold-400 hover:text-gold-300"
          >
            📌
          </button>
        )}
      </div>
      <MobStats enemy={enemy} dungeon={dungeon} />
      <MobCard slug={slug} enemy={enemy} />
    </div>
  )
}
```

**Check `MobCard`'s required props before trusting this.** Task 4's snippet passes only `slug`
and `enemy`; `MobCard`'s `Props` also declares `compact`, `pullIndex`, `pullColor`, `onHover`,
`onSelect`, all optional at the time of writing. If any is required, pass it and say so.

`aria-label` is what `getByRole('button', { name: … })` matches; `title` is what a person sees
on hover. Both are needed, and they must say the same thing.

- [ ] **Step 5: Run it and watch it pass**

```bash
npx vitest run --project app src/components/route/MobPanel.test.tsx
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git status --short
git add src/components/route/MobPanel.tsx src/components/route/MobPanel.test.tsx \
        src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit
```

Subject: `Give the route tab a panel for the mob under the cursor`.

---

## Task 5: Wire it into the page

**Files:**
- Modify: `src/routes/DungeonPage.tsx`
- Modify: `src/routes/DungeonPage.test.tsx`
- Modify: `src/components/map/DungeonMap.tsx` (Step 5 adds one prop and one `data-testid`)

**Interfaces:**
- Consumes: everything from Tasks 2–4.
- Produces, added to `DungeonMap`'s `Props` in Step 5:
  ```ts
  /** Hide the hover tooltip: something else on the page is already showing the hovered mob. */
  suppressCloneTooltip?: boolean
  ```

**The behaviour to build**, from the spec's decision 7:

| State | Left column | Map tooltip |
| --- | --- | --- |
| Nothing frozen | follows the hover; keeps the last mob when the cursor leaves the map | hidden |
| Frozen on A, hovering B | stays on A | shows **B** |
| Right-click B | moves to B | hidden |
| Pin clicked | back to following | hidden |

- [ ] **Step 1: Write the failing tests**

Add to `src/routes/DungeonPage.test.tsx`, using that file's own `at()` mount helper and its
`getByRole('button', { name: 'Route' })` idiom. **Note:** Playwright-style `exact` does not apply
here, but Testing Library's `name` is also a substring match by default — if `'Route'` matches
more than one button, add `{ exact: true }`, exactly as the e2e suite had to.

```tsx
describe('The mob panel', () => {
  const hoverFirstBlip = (container: HTMLElement) => {
    const blip = container.querySelectorAll('[data-clone]')[0]
    fireEvent.mouseEnter(blip)
    return blip
  }

  it('is absent from the codex tab, where the right-hand panel already shows entries', () => {
    const { container } = renderEn(at('/d/murder-row'))
    expect(container.querySelector('[data-testid="mob-panel"]')).toBeNull()
  })

  it('appears in the route tab, asking to be given a mob', () => {
    renderEn(at('/d/murder-row'))
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    expect(screen.getByText(/Hover a mob on the map/)).toBeDefined()
  })

  it('fills with the hovered mob, and keeps it once the cursor leaves', () => {
    const { container } = renderEn(at('/d/murder-row'))
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    const blip = hoverFirstBlip(container)
    const panel = screen.getByTestId('mob-panel')
    const named = panel.textContent
    fireEvent.mouseLeave(blip)
    // The entry would clear at the exact moment you moved the mouse toward it.
    expect(screen.getByTestId('mob-panel').textContent).toBe(named)
  })

  it('holds a right-clicked mob while another is hovered, and shows the other in the tooltip', () => {
    const { container } = renderEn(at('/d/murder-row'))
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    const blips = container.querySelectorAll('[data-clone]')
    fireEvent.contextMenu(blips[0])
    const held = screen.getByTestId('mob-panel').textContent
    fireEvent.mouseEnter(blips[1])
    expect(screen.getByTestId('mob-panel').textContent).toBe(held)
    expect(screen.getByTestId('clone-tooltip')).toBeDefined()
  })

  it('shows no tooltip while nothing is held, since the panel already speaks', () => {
    const { container } = renderEn(at('/d/murder-row'))
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    hoverFirstBlip(container)
    expect(screen.queryByTestId('clone-tooltip')).toBeNull()
  })

  it('goes back to following the hover once the pin is clicked', () => {
    const { container } = renderEn(at('/d/murder-row'))
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    const blips = container.querySelectorAll('[data-clone]')
    fireEvent.contextMenu(blips[0])
    fireEvent.click(screen.getByRole('button', { name: 'Stop holding this mob' }))
    fireEvent.mouseEnter(blips[1])
    expect(screen.queryByRole('button', { name: 'Stop holding this mob' })).toBeNull()
  })

  it('does not add the right-clicked mob to the current pull', () => {
    const { container } = renderEn(at('/d/murder-row'))
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    const before = screen.getByText(/Forces/).parentElement!.textContent
    fireEvent.contextMenu(container.querySelectorAll('[data-clone]')[0])
    expect(screen.getByText(/Forces/).parentElement!.textContent).toBe(before)
  })
})
```

The last test's way of reading the forces total is a guess at the markup. Read `RoutePanel`'s
forces section (it carries `data-standing` on the bar) and pin the number in whatever way that
markup actually allows. Say in your report how you did it.

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run --project app src/routes/DungeonPage.test.tsx
```

- [ ] **Step 3: Add the state and the handlers**

In `DungeonView` (`src/routes/DungeonPage.tsx`), beside the other `useState` calls (around line
69):

```tsx
  /** The mob the column shows. Kept when the cursor leaves the map, so the entry stays readable. */
  const [panelNpc, setPanelNpc] = useState<number | null>(null)
  /** Set by a right-click: the column stops following the hover until it is released. */
  const [frozenNpc, setFrozenNpc] = useState<number | null>(null)
  /** The mob under the cursor right now, which is not the same thing as the one on show. */
  const [cursorNpc, setCursorNpc] = useState<number | null>(null)

  const enemyOf = (ref: CloneRef | null): Enemy | null =>
    ref ? (lookup.cloneByKey.get(cloneKey(ref.enemyIdx, ref.cloneIdx))?.enemy ?? null) : null

  const handleHoverClone = useCallback(
    (ref: CloneRef | null) => {
      const id = enemyOf(ref)?.id ?? null
      setCursorNpc(id)
      // A null means the cursor left a blip: the column keeps what it had.
      if (id != null && frozenNpc == null) setPanelNpc(id)
    },
    [lookup, frozenNpc],
  )

  const handleCloneContextMenu = useCallback(
    (ref: CloneRef) => {
      const id = enemyOf(ref)?.id
      if (id == null) return
      setFrozenNpc(id)
      setPanelNpc(id)
    },
    [lookup],
  )

  const panelEnemy = panelNpc != null ? (lookup.enemyById.get(panelNpc) ?? null) : null
```

`enemyOf` closes over `lookup` and is redefined every render — that is fine for a plain helper,
but it means it must **not** appear in the `useCallback` dependency arrays. `lookup` is what
belongs there. If the repository's lint rules object, hoist `enemyOf` into a `useCallback` of its
own and depend on that instead; say which you did.

Check whether `CloneRef`, `cloneKey` and `Enemy` are already imported in this file before adding
imports — `handleCloneClick` already uses `CloneRef` and `cloneKey`.

- [ ] **Step 4: Mount the column and pass the two new map props**

In the layout row (around line 219), before the `<div className="min-w-0 flex-1">` that wraps
the map:

```tsx
        {mode === 'route' && (
          <aside
            data-testid="mob-panel"
            className="thin-scroll w-[360px] shrink-0 overflow-y-auto border-r border-ink-800 bg-ink-900 p-3"
          >
            <MobPanel
              slug={slug}
              dungeon={lookup.dungeon}
              enemy={panelEnemy}
              frozen={frozenNpc != null}
              onUnfreeze={() => setFrozenNpc(null)}
            />
          </aside>
        )}
```

and on the `<DungeonMap …>` element, beside `objects`:

```tsx
            onHoverClone={handleHoverClone}
            onCloneContextMenu={mode === 'route' ? handleCloneContextMenu : undefined}
```

Import `MobPanel` at the top:

```tsx
import MobPanel from '../components/route/MobPanel'
```

- [ ] **Step 5: Gate the tooltip**

`CloneTooltip` must not show in the Route tab while nothing is frozen — the column already says
everything it would. Add a prop to `DungeonMap`'s `Props`:

```ts
  /** Hide the hover tooltip: something else on the page is already showing the hovered mob. */
  suppressCloneTooltip?: boolean
```

destructure it, and change the mount (around line 322, after Task 2's edit) from

```tsx
      {hoverClone && <CloneTooltip slug={slug} lookup={lookup} cloneKeyStr={hoverClone} />}
```

to

```tsx
      {hoverClone && !suppressCloneTooltip && (
        <CloneTooltip slug={slug} lookup={lookup} cloneKeyStr={hoverClone} />
      )}
```

Add `data-testid="clone-tooltip"` to `CloneTooltip`'s outer `<div>` — the page tests above query
it by that id.

Then, in `DungeonPage.tsx`, pass:

```tsx
            suppressCloneTooltip={mode === 'route' && frozenNpc == null}
```

**Do not remove `CloneTooltip`'s `pointer-events-none`.** It sits over the map, and a layer
without it swallowed every click on this branch once already.

- [ ] **Step 6: Run everything**

```bash
npm test
npm run typecheck
npm run build
```

All green, no skips. If `DungeonMap.test.tsx` or `DungeonPage.test.tsx` breaks on an existing
assertion, read what it pinned before changing it.

- [ ] **Step 7: Verify it in a real browser**

jsdom models no layout and no hit testing. The worst defect on the slice A branch was invisible
to every test and obvious in a browser. Start the dev server and check, at minimum:

1. In the Route tab, the column is there and the map still fits beside it.
2. Hovering a mob fills the column; moving the cursor off the map leaves it filled.
3. **Clicking a mob still adds it to the pull** — the forces total moves.
4. Right-clicking a mob does **not** open the browser's context menu; right-clicking the map
   background **does**.
5. The score's colour changes between a cheap mob and an expensive one.

Report what you saw for each, not that you "verified it".

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/routes/DungeonPage.tsx src/routes/DungeonPage.test.tsx src/components/map/DungeonMap.tsx
git commit
```

Subject: `Read a mob's entry without leaving the route you are building`. Body: the Route tab
reached no codex at all, so weighing a pack meant switching tabs and losing the map's context.

---

## Verification, once the tasks are done

- `npm test` green, no skips, and the count has grown by roughly 25.
- `npm run typecheck` and `npm run build` clean.
- The five browser checks in Task 5, Step 7, each reported with what was seen.
- `git diff main --stat` touches no file outside the file map above. In particular
  `src/lib/mdt/route.ts` is untouched: this slice writes nothing.
