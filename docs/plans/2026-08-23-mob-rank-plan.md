# Mob Rank Axis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** give a card a `rank` field — `boss` or `miniboss` — that overrides MDT's single `isBoss`
boolean everywhere rank is shown, and take `miniboss` out of `role`, which means shape.

**Architecture:** `rank` is parsed in `src/lib/content.ts` and derived exactly once, in
`getIndicators`, as `content.rank ?? (enemy.isBoss ? 'boss' : undefined)`. Six consumers read
`MobIndicators.rank` and none reads `enemy.isBoss` again. The thirty cards that say `role: miniboss`
are migrated mechanically, and only after every consumer understands `rank` — so no intermediate
commit regresses.

**Tech Stack:** React 19, TypeScript, Vite 6, Tailwind 4, Vitest (`app` project: node by default,
jsdom per file), Playwright for `e2e/`.

**Spec:** [`docs/plans/2026-08-23-mob-rank-design.md`](2026-08-23-mob-rank-design.md)

## Global Constraints

- **Branch from `main` only after PR #13 and the `tips-discoverability` PR have both landed.** This
  plan is written against that tree. Files it edits — `indicators.ts`, `highlights.ts`,
  `CodexPanel.tsx`, `DungeonMap.tsx`, `MobCard.tsx`, `MobTable.tsx` — are edited by both tips
  branches. `src/lib/content.integrity.test.ts` does not exist before PR #13.
- **Never `--no-verify`.** Forbidden git flags: `--no-verify`, `--no-hooks`, `--no-pre-commit-hook`.
- **Test output must be pristine.** A passing suite that prints warnings is a failing suite.
- **No mocks.** Tests read the real generated data and the real `content/*.md` through
  `import.meta.glob`. `content/__fixtures__/` is a pseudo-dungeon slug, unreachable from the app,
  and is where a case with no real content belongs.
- **Component tests** carry `// @vitest-environment jsdom` at the top, declare their own
  `afterEach(cleanup)`, and mount through `renderEn` / `renderFr` from `src/test/render.tsx`. There
  is **no `@testing-library/user-event` dependency** — use `fireEvent` from `@testing-library/react`.
- **`CONTRIBUTING.md` and `CONTRIBUTING.fr.md` land in the same commit or neither does.**
- Commit style: imperative mood, no `feat:`/`fix:` prefix, body explains **why**. End every commit
  message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Environment: `node` and `npm` need `export PATH="/c/Program Files/nodejs:$PATH"` in the Bash tool.
  `rm` is denied by the permission layer — delete with the Write tool or `node -e "fs.unlinkSync()"`.
- `npm test` runs both Vitest projects. One file: `npm test -- <path>`. One test:
  `npm test -- <path> -t "<name>"`.

## Why the task order is what it is

Tasks 2 and 5 change `priority` and `earnsARow`, which today key off `role === 'miniboss'` — the
value thirty cards still carry at that point. Both therefore keep the old clause **beside** the new
one until Task 6 has migrated the cards. Task 7 removes the old clause and the `ROLES` entry
together. Every commit in this plan leaves `npm test` green; none of them leaves a card without the
weight it had before.

The dual condition is temporary by construction: Task 7's first step is deleting it, and Task 7
cannot be skipped without leaving `miniboss` in `ROLES`.

---

### Task 1: `rank` in the content layer

**Files:**
- Modify: `src/lib/content.ts`
- Test: `src/lib/content.test.ts`
- Create: `content/__fixtures__/888010-ranked-miniboss.md`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export const RANKS = ['boss', 'miniboss'] as const`
  - `export type Rank = (typeof RANKS)[number]`
  - `export function isRank(value: unknown): value is Rank`
  - `MobContent.rank?: Rank`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/content.test.ts`, in a new `describe` at the end of the file:

```ts
describe('rank', () => {
  it('reads a legal value off a card', () => {
    expect(getMobContent('__fixtures__', 888_010)?.rank).toBe('miniboss')
  })

  it('leaves rank undefined on a card that declares none', () => {
    expect(getMobContent('__fixtures__', 270_306)?.rank).toBeUndefined()
  })

  // `role` is displayed, so a typo renders verbatim and the reader sees what was written.
  // `rank` decides placement and is never displayed as text, so the same tolerance would drop a
  // boss off the Overview with nothing on screen to say so. Ignoring it leaves MDT's answer
  // standing, which is the safe direction; `content.integrity.test.ts` is what catches the typo.
  it('rejects a value outside the vocabulary', () => {
    expect(isRank('boss')).toBe(true)
    expect(isRank('miniboss')).toBe(true)
    expect(isRank('bos')).toBe(false)
    expect(isRank('')).toBe(false)
    expect(isRank(undefined)).toBe(false)
    expect(isRank(3)).toBe(false)
  })
})
```

Add `isRank` to the existing import from `./content` at the top of that file.

- [ ] **Step 2: Create the fixture card**

Create `content/__fixtures__/888010-ranked-miniboss.md`:

```markdown
---
npcId: 888010
name: Ranked Miniboss   # auto
threat: high
role: melee
rank: miniboss
---

A fixture card, unreachable from the app: `__fixtures__` is no dungeon in the pool. It exists so
that a `rank:` a real card does not yet carry still has a test.
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- src/lib/content.test.ts -t "rank"`
Expected: FAIL — `isRank` is not exported, and `.rank` is `undefined` on the fixture.

- [ ] **Step 4: Add the vocabulary next to `ROLES`**

In `src/lib/content.ts`, directly below `isRole`:

```ts
/**
 * A mob's rank: how much of a deal it is, as opposed to `role`, which is what shape it is.
 *
 * Unlike `role` this is **not** free text. `role` is displayed, so an unknown value renders as
 * itself and the reader sees the word someone wrote. `rank` is never displayed as text — it
 * decides which list a mob appears in — so an unknown value is dropped and MDT's own `isBoss`
 * stands. `content.integrity.test.ts` is what turns that silent fallback into a failing test.
 */
export const RANKS = ['boss', 'miniboss'] as const

export type Rank = (typeof RANKS)[number]

export function isRank(value: unknown): value is Rank {
  return typeof value === 'string' && (RANKS as readonly string[]).includes(value)
}
```

- [ ] **Step 5: Carry it through the loader**

Three edits in `src/lib/content.ts`:

In `interface MobContent`, below `role?: string`:

```ts
  rank?: Rank
```

In `interface RawMob`, below `role?: string`:

```ts
  rank?: Rank
```

In the `slot(mobFiles, ...)` assignment, below the `role:` line:

```ts
    rank: isRank(data.rank) ? data.rank : undefined,
```

In the object `mergeMob` returns, below `role: translation?.role ?? base?.role,`:

```ts
    rank: translation?.rank ?? base?.rank,
```

The translation fallback matches the `role` line beside it. A `.fr.md` is not *supposed* to carry a
judgement, but that rule is enforced in review and stated in `CONTRIBUTING.md`, not in this merge —
and making `rank` the one field that behaves differently here would be a trap for the next reader.

Leave `isStub` alone: `role` does not count toward it, and `rank` is the same kind of field.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- src/lib/content.test.ts`
Expected: PASS, and no new console output.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/content.ts src/lib/content.test.ts content/__fixtures__/888010-ranked-miniboss.md
git commit -m "Give a card a rank, and refuse to guess at a typo in it"
```

---

### Task 2: `MobIndicators.rank`, the ring, and priority

**Files:**
- Modify: `src/lib/indicators.ts`
- Test: `src/lib/indicators.test.ts`

**Interfaces:**
- Consumes: `Rank`, `isRank`, `MobContent.rank` from Task 1.
- Produces: `MobIndicators.rank?: Rank` — the single derivation every other task reads.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/indicators.test.ts`. Use the same helpers the file already uses to reach an enemy;
`ALTAR` and `getLookup` are already imported there.

```ts
describe('rank', () => {
  it('inherits MDT for a card that says nothing', () => {
    const boss = getLookup(ALTAR)!.dungeon.enemies.find((e) => e.isBoss)!
    expect(getIndicators(ALTAR, boss).rank).toBe('boss')
  })

  it('is undefined for an unflagged mob whose card says nothing', () => {
    const trash = getLookup(ALTAR)!.dungeon.enemies.find((e) => !e.isBoss)!
    expect(getIndicators(ALTAR, trash).rank).toBeUndefined()
  })

  it('takes the card over MDT', () => {
    const enemy = { id: 888_010, isBoss: true, cc: [], spells: [], clones: [] } as unknown as Enemy
    expect(getIndicators('__fixtures__', enemy).rank).toBe('miniboss')
  })

  it('gives a miniboss the priority mark, and the gold ring only to a boss', () => {
    const enemy = { id: 888_010, cc: [], spells: [], clones: [] } as unknown as Enemy
    const ind = getIndicators('__fixtures__', enemy)
    expect(ind.priority).toBe(true)
    // The ring is the threat rating; the card is `threat: high`.
    expect(ind.ring).toBe('#d97036')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/indicators.test.ts -t "rank"`
Expected: FAIL — `rank` is not a property of `MobIndicators`.

- [ ] **Step 3: Add the field and the derivation**

In `src/lib/indicators.ts`, import the type:

```ts
import { getMobContent, type Rank, type Threat } from './content'
```

In `interface MobIndicators`, above `ring`:

```ts
  /**
   * Boss, miniboss, or neither. The card decides; MDT's `isBoss` is the default it overrides.
   * This is the only place that derivation happens — nothing downstream reads `enemy.isBoss`.
   */
  rank?: Rank
```

In `getIndicators`, above the `const priority = …` line:

```ts
  const rank: Rank | undefined = content?.rank ?? (enemy.isBoss ? 'boss' : undefined)
```

Replace the `priority` expression with:

```ts
  // `content.role === 'miniboss'` is the pre-migration spelling and is removed in the task that
  // retires it from `ROLES`. Both are true of the same mobs in between.
  const priority =
    rank !== undefined ||
    content?.role === 'miniboss' ||
    threat === 'lethal' ||
    threat === 'high'
```

In the `indicators` object, add `rank,` beside `threat,` and change the `ring` line to:

```ts
    ring: rank === 'boss' ? BOSS_RING : threat ? THREAT_RING[threat] : NEUTRAL_RING,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/indicators.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS. Nothing else reads `rank` yet, so nothing else can have moved.

- [ ] **Step 6: Commit**

```bash
git add src/lib/indicators.ts src/lib/indicators.test.ts
git commit -m "Derive a mob's rank once, and let the card outrank MDT"
```

---

### Task 3: The map — blip size, tooltip label, legend

**Files:**
- Modify: `src/components/map/viewport.ts`
- Modify: `src/components/map/viewport.test.ts`
- Modify: `src/lib/geometry.test.ts:348`
- Modify: `src/components/map/DungeonMap.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`
- Test: `src/components/map/DungeonMap.test.tsx`

**Interfaces:**
- Consumes: `MobIndicators.rank` from Task 2.
- Produces: `blipRadius(enemy: { scale?: number }, rank?: Rank): number` — **signature change**, the
  `isBoss` property is gone from its parameter.

- [ ] **Step 1: Write the failing tests**

In `src/components/map/viewport.test.ts`, replace the boss case in the `blipRadius` describe and add
the miniboss one:

```ts
  it('draws a boss bigger than a miniboss, and a miniboss bigger than trash', () => {
    expect(blipRadius({ scale: 1 }, 'boss')).toBeGreaterThan(blipRadius({ scale: 1 }, 'miniboss'))
    expect(blipRadius({ scale: 1 }, 'miniboss')).toBeGreaterThan(blipRadius({ scale: 1 }))
  })

  it('scales a miniboss like any other blip', () => {
    expect(blipRadius({ scale: 1.5 }, 'miniboss')).toBeCloseTo(18 * 1.5, 9)
  })
```

In `src/components/map/DungeonMap.test.tsx`, add to the existing describe that covers blips:

```ts
  it('names a miniboss in the tooltip and gives it a mid-size blip', () => {
    // 888010 is a fixture card, so pin this to the enemy the fixture slug is written against.
    renderEn(<DungeonMap slug={FIXTURE_SLUG} {...mapProps} />)
    expect(screen.getByText('MINIBOSS')).toBeTruthy()
  })
```

> **If `DungeonMap.test.tsx` has no fixture-slug harness**, do not invent one: mount the map for a
> real dungeon and assert the legend instead — `expect(screen.getByText('Miniboss')).toBeTruthy()`
> after opening the legend the way the existing legend tests do. The legend row is unconditional and
> proves the wiring; the blip size is already proved by `viewport.test.ts`. Say in the task report
> which of the two you used and why.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/map/viewport.test.ts`
Expected: FAIL — `blipRadius` takes one argument.

- [ ] **Step 3: Change `blipRadius`**

In `src/components/map/viewport.ts`:

```ts
import type { Rank } from '../../lib/content'

/**
 * Radius of a mob's blip. Size carries rank — a boss reads biggest, a miniboss sits between —
 * while the ring colour carries threat. MDT's own scale is capped.
 */
export function blipRadius(enemy: { scale?: number }, rank?: Rank): number {
  const base = rank === 'boss' ? 22 : rank === 'miniboss' ? 18 : 14
  return base * Math.min(enemy.scale || 1, 1.9)
}
```

- [ ] **Step 4: Fix every caller**

`src/components/map/DungeonMap.tsx`, in `Blip` — the `getIndicators` call is already on the line
above:

```ts
  const r = blipRadius(enemy, ind.rank)
```

`src/lib/geometry.test.ts:348` needs no change: it already calls `blipRadius({ scale: 1.9 })`.

Any remaining `blipRadius({ isBoss: true, … })` in `viewport.test.ts` becomes
`blipRadius({ … }, 'boss')`.

- [ ] **Step 5: Add the tooltip label**

In `src/components/map/DungeonMap.tsx`, in the tooltip component, replace the `enemy.isBoss` line:

```tsx
        {ind.rank === 'boss' && <span className="text-xs text-gold-400">{t('map.boss')}</span>}
        {ind.rank === 'miniboss' && <span className="text-xs text-ink-300">{t('map.miniboss')}</span>}
```

- [ ] **Step 6: Add the legend group**

The existing `ringRows` render fixed-size swatches whose *colour* is the message, so a size signal
cannot live there. Add a third group below the ring block in `Legend()`:

```tsx
  const blipRows: [number, string][] = [
    [10, t('legend.blip.boss')],
    [8, t('legend.blip.miniboss')],
    [6, t('legend.blip.trash')],
  ]
```

and, after the `ringRows.map(…)` block:

```tsx
      <div className="mt-2.5 mb-1.5 text-[10px] font-bold tracking-widest text-ink-400">
        {t('legend.blip')}
      </div>
      {blipRows.map(([size, label]) => (
        <div key={label} className="mb-1 flex items-center gap-2">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            <span
              className="shrink-0 rounded-full bg-ink-600"
              style={{ width: size, height: size }}
            />
          </span>
          <span className="text-ink-300">{label}</span>
        </div>
      ))}
```

Three rows, not one: the boss blip is already bigger than trash and nothing has ever said so, so
explaining half the vocabulary would be worse than explaining none.

- [ ] **Step 7: Add the strings to both dictionaries**

`src/lib/i18n/en.ts`, beside `'map.boss'` and the `legend.*` block:

```ts
  'map.miniboss': 'miniboss',
  'legend.blip': 'BLIP SIZE',
  'legend.blip.boss': 'Boss',
  'legend.blip.miniboss': 'Miniboss',
  'legend.blip.trash': 'Everything else',
```

`src/lib/i18n/fr.ts`, at the matching places:

```ts
  'map.miniboss': 'miniboss',
  'legend.blip': 'TAILLE DES PIONS',
  'legend.blip.boss': 'Boss',
  'legend.blip.miniboss': 'Miniboss',
  'legend.blip.trash': 'Tout le reste',
```

- [ ] **Step 8: Run the tests**

Run: `npm test -- src/components/map/ src/lib/geometry.test.ts`
Expected: PASS.

- [ ] **Step 9: Typecheck and commit**

```bash
npm run typecheck
git add src/components/map/ src/lib/geometry.test.ts src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit -m "Let a blip's size say rank while its ring keeps saying threat"
```

---

### Task 4: The codex panel's boss group

**Files:**
- Modify: `src/components/codex/CodexPanel.tsx:139-143`
- Modify: `src/components/codex/MobCard.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`
- Test: `src/components/codex/CodexPanel.test.tsx`, `src/components/codex/MobCard.test.tsx`

**Interfaces:**
- Consumes: `MobIndicators.rank` from Task 2.
- Produces: nothing new.

- [ ] **Step 1: Write the failing tests**

In `src/components/codex/MobCard.test.tsx`, in the fixtures describe that already exists near
line 179:

```ts
  it('marks a miniboss in the header', () => {
    const enemy = { id: 888_010, count: 0, clones: [], cc: [], spells: [] } as unknown as Enemy
    renderEn(<MobCard slug="__fixtures__" enemy={enemy} />)
    expect(screen.getByText('MINIBOSS')).toBeTruthy()
    expect(screen.queryByText('BOSS')).toBeNull()
  })
```

In `src/components/codex/CodexPanel.test.tsx`, add a test that the boss group counts by rank. Read
the file's existing dungeon harness first and follow it; the assertion is:

```ts
  it('counts the boss group by rank, not by MDT alone', () => {
    renderEn(<CodexPanel slug={SLUG} lookup={lookup} />)
    const heading = screen.getByText(/BOSSES/i)
    expect(heading).toBeTruthy()
  })
```

> The interesting case — a demoted mob leaving the group — has no content until Task 6. **Task 6
> adds that assertion**; this one only pins that the group still renders off the new derivation.

- [ ] **Step 2: Run to verify the MobCard test fails**

Run: `npm test -- src/components/codex/MobCard.test.tsx -t "miniboss"`
Expected: FAIL — no `MINIBOSS` text in the document.

- [ ] **Step 3: Mark the card**

In `src/components/codex/MobCard.tsx`, replace the `enemy.isBoss` line in the header:

```tsx
            {ind.rank === 'boss' && (
              <span className="text-xs font-semibold text-gold-400">{t('mob.boss')}</span>
            )}
            {ind.rank === 'miniboss' && (
              <span className="text-xs font-semibold text-ink-300">{t('mob.miniboss')}</span>
            )}
```

`ind` is already in scope — `const ind = getIndicators(slug, enemy, locale)` at line 43.

- [ ] **Step 4: Filter the panel by rank**

In `src/components/codex/CodexPanel.tsx`, add the import:

```ts
import { getIndicators } from '../../lib/indicators'
```

and replace the two filters:

```tsx
  const isBossRank = (e: Enemy) => getIndicators(slug, e, locale).rank === 'boss'
  const bosses = lookup.dungeon.enemies.filter(isBossRank)
  const seen = new Set<number>()
  const uniqueTrash = lookup.dungeon.enemies.filter(
    (e) => !isBossRank(e) && (seen.has(e.id) ? false : (seen.add(e.id), true)),
  )
```

`locale` is already destructured at line 57. `getIndicators` is cached per `locale/slug/npcId` and is
already called once per card this panel renders, so the filter adds no content reads.

Import `Enemy` as a type if the file does not already: `import type { Enemy } from '../../lib/types'`.

- [ ] **Step 5: Add the strings**

`src/lib/i18n/en.ts`, beside `'mob.boss'`:

```ts
  'mob.miniboss': 'MINIBOSS',
```

`src/lib/i18n/fr.ts`, same place:

```ts
  'mob.miniboss': 'MINIBOSS',
```

- [ ] **Step 6: Run the tests**

Run: `npm test -- src/components/codex/`
Expected: PASS.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck
git add src/components/codex/ src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit -m "Group the codex by the rank a card declares, not by MDT's flag"
```

---

### Task 5: The Overview — boss strip, table rows, the in-place mark

**Files:**
- Modify: `src/lib/highlights.ts`
- Modify: `src/components/highlights/MobTable.tsx:48-51`
- Test: `src/lib/highlights.test.ts`, `src/components/highlights/MobTable.test.tsx`

**Interfaces:**
- Consumes: `MobIndicators.rank` from Task 2.
- Produces: `HighlightMob.rank?: Rank` — read by `MobTable` and by the boss strip.

- [ ] **Step 1: Write the failing test**

In `src/lib/highlights.test.ts`:

```ts
  it('puts the rank on a row so the table can mark it in place', () => {
    const rows = getHighlights(ALTAR).mobs
    expect(rows.length).toBeGreaterThan(0)
    // Every row carries the field, whether or not this dungeon has a miniboss in it.
    for (const row of rows) {
      expect(row.rank === undefined || row.rank === 'miniboss').toBe(true)
    }
  })
```

A boss can never reach `mobs`: the boss branch runs first and `continue`s.

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/lib/highlights.test.ts -t "mark it in place"`
Expected: FAIL — `rank` is not a property of `HighlightMob`.

- [ ] **Step 3: Read the rank from the one derivation**

In `src/lib/highlights.ts`, add the import:

```ts
import { getIndicators } from './indicators'
```

`indicators.ts` imports `content`, `data` and `i18n/locales` and never imports `highlights`, so this
adds no cycle.

Add to `interface HighlightMob`, beside `role?: string`:

```ts
  /** Boss or miniboss, as the card declares it. `MobTable` marks a miniboss in place. */
  rank?: Rank
```

Import the type: `import { …, type Rank, … } from './content'`.

- [ ] **Step 4: Switch the loop**

In `getHighlights`, below the `const { name } = getNpcLabel(enemy, locale)` line:

```ts
    const { rank } = getIndicators(slug, enemy, locale)
```

Replace `if (enemy.isBoss) {` with:

```ts
    if (rank === 'boss') {
```

Add `rank,` to both the `bosses.push({ … })` and the `mobs.push({ … })` objects, beside `role`.

Replace the `hasRow` line:

```ts
    const hasRow = spells.length > 0 && earnsARow(content?.threat, rank, content?.role)
```

and `earnsARow` itself:

```ts
/**
 * `rank !== undefined` reads as "any rank", but only a miniboss can reach it: a boss leaves the
 * loop one branch above. Written this way it stays correct if a third rank is ever added.
 *
 * `role === 'miniboss'` is the pre-migration spelling, removed with the `ROLES` entry.
 */
function earnsARow(threat?: Threat, rank?: Rank, role?: string): boolean {
  return (
    threat === 'lethal' ||
    threat === 'high' ||
    threat === 'medium' ||
    rank !== undefined ||
    role === 'miniboss'
  )
}
```

- [ ] **Step 5: Mark it in the table**

In `src/components/highlights/MobTable.tsx:48`, change the condition to accept either spelling:

```tsx
          {(mob.rank === 'miniboss' || mob.role === 'miniboss') && (
```

Leave the `t('role.miniboss')` label alone for now — Task 7 moves it to `t('mob.miniboss')` when
`role.miniboss` is deleted.

- [ ] **Step 6: Run the tests**

Run: `npm test -- src/lib/highlights.test.ts src/components/highlights/`
Expected: PASS. The two `MobTable` tests that name Twinfang Harrower and Ascendant Serpent still
pass — those cards still say `role: miniboss` at this point, and the condition accepts it.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/highlights.ts src/lib/highlights.test.ts src/components/highlights/
git commit -m "Build the briefing's boss strip from rank instead of MDT's flag"
```

---

### Task 6: Migrate the thirty cards, and demote Echo of Nalorakk

**Files:**
- Modify: 30 files matching `content/*/[0-9]*.md` that contain `role: miniboss`
- Modify: `content/den-of-nalorakk/247301-echo-of-nalorakk.md`
- Test: `src/lib/highlights.test.ts`, `src/components/codex/CodexPanel.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: content only.

- [ ] **Step 1: Write the failing test**

In `src/lib/highlights.test.ts`:

```ts
  it('leaves Echo of Nalorakk out of the boss strip its card never claimed', () => {
    const { bosses } = getHighlights('den-of-nalorakk')
    expect(bosses.map((b) => b.npcId)).not.toContain(247_301)
    // The three the dungeon actually has.
    expect(bosses).toHaveLength(3)
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/lib/highlights.test.ts -t "Echo of Nalorakk"`
Expected: FAIL — four bosses, 247301 among them.

- [ ] **Step 3: Migrate the thirty cards**

Write a one-shot script to the scratchpad — not to `scripts/`, it is not part of the data chain —
and run it. It rewrites `role: miniboss` to `rank: miniboss` and leaves `role:` empty:

```js
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = 'content'
let touched = 0
for (const dir of readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const file of readdirSync(join(root, dir.name)).filter((f) => f.endsWith('.md'))) {
    const path = join(root, dir.name, file)
    const text = readFileSync(path, 'utf8')
    if (!/^role: miniboss\s*$/m.test(text)) continue
    writeFileSync(path, text.replace(/^role: miniboss[ \t]*$/m, 'role:\nrank: miniboss'), 'utf8')
    touched++
  }
}
console.log(`${touched} cards migrated`)
```

Expected output: `30 cards migrated`.

Verify by hand: `git diff --stat content/` shows 30 files, each +1/-1 lines net of the added line.
Nothing under `content/**/*.fr.md` may appear — no `.fr.md` carries `role`, and if one shows up in
the diff, stop and report it rather than committing.

- [ ] **Step 4: Demote Echo of Nalorakk**

In `content/den-of-nalorakk/247301-echo-of-nalorakk.md`, add below the `role: add` line:

```yaml
rank: miniboss
```

Leave `role: add` exactly as it is — that is its shape, and it is correct.

> **Judgement flag for the reviewer:** this card is the design's named demotion case (3.4M health
> against Nalorakk's 21.9M), and `miniboss` is the only demotion the vocabulary has. If it is really
> a plain encounter add rather than a miniboss, that is a third rank value and a change to the
> design, not something to decide here. Raise it; do not invent a value.

- [ ] **Step 5: Add the panel assertion the earlier task deferred**

In `src/components/codex/CodexPanel.test.tsx`, following the file's existing harness for
`den-of-nalorakk`:

```ts
  it('drops a demoted mob out of the boss group and into the trash list', () => {
    renderEn(<CodexPanel slug="den-of-nalorakk" lookup={getLookup('den-of-nalorakk')!} />)
    expect(screen.getAllByText('MINIBOSS').length).toBeGreaterThan(0)
  })
```

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS. Watch specifically that the `MobTable` tests naming Twinfang Harrower and Ascendant
Serpent still pass — they now travel through `mob.rank` rather than `mob.role`, and Task 5's
condition accepts both.

- [ ] **Step 7: Commit**

```bash
git add content/ src/lib/highlights.test.ts src/components/codex/CodexPanel.test.tsx
git commit -m "Move thirty minibosses off the shape field, and stop calling an echo a boss"
```

---

### Task 7: Retire `role: miniboss`

**Files:**
- Modify: `src/lib/content.ts` (`ROLES`)
- Modify: `src/lib/indicators.ts` (the dual `priority` condition)
- Modify: `src/lib/highlights.ts` (`earnsARow`'s `role` parameter)
- Modify: `src/components/highlights/MobTable.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts` (delete `role.miniboss`)
- Modify: `scripts/content-stub.mjs:47`
- Modify: `src/lib/content.integrity.test.ts`
- Test: `src/lib/content.test.ts`, `scripts/content-stub.test.mjs`

**Interfaces:**
- Consumes: Task 6's migrated content.
- Produces: `ROLES` without `miniboss`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/content.test.ts`:

```ts
  it('no longer offers miniboss as a shape', () => {
    expect(isRole('miniboss')).toBe(false)
  })
```

In `src/lib/content.integrity.test.ts`, a new describe:

```ts
/** The raw `rank:` a card declares, before the loader has had a chance to drop it. */
function declaredRank(file: string): string | undefined {
  const { data } = splitFrontmatter(readFileSync(file, 'utf8'))
  return typeof data.rank === 'string' ? data.rank : undefined
}

describe('Declared ranks', () => {
  it('finds at least one card declaring one, so this test is not vacuous', () => {
    const declared = cards().flatMap(([, file]) => declaredRank(file) ?? [])
    expect(declared.length).toBeGreaterThan(0)
  })

  /**
   * A `rank:` outside the vocabulary is dropped by the loader without a word, and the mob keeps
   * whatever MDT said — so `rank: bos` on a real boss looks exactly like a correct card until
   * someone notices the mob in the wrong list. This is the only place that typo is visible.
   */
  it('uses a value the loader will accept', () => {
    const bad = cards().flatMap(([, file]) => {
      const rank = declaredRank(file)
      return rank !== undefined && !isRank(rank) ? [`${file}: rank: ${rank}`] : []
    })
    expect(bad).toEqual([])
  })
})
```

Add `isRank` to the `./content` import at the top of that file.

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -- src/lib/content.test.ts -t "miniboss" src/lib/content.integrity.test.ts`
Expected: the `isRole` test FAILS; the integrity describe fails to compile until `isRank` is imported.

- [ ] **Step 3: Take `miniboss` out of `ROLES`**

In `src/lib/content.ts`:

```ts
export const ROLES = ['caster', 'melee', 'patrol', 'add'] as const
```

- [ ] **Step 4: Delete the three dual conditions**

`src/lib/indicators.ts` — the `priority` expression loses its second clause and its comment:

```ts
  const priority = rank !== undefined || threat === 'lethal' || threat === 'high'
```

`src/lib/highlights.ts` — `earnsARow` loses the `role` parameter, its clause, and the second half of
its comment:

```ts
/**
 * `rank !== undefined` reads as "any rank", but only a miniboss can reach it: a boss leaves the
 * loop one branch above. Written this way it stays correct if a third rank is ever added.
 */
function earnsARow(threat?: Threat, rank?: Rank): boolean {
  return threat === 'lethal' || threat === 'high' || threat === 'medium' || rank !== undefined
}
```

and its call site:

```ts
    const hasRow = spells.length > 0 && earnsARow(content?.threat, rank)
```

`src/components/highlights/MobTable.tsx`:

```tsx
          {mob.rank === 'miniboss' && (
```

with the label now reading `{t('mob.miniboss')}` — `role.miniboss` is about to be deleted.

- [ ] **Step 5: Delete the dead strings**

Remove `'role.miniboss'` from both `src/lib/i18n/en.ts` and `src/lib/i18n/fr.ts`.

- [ ] **Step 6: Stop the scaffold offering it**

In `scripts/content-stub.mjs`, replace line 47 and add the `rank` prompt below `role:`:

```js
  lines.push('# TO FILL IN: caster | melee | patrol | add')
  lines.push('role:')
  lines.push('# OPTIONAL — overrides MDT: boss | miniboss')
  lines.push('rank:')
```

Update `scripts/content-stub.test.mjs` wherever it asserts the old role comment, and add:

```js
    expect(text).toContain('# OPTIONAL — overrides MDT: boss | miniboss')
```

- [ ] **Step 7: Run everything**

Run: `npm test`
Expected: PASS, and pristine output. If a card still says `role: miniboss`, the `MobTable` tests are
what will catch it — go back to Task 6 rather than restoring the clause.

- [ ] **Step 8: Typecheck and commit**

```bash
npm run typecheck
git add src/ scripts/
git commit -m "Stop role from carrying a rank, now that nothing needs it to"
```

---

### Task 8: The guides, the skill, and the end-to-end proof

**Files:**
- Modify: `CONTRIBUTING.md`, `CONTRIBUTING.fr.md` — **same commit, both or neither**
- Modify: `.claude/skills/codex-content/SKILL.md`
- Modify: `CLAUDE.md`
- Test: `e2e/` — a new spec or an addition to an existing one

**Interfaces:**
- Consumes: the finished behaviour from Tasks 1–7.
- Produces: nothing code reads.

- [ ] **Step 1: Write the failing end-to-end scenario**

Add to `e2e/` — put it in the spec that already opens a dungeon's Overview if one fits, otherwise a
new `e2e/rank.spec.ts` following the shape of `e2e/tips.spec.ts`:

```ts
test('the briefing lists the three bosses Den of Nalorakk has, not the four MDT flags', async ({ page }) => {
  await page.goto(dungeonUrl('den-of-nalorakk'))
  await page.getByRole('tab', { name: 'Overview', exact: true }).click()
  const strip = page.getByTestId('boss-strip')
  await expect(strip.getByRole('heading')).toHaveCount(3)
  await expect(strip.getByText('Echo of Nalorakk')).toHaveCount(0)
})
```

> Read `e2e/urls.ts` and the real `BossStrip` markup before writing the locators — `boss-strip` and
> the heading role are the shape to confirm, not to assume. If `BossStrip` carries no test id, add
> one rather than selecting on a class.

- [ ] **Step 2: Run it and watch it fail on the old build**

Run: `git stash && npm run test:e2e -- --grep "three bosses"; git stash pop`
Expected: FAIL against the pre-rank build — four headings. This is the step that proves the scenario
is not vacuous; do not skip it.

- [ ] **Step 3: Run it against the branch**

Run: `npm run test:e2e -- --grep "three bosses"`
Expected: PASS.

- [ ] **Step 4: Update `CONTRIBUTING.md`**

Four edits:

1. The "Yours to write" table — after the `role` row:

```markdown
| `rank`: whether it is a boss or a miniboss, when the game disagrees with the players | Which mobs the game itself flags as bosses |
```

2. The frontmatter example — the role comment loses `miniboss`, and a `rank` line joins it:

```markdown
role: melee               # caster | melee | patrol | add
rank: miniboss            # optional: boss | miniboss — overrides what MDT says
```

3. The field table — replace the `role` row and add one below it:

```markdown
| `role` | `caster`, `melee`, `patrol` or `add`. What shape of mob it is. |
| `rank` | `boss` or `miniboss`. Leave it out and the mob is whatever MDT flagged it. Write it when the game disagrees with the players: a flagged unit that is really a miniboss, or an unflagged one that everybody treats as a boss fight. A value outside those two is ignored, and a test names the file. |
```

4. The `.fr.md` section — `rank` joins the list of what does **not** belong:

```markdown
`tag`, `prio`. Those are judgements, not language
```

becomes

```markdown
`tag`, `prio`, `rank`. Those are judgements, not language
```

- [ ] **Step 5: Make the same four edits in `CONTRIBUTING.fr.md`**

Translate; do not transliterate. Keep the path placeholders in the form that file already uses.

```markdown
| `rank` | `boss` ou `miniboss`. Sans lui, le mob est ce que MDT en dit. À écrire quand le jeu et les joueurs ne sont pas d'accord : une unité marquée boss qui est en réalité un miniboss, ou une unité non marquée que tout le monde traite comme telle. Une autre valeur est ignorée, et un test nomme le fichier. |
```

- [ ] **Step 6: Add the judgement guidance to the skill**

In `.claude/skills/codex-content/SKILL.md`, beside the existing note on which fields are judgements:

```markdown
**`rank` is about the fight, not the health bar.** Write `boss` for something the dungeon counts as
an encounter and `miniboss` for a unit that stops the group without being one. MDT's flag is the
default and it is wrong in both directions — it flags every unit that appears in an encounter, so a
council of three reads as three bosses, and it flags nothing for the 200M-health blocker standing in
a corridor. Leave `rank` out unless you are correcting it.
```

- [ ] **Step 7: Record the invariant in `CLAUDE.md`**

Under "Invariants not to break":

```markdown
- **A card's `rank` outranks MDT's `isBoss`, and is derived once.** `getIndicators` is the only
  place that resolution happens; nothing else may read `enemy.isBoss` to decide how a mob is shown.
```

- [ ] **Step 8: Run everything, then commit**

```bash
npm test
npm run test:e2e
git add CONTRIBUTING.md CONTRIBUTING.fr.md .claude/skills/codex-content/SKILL.md CLAUDE.md e2e/
git commit -m "Tell contributors what rank means, in both languages"
```

- [ ] **Step 9: Open the follow-up issue**

Thirty cards now record a rank and no shape. File it so the gap is tracked rather than forgotten:

```bash
gh issue create --title "Fill in the shape of the thirty migrated miniboss cards" --body "..."
```

The body lists the thirty paths (`git log -1 --name-only` on Task 6's commit) and says the shape is
`caster`, `melee`, `patrol` or `add`, to be judged from having played the pull.

---

## Self-Review

**Spec coverage:**

| Design decision | Task |
| --- | --- |
| 1 — `rank` is a new field | 1 |
| 2 — absent, it inherits MDT | 2 |
| 3 — unknown value ignored, caught by a test | 1 (ignored), 7 (the test) |
| 4 — one derivation, six consumers | 2 (derivation), 3, 4, 5 (consumers) |
| 5 — size carries rank, colour carries threat | 3 |
| 6 — marked in place, no new section | 4 (card), 5 (table) |
| 7 — demotion stops at miniboss | 1 (`RANKS` has two values) |
| Migration | 6 |
| Docs, scaffold, skill | 7 (scaffold), 8 (guides, skill) |
| Testing table | 1, 2, 3, 5, 6 (unit + integration), 8 (e2e) |

**Two things this plan changed from the design, both flagged in-line for the reviewer:**

- The legend gains **three** rows in a new "blip size" group, not one row in the ring group. The ring
  group renders colour swatches at a fixed size and cannot express a size difference; and a boss
  blip has always been bigger with nothing saying so, so explaining half the vocabulary would read
  worse than explaining none.
- The unknown-`rank` branch is tested through `isRank` directly rather than through a fixture card.
  A fixture carrying an illegal `rank:` would be found by Task 7's integrity test, which scans all of
  `content/**` including `__fixtures__` — the two tests would contradict each other.

**Type consistency:** `Rank` and `isRank` are defined in Task 1 and used under those names in Tasks
2, 3, 5 and 7. `MobIndicators.rank` is defined in Task 2 and read in 3, 4 and 5. `HighlightMob.rank`
is defined in Task 5 and read in 5 and 7. `blipRadius`'s signature changes in Task 3 and every caller
is listed there.

**Open question the plan cannot settle:** whether Echo of Nalorakk is a miniboss or a plain encounter
add. The vocabulary has no way to say the second, by decision 7. Task 6 flags it rather than
inventing a third value.
