# Tip Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** let a tip declare which pull it is about with `packs: [44]`, so the map's `?` badge marks
the blip standing in that pull instead of every clone of the mob.

**Architecture:** `packs` is parsed in the pure `src/lib/tips.ts`, surfaced through
`MobIndicators` as `generalTips` and `tipPacks`, and consumed by one condition in `Blip`. The card
and the Overview show which pull through a chip in `MobTips`, which both mount. Every check the
parser cannot make — does pack 44 exist, does it hold this mob, does the translation agree — lives
in `content.integrity.test.ts`, which is the only test that reads the raw files and the generated
data together.

**Tech Stack:** React 19, TypeScript, Vite 6, Tailwind 4, Vitest (`app` project: node by default,
jsdom per file), Playwright for `e2e/`.

**Spec:** [`docs/plans/2026-08-23-tip-scope-design.md`](2026-08-23-tip-scope-design.md)

## Global Constraints

- **Branch from `main` only after PR #14 has landed.** This plan is written against that tree.
  `MobIndicators.hasTips`, the `?` badge in `Blip` and the Overview's tips section all arrive with
  it. Verify `git log --oneline -1 main` shows the tips-discoverability merge before starting.
- **Never `--no-verify`.** Forbidden git flags: `--no-verify`, `--no-hooks`, `--no-pre-commit-hook`.
- **Test output must be pristine.** `parseTips` warns through `console.warn`; every test that
  triggers a warning must silence it the way `src/lib/tips.test.ts` already does —
  `const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})` … `warn.mockRestore()`.
- **No mocks.** Tests read the real generated data and the real `content/*.md` through
  `import.meta.glob`. `content/__fixtures__/` is a pseudo-dungeon slug, unreachable from the app.
- **Component tests** carry `// @vitest-environment jsdom` at the top, declare their own
  `afterEach(cleanup)`, and mount through `renderEn` / `renderFr` from `src/test/render.tsx`. There
  is **no `@testing-library/user-event` dependency** — use `fireEvent` from `@testing-library/react`.
- **`CONTRIBUTING.md` and `CONTRIBUTING.fr.md` land in the same commit or neither does.**
- **Nothing under `content/` ever reaches an MDT string.** `packs` is a pack *id* read from MDT, but
  it travels one way: the codec serialises the route document only.
- Commit style: imperative mood, no `feat:`/`fix:` prefix, body explains **why**. End every commit
  message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Environment: `node` and `npm` need `export PATH="/c/Program Files/nodejs:$PATH"` in the Bash tool.
  `rm` is denied by the permission layer — delete with the Write tool or `node -e "fs.unlinkSync()"`.
- `npm test` runs both Vitest projects. One file: `npm test -- <path>`. One test:
  `npm test -- <path> -t "<name>"`.

## Why the task order is what it is

Tasks 1 through 4 add the capability while **no card uses it**: with no `packs:` anywhere,
`generalTips` is true for every tipped mob and the map behaves exactly as it does today. Task 5 is
the first commit that changes what a reader sees, and it changes it for one card. That ordering means
every earlier commit is provably behaviour-preserving, and the one that is not is small enough to
read in full.

---

### Task 1: `packs` in the parser

**Files:**
- Modify: `src/lib/tips.ts`
- Test: `src/lib/tips.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `packs?: number[]` on all three members of `Tip`.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/tips.test.ts`:

```ts
describe('a tip that names its pull', () => {
  it('reads a list of pack numbers', () => {
    const [tip] = parseTips([{ text: 'x', packs: [44, 45] }], 'card')!
    expect(tip.packs).toEqual([44, 45])
  })

  // Someone will write the scalar form. Dropping it silently would produce a card that looks
  // right and a map that behaves as though the key were never there.
  it('accepts a bare number as a list of one', () => {
    const [tip] = parseTips([{ text: 'x', packs: 44 }], 'card')!
    expect(tip.packs).toEqual([44])
  })

  it('leaves a tip with no packs unscoped', () => {
    const [tip] = parseTips([{ text: 'x' }], 'card')!
    expect(tip.packs).toBeUndefined()
  })

  it('scopes a video and an image too, not only text', () => {
    const [video] = parseTips([{ video: 'https://youtu.be/9D0gCU8Tp5Y', packs: [44] }], 'card')!
    const [image] = parseTips([{ image: 'a.webp', packs: [44] }], 'card')!
    expect(video.packs).toEqual([44])
    expect(image.packs).toEqual([44])
  })

  /**
   * One bad entry unscopes the whole tip rather than narrowing it silently. An unscoped tip is
   * noisy on the map — a badge on every clone — which is visible; a quietly narrowed one points
   * at the wrong pull and looks correct doing it.
   */
  it('drops the scope, and warns, when any value is not a pack number', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseTips([{ text: 'x', packs: [44, 'nope'] }], 'card')![0].packs).toBeUndefined()
    expect(parseTips([{ text: 'x', packs: [0] }], 'card')![0].packs).toBeUndefined()
    expect(parseTips([{ text: 'x', packs: [-3] }], 'card')![0].packs).toBeUndefined()
    expect(parseTips([{ text: 'x', packs: [1.5] }], 'card')![0].packs).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(4)
    warn.mockRestore()
  })

  it('leaves an empty list unscoped without complaining', () => {
    const [tip] = parseTips([{ text: 'x', packs: [] }], 'card')!
    expect(tip.packs).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/tips.test.ts -t "names its pull"`
Expected: FAIL — `packs` is not a property of `Tip`.

- [ ] **Step 3: Widen the type**

In `src/lib/tips.ts`, replace the `Tip` union:

```ts
/** Which pull a tip is about. Absent means the mob, wherever it stands. */
interface Scope {
  packs?: number[]
}

export type Tip =
  | ({ kind: 'text'; text: string } & Scope)
  | ({ kind: 'video'; videoId: string; start?: number; portrait: boolean; label?: string } & Scope)
  | ({ kind: 'image'; file: string; label?: string } & Scope)
```

- [ ] **Step 4: Parse it**

Add above `parseTip`:

```ts
/**
 * `packs: 44` and `packs: [44, 45]` both mean a list of pack ids.
 *
 * A single bad value unscopes the entry rather than narrowing it: a tip that badges every clone
 * is merely noisy, and noise is visible. One that badges the wrong pull is wrong and looks right.
 */
function parsePacks(raw: unknown, where: string): number[] | undefined {
  if (raw == null) return undefined
  const list = Array.isArray(raw) ? raw : [raw]
  if (!list.length) return undefined
  const packs = list.filter((g) => Number.isInteger(g) && (g as number) > 0) as number[]
  if (packs.length !== list.length) {
    console.warn(`${where}: \`packs:\` takes pack numbers, tip left unscoped`)
    return undefined
  }
  return packs
}
```

In `parseTip`, below the `label` line:

```ts
  const packs = parsePacks(entry.packs, where)
  // Spread rather than assigned, so "no packs" stays an absent key rather than an explicit
  // undefined — the same shape `label` already keeps.
  const scope = packs ? { packs } : {}
```

Then thread `...scope` through the three returns:

```ts
  if (kind === 'text') {
    if (label) console.warn(`${where}: a text tip's label is ignored, entry unaffected`)
    return { kind: 'text', text: value, ...scope }
  }

  if (kind === 'video') {
    const video = youtube(value)
    if (!video) {
      console.warn(`${where}: not a YouTube video URL: ${value}, entry ignored`)
      return null
    }
    return label
      ? { kind: 'video', ...video, label, ...scope }
      : { kind: 'video', ...video, ...scope }
  }

  if (!IMAGE_FILE.test(value)) {
    console.warn(`${where}: an image tip must be a bare filename under public/tips/: ${value}, entry ignored`)
    return null
  }
  return label
    ? { kind: 'image', file: value, label, ...scope }
    : { kind: 'image', file: value, ...scope }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/tips.test.ts`
Expected: PASS, with no stray warning printed.

- [ ] **Step 6: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/tips.ts src/lib/tips.test.ts
git commit -m "Let a tip name the pull it is about"
```

---

### Task 2: `generalTips` and `tipPacks`

**Files:**
- Modify: `src/lib/indicators.ts`
- Test: `src/lib/indicators.test.ts`
- Create: `content/__fixtures__/888020-scoped-tip.md`

**Interfaces:**
- Consumes: `Tip.packs` from Task 1.
- Produces: `MobIndicators.generalTips: boolean`, `MobIndicators.tipPacks: number[]`.

- [ ] **Step 1: Create the fixture card**

`content/__fixtures__/888020-scoped-tip.md`:

```markdown
---
npcId: 888020
name: Scoped Tip Fixture   # auto

threat: medium
role: melee
tips:
  - text: "About the mob, wherever you meet it."
  - text: "About one pull."
    packs: [44]
  - text: "About a pull that takes two groups at once."
    packs: [44, 45]
---

A fixture card, unreachable from the app. It carries a general tip and two scoped ones so the
derivation has all three cases to read.
```

- [ ] **Step 2: Write the failing tests**

Add to `src/lib/indicators.test.ts`:

```ts
describe('tip scope', () => {
  const fixture = { id: 888_020, cc: [], spells: [], clones: [] } as unknown as Enemy

  it('reports a general tip and collects every scoped pack', () => {
    const ind = getIndicators('__fixtures__', fixture)
    expect(ind.generalTips).toBe(true)
    expect([...ind.tipPacks].sort((a, b) => a - b)).toEqual([44, 45])
  })

  it('still reports hasTips, which means any tip at all', () => {
    expect(getIndicators('__fixtures__', fixture).hasTips).toBe(true)
  })

  it('reports neither for a mob with no tips', () => {
    const bare = { id: 270_306, cc: [], spells: [], clones: [] } as unknown as Enemy
    const ind = getIndicators('__fixtures__', bare)
    expect(ind.generalTips).toBe(false)
    expect(ind.tipPacks).toEqual([])
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- src/lib/indicators.test.ts -t "tip scope"`
Expected: FAIL — `generalTips` is not a property of `MobIndicators`.

- [ ] **Step 4: Add the fields**

In `interface MobIndicators`, below `hasTips`:

```ts
  /** At least one tip carries no `packs:` — it is about the mob, so every clone shows it. */
  generalTips: boolean
  /** Every pack named by a scoped tip. A clone in one of these shows the badge. */
  tipPacks: number[]
```

In `getIndicators`, in the `indicators` object, below `hasTips`:

```ts
    generalTips: (content?.tips ?? []).some((tip) => !tip.packs?.length),
    tipPacks: [...new Set((content?.tips ?? []).flatMap((tip) => tip.packs ?? []))],
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/indicators.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/indicators.ts src/lib/indicators.test.ts content/__fixtures__/888020-scoped-tip.md
git commit -m "Separate a tip that is about the mob from one that is about a pull"
```

---

### Task 3: The map badges a blip, not a mob

**Files:**
- Modify: `src/components/map/DungeonMap.tsx`
- Test: `src/components/map/DungeonMap.test.tsx`

**Interfaces:**
- Consumes: `generalTips` and `tipPacks` from Task 2.
- Produces: `BlipProps.pack: number | null`.

- [ ] **Step 1: Write the failing test**

The map's existing tips-badge tests are pinned to one dungeon. Read them first and follow their
harness. Add:

```ts
  it('badges a clone in a scoped tip\'s pack and leaves its siblings alone', () => {
    // No real card is scoped yet — the task that scopes one comes later. This pins the wiring:
    // with every tip general, every clone of a tipped mob still badges, exactly as before.
    renderEn(<DungeonMap slug={SLUG} {...mapProps} />)
    const badged = document.querySelectorAll('[data-badge="tips"]')
    expect(badged.length).toBeGreaterThan(0)
  })
```

> **Read the badge markup before writing this.** If the rendered badge carries no landmark, add
> `data-badge="tips"` to it — the same kind of hook as `data-clone` on a blip and `data-pull` on a
> pull outline, both added for exactly this reason. Do not select on a class or on element order.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/map/DungeonMap.test.tsx -t "scoped tip"`
Expected: FAIL — no element carries `data-badge`.

- [ ] **Step 3: Pass the pack down**

In `interface BlipProps`, below `cloneId`:

```ts
  /** The clone's pack, so a tip scoped to one pull badges only the blips standing in it. */
  pack: number | null
```

Add `pack,` to the destructured parameter list of `Blip`.

At the call site, beside `inActivePack` — which already reads `clone.g` — add:

```tsx
                  pack={clone.g}
```

- [ ] **Step 4: Narrow the badge condition**

In `Blip`, replace the tips badge line:

```ts
  // A general tip is about the mob and shows on every clone; a scoped one shows only where its
  // pull is. `hasTips` deliberately stays the card's question, not the map's.
  if (ind.generalTips || (pack != null && ind.tipPacks.includes(pack)))
    badges.push({ color: '#e0b552', glyph: '?', title: t('map.badgeTips') })
```

- [ ] **Step 5: Give the badge a landmark**

Wherever the badge is rendered from `placements`, add `data-badge` carrying the glyph's meaning, so
a test can ask for tips badges by name rather than by position.

- [ ] **Step 6: Run the tests**

Run: `npm test -- src/components/map/`
Expected: PASS. No card is scoped yet, so every existing badge assertion holds unchanged.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck
git add src/components/map/
git commit -m "Ask a blip whether the tip is about where it stands"
```

---

### Task 4: The chip that says which pull

**Files:**
- Modify: `src/components/codex/MobTips.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`
- Test: `src/components/codex/MobTips.test.tsx`

**Interfaces:**
- Consumes: `Tip.packs` from Task 1.
- Produces: nothing other tasks read.

- [ ] **Step 1: Write the failing tests**

Add to `src/components/codex/MobTips.test.tsx`:

```ts
  it('names the pull a scoped tip is about', () => {
    renderEn(
      <MobTips slug="__fixtures__" npcId={1} fallback={false} tips={[{ kind: 'text', text: 'x', packs: [44] }]} />,
    )
    expect(screen.getByText('Pack 44')).toBeTruthy()
  })

  it('joins a combined pull with a plus, so it reads as one pull of two groups', () => {
    renderEn(
      <MobTips slug="__fixtures__" npcId={1} fallback={false} tips={[{ kind: 'text', text: 'x', packs: [44, 45] }]} />,
    )
    expect(screen.getByText('Packs 44 + 45')).toBeTruthy()
  })

  it('says nothing about a pull for a general tip', () => {
    renderEn(
      <MobTips slug="__fixtures__" npcId={1} fallback={false} tips={[{ kind: 'text', text: 'x' }]} />,
    )
    expect(screen.queryByText(/^Pack/)).toBeNull()
  })
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -- src/components/codex/MobTips.test.tsx -t "pull"`
Expected: FAIL — no such text in the document.

- [ ] **Step 3: Render the chip**

In `src/components/codex/MobTips.tsx`, inside the `<li key={i}>`, above the three kind branches:

```tsx
            {tip.packs?.length && <PackChip packs={tip.packs} />}
```

and at the bottom of the file:

```tsx
/**
 * Which pull a tip is about.
 *
 * It sits on the row rather than in the section heading because one card's tips can be about
 * different pulls — a mob standing in eleven packs can earn a sentence about two of them.
 */
function PackChip({ packs }: { packs: number[] }) {
  const { t } = useI18n()
  return (
    <span className="mb-1 inline-block rounded border border-ink-600 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink-400">
      {packs.length === 1 ? t('tip.pack', { g: packs[0] }) : t('tip.packs', { list: packs.join(' + ') })}
    </span>
  )
}
```

> `tip.packs?.length && …` renders `0` when the array is empty. It cannot be empty — `parsePacks`
> returns `undefined` rather than `[]` — but write the guard as
> `{tip.packs?.length ? <PackChip packs={tip.packs} /> : null}` so the component does not depend on
> that promise being kept elsewhere.

- [ ] **Step 4: Add the strings**

`src/lib/i18n/en.ts`, beside the other `tip.*` keys:

```ts
  'tip.pack': 'Pack {g}',
  'tip.packs': 'Packs {list}',
```

`src/lib/i18n/fr.ts`:

```ts
  'tip.pack': 'Pack {g}',
  'tip.packs': 'Packs {list}',
```

> Check how `t()` interpolates before writing these — `t('map.pack', { g: pack.g, n: pack.count })`
> in `DungeonMap.tsx` is the existing call to copy the placeholder syntax from.

- [ ] **Step 5: Run the tests**

Run: `npm test -- src/components/codex/`
Expected: PASS.

- [ ] **Step 6: Typecheck and commit**

```bash
npm run typecheck
git add src/components/codex/MobTips.tsx src/components/codex/MobTips.test.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit -m "Say on the row which pull a tip is about"
```

---

### Task 5: Scope the real card, and guard what the parser cannot

**Files:**
- Modify: `content/the-blinding-vale/254850-sporeblight-belcher.md`
- Modify: `content/the-blinding-vale/254850-sporeblight-belcher.fr.md`
- Modify: `src/lib/content.integrity.test.ts`
- Test: `src/components/map/DungeonMap.test.tsx` (may need updating — see Step 5)

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: content and assertions only.

- [ ] **Step 1: Write the failing integrity tests**

In `src/lib/content.integrity.test.ts`:

```ts
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
  it('finds at least one card declaring one, so this test is not vacuous', () => {
    expect(cards().flatMap(([, file]) => declaredPacks(file)).length).toBeGreaterThan(0)
  })

  /**
   * `__fixtures__` is no dungeon in the pool, so there is no pack list to check its cards
   * against. Skipping it is the honest answer: the test cannot verify what it cannot load.
   */
  const real = () => cards().filter(([slug]) => getLookup(slug) !== undefined)

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
```

Add `getLookup` to the imports: `import { getLookup } from './data'`.

> Confirm `DungeonLookup.packs` is a `Map` keyed by `g` before writing `packs.keys()` — read
> `src/lib/data.ts` rather than trusting this snippet. If it is a different shape, derive the pack
> ids from `dungeon.enemies` clones instead and say so in the task report.

- [ ] **Step 2: Run to verify the vacuity test fails**

Run: `npm test -- src/lib/content.integrity.test.ts -t "not vacuous"`
Expected: FAIL — no card declares a pack yet.

- [ ] **Step 3: Scope the card**

In `content/the-blinding-vale/254850-sporeblight-belcher.md`, add `packs: [44]` to the video tip:

```yaml
tips:
  - video: https://youtu.be/9D0gCU8Tp5Y?t=123
    label: "Naowh — taking the pull after the first boss"
    packs: [44]
```

> Read the file first — the existing `video:` URL and `label:` are what they are, and only the
> `packs:` line is being added. Pack 44 holds one Sporeblight Belcher, one Lightgorged Lasher and
> two Underbrush Stalkers.

- [ ] **Step 4: Scope the translation identically**

In `content/the-blinding-vale/254850-sporeblight-belcher.fr.md`, add the same `packs: [44]` to the
tip it restates. This is not optional: the whole-list merge means the French card's tips replace the
base list entirely, so omitting it would give French readers eleven badges.

- [ ] **Step 5: Run the whole suite and repair what moves**

Run: `npm test`

The Blinding Vale now has **one** tips badge where it had eleven. Any existing `DungeonMap` test
that counted or located a tips badge in that dungeon may now fail. That is the change working, not a
regression: update the assertion to the new truth, and say in the task report which tests moved and
what they now assert.

- [ ] **Step 6: Commit**

```bash
git add content/the-blinding-vale/ src/lib/content.integrity.test.ts src/components/map/
git commit -m "Point the belcher's tip at the pull it is actually about"
```

---

### Task 6: The guides, the skills, and the end-to-end proof

**Files:**
- Modify: `CONTRIBUTING.md`, `CONTRIBUTING.fr.md` — **same commit, both or neither**
- Modify: `.claude/skills/codex-content/SKILL.md`
- Modify: `.claude/skills/mdt-update/SKILL.md`
- Test: `e2e/tips.spec.ts`

**Interfaces:**
- Consumes: the finished behaviour from Tasks 1–5.
- Produces: nothing code reads.

- [ ] **Step 1: Write the end-to-end scenario**

In `e2e/tips.spec.ts`, following the shape of the map-badge scenario already there:

```ts
test('marks one blip for a tip about one pull, not every clone of the mob', async ({ page }) => {
  await page.goto(dungeonUrl('the-blinding-vale'))
  // Sporeblight Belcher stands in eleven packs; its only tip is about pack 44.
  await expect(page.locator('[data-badge="tips"]')).toHaveCount(1)
})
```

> Confirm the count against the real page before settling on `1`: if another Blinding Vale card
> gains a tip later this becomes brittle. If the dungeon already has other tipped mobs, scope the
> locator to the belcher's clones instead and say so in the report.

- [ ] **Step 2: Run it and watch it fail on the unscoped build**

Run: `git stash && npm run test:e2e -- --grep "one pull"; git stash pop`
Expected: FAIL with eleven badges. This is what proves the scenario is not vacuous — do not skip it.

- [ ] **Step 3: Run it against the branch**

Run: `npm run test:e2e -- --grep "one pull"`
Expected: PASS.

- [ ] **Step 4: Document the key in `CONTRIBUTING.md`**

In the "Add a tip" section, after the existing keys:

```markdown
### Say which pull a tip is about

A tip with no `packs:` is about the mob, wherever you meet it, and the map marks every one of its
blips. Most tips are like that. But a tip about *one pull* — where to stand, what to pull it with,
which corner to fight it in — should say so:

```yaml
tips:
  - text: "Pull it into the corridor — the frontal has nowhere to reach the healer."
    packs: [44]
```

`packs:` takes the numbers the map's tooltip shows when you hover a mob. Name several when the pull
takes several groups at once: `packs: [44, 45]`. The map then marks only the blips standing in those
groups, and the card says which pull the tip is about.

**A `.fr.md` that restates `tips:` must restate `packs:` too.** The translated list replaces the
base list whole, so a missing `packs:` there means French readers see the badge on every blip while
English readers see it on one. A test checks this.
```

- [ ] **Step 5: Make the same addition in `CONTRIBUTING.fr.md`**

Translate; do not transliterate. Keep the placeholder style that file already uses.

- [ ] **Step 6: Add the judgement to the codex-content skill**

In `.claude/skills/codex-content/SKILL.md`, beside the existing guidance on tips:

```markdown
**Scope a tip when it is about a pull.** "This frontal is wide" is about the mob and belongs
unscoped. "Take this one after the first boss, from the left" is about one group of mobs standing in
one place, and without `packs:` it marks every clone of that mob in the dungeon — eleven of them, in
the case this key was written for. If you cannot name the pack, the tip is probably general.
```

- [ ] **Step 7: Record the maintenance cost in the mdt-update skill**

In `.claude/skills/mdt-update/SKILL.md`, under "The traps":

```markdown
- **A scoped tip's `packs:` is a pack id, and nothing promises those are stable.** `mdtIdx` is
  never renumbered, but `g` carries no such rule — `mdt-diff` reports pack changes precisely
  because they happen. After an update that names a pack finding, re-read every card with a
  `packs:` key: a tip pointing at a renumbered pack is wrong and looks entirely correct.
  `grep -rl 'packs:' content/` is the list.
```

- [ ] **Step 8: Run everything, then commit**

```bash
npm test
npm run test:e2e
git add CONTRIBUTING.md CONTRIBUTING.fr.md .claude/skills/ e2e/
git commit -m "Tell contributors how to scope a tip, in both languages"
```

---

## Self-Review

**Spec coverage:**

| Design decision | Task |
| --- | --- |
| 1 — `packs:` takes a list, scalar normalised | 1 |
| 2 — pack ids, and their maintenance cost | 5 (the content), 6 (the mdt-update note) |
| 3 — parser checks shape, test checks existence | 1 (shape), 5 (existence) |
| 4 — exists, and holds the mob at least once | 5 |
| 5 — the map badges a blip | 3 |
| 6 — the card and Overview name the pull | 4 |
| 7 — the translation must restate the packs | 5 (the test), 6 (the guides) |

**Three places the plan tells the implementer to check rather than trust:**

- The badge's markup, before writing a `data-badge` selector (Task 3). The repo's precedent is to
  add a landmark rather than select on class or order, but the existing element may already carry
  one.
- `DungeonLookup.packs`'s shape, before calling `.keys()` on it (Task 5).
- `t()`'s placeholder syntax, before writing `'Pack {g}'` (Task 4). `DungeonMap.tsx` has a working
  call to copy.

These are written as instructions, not assumptions, because getting them wrong would produce a test
that passes for the wrong reason.

**Type consistency:** `Tip.packs` is defined in Task 1 and read in 2, 3 and 4. `MobIndicators
.generalTips` / `.tipPacks` are defined in Task 2 and read in 3. `BlipProps.pack` is defined in
Task 3 and passed at its only call site there. `hasTips` keeps its existing meaning throughout and
is not repurposed.

**One thing that will need judgement at execution time:** Task 5 changes the Blinding Vale from
eleven tips badges to one, and any existing map test that counted them will fail. The plan says to
update the assertion rather than preserve the old count, because the old count was the bug.
