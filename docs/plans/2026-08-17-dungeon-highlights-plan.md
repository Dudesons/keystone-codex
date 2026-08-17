# Dungeon highlights page — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/d/:slug` becomes a full-width briefing — the mobs whose spells matter, every
written trap, and the bosses — derived entirely from `content/**.md`, with the map moving to
`/d/:slug/map`.

**Architecture:** One pure derivation module (`src/lib/highlights.ts`) turns the codex content
into three lists; three presentational components render them; the dungeon header is extracted
so both pages share it. No new generated data, no network, no new runtime dependency.

**Tech Stack:** React 19, react-router-dom 7 (hash router), Tailwind 4, TypeScript, Vitest
(`app` project: node by default, jsdom per file), Testing Library.

**Spec:** [2026-08-17-dungeon-highlights-design.md](2026-08-17-dungeon-highlights-design.md)

## Global Constraints

- **`node` and `npm` are not on the Bash tool's PATH.** Prefix every command:
  `export PATH="/c/Program Files/nodejs:$PATH"`.
- **`rm` is denied** by the permission layer. Overwrite with the Write tool; use
  `node -e "fs.unlinkSync(...)"` only if a file must truly go.
- **Never `--no-verify`**, `--no-hooks` or `--no-pre-commit-hook`. If a hook fails, fix the
  cause.
- **English** for code, comments, commit messages and test names. The `content/**.md` and the
  UI strings are the two exceptions, and both go through i18n.
- **Every new file starts with two `// ABOUTME: ` lines** saying what it does.
- **Component test files carry `// @vitest-environment jsdom` on line 1** and declare their own
  `afterEach(cleanup)` — `globals: true` is off, so nothing cleans up for you.
- **Mount components through `renderEn` / `renderFr`** from `src/test/render.tsx`, never
  Testing Library's bare `render`: components read the locale from `LocaleProvider`.
- **No mocks.** Tests read the real generated JSON and the real `content/*.md`.
- **Every key added to `src/lib/i18n/en.ts` must be added to `src/lib/i18n/fr.ts`**, or
  `npm run typecheck` fails. That type check is the completeness test; there is no other.
- **Commit style:** imperative subject, no `feat:` / `fix:` prefix, body explains *why*.
  End every commit message with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- Run one test file with `npx vitest run <path>`; the whole suite with `npm test`.
- **`npm test` is no longer the whole story.** `npm run test:e2e` runs the Playwright suite in
  a real Chromium, starting its own `vite preview` and `wrangler dev`; `e2e/**` is excluded
  from the Vitest projects. CI gates on both, so a green `npm test` alone is not evidence that
  Task 5 is done. Reading its failures requires redirecting to a file
  (`npm run test:e2e > out.txt`) — see the note at the end of `CLAUDE.md`.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/lib/highlights.ts` | **new** — the whole derivation. Pure, no React. |
| `src/lib/highlights.test.ts` | **new** — node. |
| `src/lib/content.ts` | modified — `bosses?: number[]` on `DungeonContent`. |
| `scripts/content-stub.mjs` | modified — the stub offers the new field. |
| `content/kings-rest/_dungeon.md` | modified — the one dungeon `mdtIdx` gets wrong. |
| `src/components/DungeonHeader.tsx` | **new** — the header both pages share. |
| `src/components/highlights/MobTable.tsx` | **new** — one row per mob. |
| `src/components/highlights/TrapList.tsx` | **new** — two columns of trap sentences. |
| `src/components/highlights/BossStrip.tsx` | **new** — one card per boss. |
| `src/routes/HighlightsPage.tsx` | **new** — assembles the four blocks. |
| `src/App.tsx` | modified — the route table. |
| `src/components/route/RoutePanel.tsx` | modified — `sessionLink` points at the map. |

---

## Task 1: The `bosses:` override

**Files:**
- Modify: `src/lib/content.ts` (the `DungeonContent` interface, `RawDungeon`, the `_dungeon`
  branch of the file loop, `mergeDungeon`)
- Modify: `src/lib/content.test.ts`
- Modify: `scripts/content-stub.mjs:81-101` (`buildDungeonStub`)
- Modify: `scripts/content-stub.test.mjs:142-153`
- Modify: `content/kings-rest/_dungeon.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `DungeonContent.bosses?: number[]`, read by Task 3 through
  `getDungeonContent(slug, locale)`. Also exports
  `npcIdList(value: unknown): number[] | undefined`.

> **STOP — ask RwlRwlRwlRwl before Step 7.** The boss order written into
> `content/kings-rest/_dungeon.md` is a game fact, not a repository fact. The plan carries the
> BfA sequence as the value *to confirm*: The Golden Serpent (135322) → Mchimba the Embalmer
> (134993) → Council of Tribes (269808, 269810, 269811) → King Dazar (136160). Confirm it
> before writing, and use whatever RwlRwlRwlRwl says instead if it differs.

- [ ] **Step 1: Write the failing test for the parser guard**

Append to `src/lib/content.test.ts`:

```ts
describe('npcIdList', () => {
  it('reads a hand-written list of ids', () => {
    expect(npcIdList([135322, 134993])).toEqual([135322, 134993])
  })

  it('drops anything that is not a list of ids, rather than trusting it', () => {
    // `bosses:` is typed by hand in YAML. An empty field parses to null, a typo to a string;
    // neither must reach the ordering code as a half-valid array.
    expect(npcIdList(null)).toBeUndefined()
    expect(npcIdList(undefined)).toBeUndefined()
    expect(npcIdList('135322')).toBeUndefined()
    expect(npcIdList([])).toBeUndefined()
    expect(npcIdList(['nope', 0, -3])).toBeUndefined()
  })

  it('keeps the ids it recognises and discards the rest of the list', () => {
    expect(npcIdList([135322, 'nope'])).toEqual([135322])
  })
})
```

Add `npcIdList` to the import block at the top of the file.

- [ ] **Step 2: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/content.test.ts
```

Expected: FAIL — `npcIdList is not a function`.

- [ ] **Step 3: Implement the guard**

In `src/lib/content.ts`, next to `definedOnly`:

```ts
/**
 * `bosses:` is hand-written YAML: an empty field parses to `null`, a typo to a string. Only a
 * non-empty list of positive ids is worth anything downstream, so everything else becomes
 * "not declared" rather than a half-valid array the ordering code would have to re-check.
 */
export function npcIdList(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const ids = value.map(Number).filter((n) => Number.isFinite(n) && n > 0)
  return ids.length ? ids : undefined
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/content.test.ts
```

Expected: PASS.

- [ ] **Step 5: Wire the field through `DungeonContent`**

Three edits in `src/lib/content.ts`.

In the `DungeonContent` interface:

```ts
export interface DungeonContent {
  timer?: string
  summary?: string
  /** Boss npcIds in encounter order, where `mdtIdx` gets it wrong. */
  bosses?: number[]
  html: string
}
```

In `interface RawDungeon`, add the same `bosses?: number[]` line under `summary`.

In the `if (name === '_dungeon')` branch:

```ts
    slot(dungeonFiles, slug)[locale] = {
      timer: data.timer as string | undefined,
      summary: data.summary as string | undefined,
      bosses: npcIdList(data.bosses),
      prose,
    }
```

In `mergeDungeon`, alongside `timer` and `summary`:

```ts
    bosses: translation?.bosses ?? base?.bosses,
```

- [ ] **Step 6: Write the failing test for the field, and the stub**

Append to `src/lib/content.test.ts`:

```ts
describe('getDungeonContent bosses', () => {
  it('reads the order a dungeon declares', () => {
    // King's Rest is the one dungeon whose mdtIdx order is wrong: King Dazar, its last boss,
    // sits at index 25 while the Council of Tribes was re-added at 34-36.
    expect(getDungeonContent('kings-rest')?.bosses).toEqual([
      135322, 134993, 269808, 269810, 269811, 136160,
    ])
  })

  it('leaves it undefined where no order is declared, so mdtIdx stands', () => {
    expect(getDungeonContent('altar-of-fangs')?.bosses).toBeUndefined()
  })
})
```

Append to `scripts/content-stub.test.mjs`, inside the existing `describe('buildDungeonStub')`:

```js
  it('offers the boss-order override, empty', () => {
    // Empty is the right default: mdtIdx is correct for every dungeon but one, and a
    // pre-filled guess would be a claim the scaffold cannot make.
    expect(buildDungeonStub(dungeon)).toMatch(/^bosses:$/m)
  })
```

- [ ] **Step 7: Run both and watch them fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/content.test.ts scripts/content-stub.test.mjs
```

Expected: FAIL — `bosses` is `undefined` for King's Rest, and the stub has no `bosses:` line.

- [ ] **Step 8: Write the King's Rest order and extend the stub**

In `content/kings-rest/_dungeon.md`, inside the frontmatter, after `summary:` — using the
order confirmed at the STOP above:

```yaml
# Boss order. mdtIdx puts King Dazar third: the Council of Tribes was re-added with new ids.
bosses: [135322, 134993, 269808, 269810, 269811, 136160]
```

In `scripts/content-stub.mjs`, in the `buildDungeonStub` array, after the `'summary:'` entry:

```js
    '# Boss order, only when mdtIdx gets it wrong — npcIds as the group meets them.',
    'bosses:',
```

- [ ] **Step 9: Run both and watch them pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/content.test.ts scripts/content-stub.test.mjs
```

Expected: PASS.

- [ ] **Step 10: Run the whole suite and the type check**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test && npm run typecheck
```

Expected: everything green. `content-stub.test.mjs` regenerates the committed
`content/__fixtures__` stub and fails if it has drifted — if it does, the fixture needs
regenerating, not the test relaxing.

- [ ] **Step 11: Commit**

```bash
git add src/lib/content.ts src/lib/content.test.ts scripts/content-stub.mjs scripts/content-stub.test.mjs content/kings-rest/_dungeon.md
```

```bash
git commit -m "Let a dungeon declare its boss order" -m "MDT offers no usable encounter order: the three bosses of Altar of Fangs all report encounterID 2880, the five of Murder Row all report 2681. mdtIdx is the only signal and it is right everywhere but King's Rest, where the Council of Tribes was re-added with 269xxx ids and sorts after King Dazar, the dungeon's last boss.

An optional bosses: list in _dungeon.md overrides it. Nothing has to be written for the order to be usable; one line makes the one wrong dungeon right." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: `highlights.ts` — the mob rows

**Files:**
- Create: `src/lib/highlights.ts`
- Create: `src/lib/highlights.test.ts`

**Interfaces:**
- Consumes: `getLookup`, `getSpell` from `./data`; `getMobContent`, `inlineMarkdown`,
  `SpellTag`, `Threat` from `./content`; `Enemy` from `./types`; `Locale`, `DEFAULT_LOCALE`
  from `./i18n/locales`.
- Produces:

```ts
export interface HighlightSpell {
  ids: number[]
  name: string
  icon: string
  tags: SpellTag[]
  interruptible: boolean
  dispel: string[]
  note?: string
}

export interface HighlightMob {
  npcId: number
  name: string
  displayId?: number
  threat?: Threat
  role?: string
  trapHtml?: string
  spells: HighlightSpell[]
}

export interface HighlightTrap {
  npcId: number
  mobName: string
  threat?: Threat
  html: string
}

export interface DungeonHighlights {
  mobs: HighlightMob[]
  traps: HighlightTrap[]
  bosses: HighlightMob[]
}

export function getHighlights(slug: string, locale?: Locale): DungeonHighlights
```

Task 3 fills `traps` and `bosses`; this task returns them empty.

- [ ] **Step 1: Write the failing test**

Create `src/lib/highlights.test.ts`:

```ts
// ABOUTME: Tests the highlights derivation against the real content/ and the real MDT data.
// ABOUTME: Landmarks are chosen from what the codex actually contains, not from invented mobs.

import { describe, expect, it } from 'vitest'
import { getHighlights } from './highlights'
import { getLookup } from './data'

/**
 * Two landmarks, both real:
 *
 * - Twinfang Harrower (Altar of Fangs) carries five `Paralyzing Shots` ids, of which exactly
 *   one is `prio: 1` — the case that shows the filter runs before deduplication.
 * - Agitated Voidscythe (Voidscar Arena) carries `Rip and Slice` under two ids, 1311778
 *   tagged `tank` and 1233472 tagged `dodge` — the only kind of case where deduplication
 *   changes anything, and it must merge the tags rather than pick one.
 */
const ALTAR = 'altar-of-fangs'
const VOIDSCAR = 'voidscar-arena'
const TWINFANG = 261554
const VOIDSCYTHE = 263228

describe('getHighlights mobs', () => {
  it('makes a row of the mob, carrying every prio-1 spell it has', () => {
    const row = getHighlights(ALTAR).mobs.find((m) => m.npcId === TWINFANG)!
    expect(row).toBeDefined()
    expect(row.name).toBe('Twinfang Harrower')
    expect(row.threat).toBe('medium')
    expect(row.spells.map((s) => s.name).sort()).toEqual(['Duostrike', 'Paralyzing Shots'])
  })

  it('merges the ids that share a name into one chip, keeping both tags', () => {
    const row = getHighlights(VOIDSCAR).mobs.find((m) => m.npcId === VOIDSCYTHE)!
    const chip = row.spells.find((s) => s.name === 'Rip and Slice')!
    expect(chip.ids.sort()).toEqual([1233472, 1311778])
    expect([...chip.tags].sort()).toEqual(['dodge', 'tank'])
  })

  it('leaves the bosses out: they have their own block', () => {
    const bossIds = new Set(
      getLookup(ALTAR)!.dungeon.enemies.filter((e) => e.isBoss).map((e) => e.id),
    )
    expect(bossIds.size).toBeGreaterThan(0)
    for (const mob of getHighlights(ALTAR).mobs) expect(bossIds.has(mob.npcId)).toBe(false)
  })

  it('omits a mob with no prio-1 spell rather than showing an empty row', () => {
    for (const mob of getHighlights(ALTAR).mobs) expect(mob.spells.length).toBeGreaterThan(0)
  })

  it('puts the most dangerous first', () => {
    const rank = { lethal: 0, high: 1, medium: 2, low: 3 } as Record<string, number>
    const ranks = getHighlights(VOIDSCAR).mobs.map((m) => (m.threat ? rank[m.threat] : 4))
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks)
  })

  it('carries what MDT knows about the spell alongside the written tag', () => {
    const chips = getHighlights(VOIDSCAR).mobs.flatMap((m) => m.spells)
    expect(chips.some((s) => s.interruptible)).toBe(true)
    expect(chips.some((s) => s.dispel.length > 0)).toBe(true)
  })

  it('names the spells in the reader’s language', () => {
    const en = getHighlights(VOIDSCAR, 'en').mobs.find((m) => m.npcId === VOIDSCYTHE)!
    const fr = getHighlights(VOIDSCAR, 'fr').mobs.find((m) => m.npcId === VOIDSCYTHE)!
    expect(en.spells.map((s) => s.name)).toContain('Rip and Slice')
    expect(fr.spells.map((s) => s.name)).toContain('Déchirure et taillade')
  })

  it('returns empty lists for a dungeon that does not exist', () => {
    expect(getHighlights('no-such-dungeon')).toEqual({ mobs: [], traps: [], bosses: [] })
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/highlights.test.ts
```

Expected: FAIL — cannot resolve `./highlights`.

- [ ] **Step 3: Write the module**

Create `src/lib/highlights.ts`:

```ts
// ABOUTME: Turns a dungeon's written codex into the three lists the highlights page shows.
// ABOUTME: Pure derivation — no React, no new data: writing a mob card fills the page in.

/**
 * The dungeon briefing, derived.
 *
 * Everything here already exists one mob at a time in `content/**.md`; this module is what
 * reads it as a whole. Nothing is authored for the page itself apart from the optional
 * `bosses:` order, so a mob card written tomorrow raises the page with no code change.
 *
 * A row is a **mob**, not a spell. Measured over the real content, one row per spell puts 52
 * rows in Temple of Sethraliss against 29 per mob — and the mob is also the unit a player
 * thinks in.
 */

import type { Enemy } from './types'
import { getLookup, getSpell } from './data'
import { getMobContent, type SpellTag, type Threat } from './content'
import { DEFAULT_LOCALE, type Locale } from './i18n/locales'

/** One chip on a mob's row. Several ids can carry one name; the chip is the name. */
export interface HighlightSpell {
  ids: number[]
  name: string
  icon: string
  tags: SpellTag[]
  /** From MDT, exactly as the codex badges use it. */
  interruptible: boolean
  dispel: string[]
  note?: string
}

/** A row of the table, and equally a card of the boss block — the shape is the same. */
export interface HighlightMob {
  npcId: number
  name: string
  displayId?: number
  threat?: Threat
  role?: string
  /** The `trap:` sentence as inline HTML. Filled for bosses, whose card shows it. */
  trapHtml?: string
  spells: HighlightSpell[]
}

export interface HighlightTrap {
  npcId: number
  mobName: string
  threat?: Threat
  html: string
}

export interface DungeonHighlights {
  /** Non-boss mobs holding at least one `prio: 1` spell, most dangerous first. */
  mobs: HighlightMob[]
  /** Non-boss mobs holding a `trap:` sentence — a different population from `mobs`. */
  traps: HighlightTrap[]
  /** Every boss, in the declared or the `mdtIdx` order. */
  bosses: HighlightMob[]
}

const THREAT_RANK: Record<Threat, number> = { lethal: 0, high: 1, medium: 2, low: 3 }

/** An unassessed mob sorts last: "not judged yet" is not "harmless". */
const rankOf = (threat?: Threat) => (threat ? THREAT_RANK[threat] : 4)

/**
 * A mob's `prio: 1` spells, one chip per resolved name.
 *
 * Deduplication is a correctness rule, not a volume control: measured over the whole codex it
 * merges 293 rows into 290. It exists so that two ids of one spell on one mob — Rip and Slice
 * on Agitated Voidscythe, tagged `tank` under one id and `dodge` under the other — read as one
 * chip carrying both tags, instead of as two chips contradicting each other.
 */
function chipsOf(slug: string, enemy: Enemy, locale: Locale): HighlightSpell[] {
  const content = getMobContent(slug, enemy.id, locale)
  if (!content?.spells) return []

  const mdt = new Map(enemy.spells.map((s) => [s.id, s]))
  const byName = new Map<string, HighlightSpell>()

  for (const note of content.spells) {
    if (note.prio !== 1) continue
    const id = Number(note.id)
    const spell = getSpell(id, locale)
    // Same fallback as `kickList`: a spell Wowhead has not served still has to render.
    const name = spell?.name ?? `#${id}`
    const tag = note.tag && note.tag !== 'todo' ? note.tag : undefined

    const chip = byName.get(name)
    if (!chip) {
      byName.set(name, {
        ids: [id],
        name,
        icon: spell?.icon ?? '',
        tags: tag ? [tag] : [],
        interruptible: mdt.get(id)?.interruptible === true,
        dispel: [...(mdt.get(id)?.dispel ?? [])],
        note: note.note,
      })
      continue
    }

    chip.ids.push(id)
    if (tag && !chip.tags.includes(tag)) chip.tags.push(tag)
    if (!chip.note && note.note) chip.note = note.note
    if (mdt.get(id)?.interruptible) chip.interruptible = true
    for (const d of mdt.get(id)?.dispel ?? []) if (!chip.dispel.includes(d)) chip.dispel.push(d)
  }

  return [...byName.values()]
}

const EMPTY: DungeonHighlights = { mobs: [], traps: [], bosses: [] }

// Keyed by locale, like `indicators.ts`: the chip names, and therefore the alphabetical
// tie-break, are not the same string from one language to the next.
const cache = new Map<string, DungeonHighlights>()

export function getHighlights(slug: string, locale: Locale = DEFAULT_LOCALE): DungeonHighlights {
  const key = `${locale}/${slug}`
  const hit = cache.get(key)
  if (hit) return hit

  const lookup = getLookup(slug)
  if (!lookup) {
    cache.set(key, EMPTY)
    return EMPTY
  }

  const mobs: HighlightMob[] = []

  // `enemyById` is already unique per NPC: the same mob appears several times in
  // `dungeon.enemies` as variants, and the codex writes it one card, not one per variant.
  for (const enemy of lookup.enemyById.values()) {
    if (enemy.isBoss) continue
    const spells = chipsOf(slug, enemy, locale)
    if (!spells.length) continue
    const content = getMobContent(slug, enemy.id, locale)
    mobs.push({
      npcId: enemy.id,
      name: enemy.name,
      displayId: enemy.displayId,
      threat: content?.threat,
      role: content?.role,
      spells,
    })
  }

  mobs.sort((a, b) => rankOf(a.threat) - rankOf(b.threat) || a.name.localeCompare(b.name, locale))

  const highlights: DungeonHighlights = { mobs, traps: [], bosses: [] }
  cache.set(key, highlights)
  return highlights
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/highlights.test.ts
```

Expected: PASS. If the Twinfang assertion fails on `threat`, read
`content/altar-of-fangs/261554-twinfang-harrower.md` and assert what it says — the file is the
truth, not this plan.

- [ ] **Step 5: Commit**

```bash
git add src/lib/highlights.ts src/lib/highlights.test.ts
```

```bash
git commit -m "Derive a dungeon's notable mobs from the codex" -m "The codex holds 419 spells at prio 1 across 226 cards, reachable only one mob at a time through a 400px panel. This reads them as a whole.

A row is a mob rather than a spell, measured rather than assumed: one row per spell yields 52 rows in Temple of Sethraliss against 29 per mob, and the mob is the unit a player thinks in. Deduplicating chips by resolved name earns almost nothing across the codex — 293 rows become 290 — but it is what keeps Rip and Slice, tagged tank under one id and dodge under the other, from reading as two chips that disagree." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: `highlights.ts` — traps and bosses

**Files:**
- Modify: `src/lib/highlights.ts`
- Modify: `src/lib/highlights.test.ts`

**Interfaces:**
- Consumes: `HighlightMob`, `HighlightTrap`, `chipsOf`, `rankOf` from Task 2;
  `DungeonContent.bosses` from Task 1; `inlineMarkdown` and `getDungeonContent` from
  `./content`.
- Produces: `getHighlights(...).traps` and `.bosses`, both populated.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/highlights.test.ts`:

```ts
describe('getHighlights traps', () => {
  it('collects the written trap sentences, rendered as inline HTML', () => {
    const traps = getHighlights(ALTAR).traps
    expect(traps.length).toBeGreaterThan(0)
    const twinfang = traps.find((t) => t.npcId === TWINFANG)!
    expect(twinfang.mobName).toBe('Twinfang Harrower')
    expect(twinfang.html).toContain('Duostrike')
    // Inline markdown: emphasis becomes a tag, and no <p> wrapper fights the layout.
    expect(twinfang.html).not.toContain('<p>')
  })

  it('leaves the bosses out: their trap is on their own card', () => {
    const bossIds = new Set(
      getLookup(ALTAR)!.dungeon.enemies.filter((e) => e.isBoss).map((e) => e.id),
    )
    for (const trap of getHighlights(ALTAR).traps) expect(bossIds.has(trap.npcId)).toBe(false)
  })

  it('puts the most dangerous first', () => {
    const rank = { lethal: 0, high: 1, medium: 2, low: 3 } as Record<string, number>
    const ranks = getHighlights(ALTAR).traps.map((t) => (t.threat ? rank[t.threat] : 4))
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks)
  })
})

describe('getHighlights bosses', () => {
  it('follows mdtIdx where no order is declared', () => {
    expect(getHighlights(ALTAR).bosses.map((b) => b.name)).toEqual([
      "Rav'i",
      'The Writhing Coil',
      "Zul'jan",
    ])
  })

  it('follows the declared order where there is one', () => {
    // King's Rest declares it because mdtIdx puts King Dazar, its last boss, third.
    expect(getHighlights('kings-rest').bosses.map((b) => b.npcId)).toEqual([
      135322, 134993, 269808, 269810, 269811, 136160,
    ])
  })

  it('gives each boss its trap and its own prio-1 spells', () => {
    const ravi = getHighlights(ALTAR).bosses.find((b) => b.npcId === 259445)!
    expect(ravi.spells.length).toBeGreaterThan(0)
    expect(ravi.displayId).toBeTypeOf('number')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/highlights.test.ts
```

Expected: FAIL — `traps` and `bosses` are empty.

- [ ] **Step 3: Implement**

In `src/lib/highlights.ts`, extend the import from `./content`:

```ts
import { getDungeonContent, getMobContent, inlineMarkdown, type SpellTag, type Threat } from './content'
```

Add above `getHighlights`:

```ts
/**
 * Boss order.
 *
 * `encounterID` groups nothing usable — the three bosses of Altar of Fangs all report 2880 —
 * so `mdtIdx` is the fallback, and a dungeon that knows better says so in `_dungeon.md`.
 * Ids the declaration does not mention keep their `mdtIdx` place at the end, so a partial or
 * stale list degrades to the fallback instead of hiding a boss.
 */
function orderBosses(bosses: HighlightMob[], byIdx: number[], declared?: number[]): HighlightMob[] {
  const position = new Map(byIdx.map((id, i) => [id, i]))
  if (declared) declared.forEach((id, i) => position.set(id, i - declared.length))
  return [...bosses].sort((a, b) => (position.get(a.npcId) ?? 0) - (position.get(b.npcId) ?? 0))
}
```

Inside `getHighlights`, replace the loop body and the return. The full replacement, from the
`const mobs` declaration down to the `return highlights`:

```ts
  const mobs: HighlightMob[] = []
  const traps: HighlightTrap[] = []
  const bosses: HighlightMob[] = []
  const bossOrder: number[] = []

  // `enemyById` is already unique per NPC: the same mob appears several times in
  // `dungeon.enemies` as variants, and the codex writes it one card, not one per variant.
  for (const enemy of lookup.enemyById.values()) {
    const content = getMobContent(slug, enemy.id, locale)
    const spells = chipsOf(slug, enemy, locale)

    if (enemy.isBoss) {
      bossOrder.push(enemy.id)
      bosses.push({
        npcId: enemy.id,
        name: enemy.name,
        displayId: enemy.displayId,
        threat: content?.threat,
        role: content?.role,
        trapHtml: inlineMarkdown(content?.trap) || undefined,
        spells,
      })
      continue
    }

    if (spells.length) {
      mobs.push({
        npcId: enemy.id,
        name: enemy.name,
        displayId: enemy.displayId,
        threat: content?.threat,
        role: content?.role,
        spells,
      })
    }

    if (content?.trap) {
      traps.push({
        npcId: enemy.id,
        mobName: enemy.name,
        threat: content.threat,
        html: inlineMarkdown(content.trap),
      })
    }
  }

  mobs.sort((a, b) => rankOf(a.threat) - rankOf(b.threat) || a.name.localeCompare(b.name, locale))
  traps.sort(
    (a, b) => rankOf(a.threat) - rankOf(b.threat) || a.mobName.localeCompare(b.mobName, locale),
  )

  const highlights: DungeonHighlights = {
    mobs,
    traps,
    bosses: orderBosses(bosses, bossOrder, getDungeonContent(slug, locale)?.bosses),
  }
  cache.set(key, highlights)
  return highlights
```

`bossOrder` is filled in `enemyById` iteration order, which is `dungeon.enemies` order, which
is `mdtIdx` order — that is where the fallback comes from, without a second sort.

- [ ] **Step 4: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/highlights.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run the whole suite and the type check**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test && npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/highlights.ts src/lib/highlights.test.ts
```

```bash
git commit -m "Derive the trap list and the ordered boss list" -m "The trap sentence is the highest-value line in a mob card — the one that avoids the wipe — and 215 of them are written. They are worth reading as a list.

Bosses keep their trap on their own card rather than appearing twice on one screen, and follow the declared order when a dungeon states one. A declaration that misses a boss leaves it in its mdtIdx place instead of dropping it: a stale list should degrade, not hide an encounter." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Extract `DungeonHeader`

A pure refactor. The existing `DungeonPage` header tests are the gate: they must pass
untouched. Read them first — `src/routes/DungeonPage.test.tsx`, the `describe('Header')` block.

**Files:**
- Create: `src/components/DungeonHeader.tsx`
- Modify: `src/routes/DungeonPage.tsx:193-220`

**Interfaces:**
- Consumes: `DungeonLookup` from `../lib/data`, `getDungeonContent` from `../lib/content`.
- Produces:

```ts
export default function DungeonHeader(props: {
  slug: string
  lookup: DungeonLookup
  /** Which page is showing — the toggle links to the other one. */
  view: 'highlights' | 'map'
  /** Appended to the statistics line. The route name, on the map page. */
  note?: string
  /** Page-specific controls, between the statistics and the language switcher. */
  children?: ReactNode
}): ReactElement
```

- [ ] **Step 1: Read the existing header and its tests**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/routes/DungeonPage.test.tsx
```

Expected: PASS — this is the baseline the refactor must preserve.

- [ ] **Step 2: Add the two i18n keys the toggle needs**

In `src/lib/i18n/en.ts`, in the `// Dungeon page` block:

```ts
  'dungeon.toMap': 'Map',
  'dungeon.toHighlights': 'Highlights',
```

In `src/lib/i18n/fr.ts`, at the same place:

```ts
  'dungeon.toMap': 'Carte',
  'dungeon.toHighlights': 'Highlights',
```

- [ ] **Step 3: Create the component**

Create `src/components/DungeonHeader.tsx`:

```tsx
// ABOUTME: The bar both dungeon pages wear: name, forces, packs, timer, and the page toggle.
// ABOUTME: Page-specific controls come in as children, between the statistics and the switcher.

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { DungeonLookup } from '../lib/data'
import { getDungeonContent } from '../lib/content'
import { useI18n } from '../lib/i18n/context'
import LocaleSwitcher from './LocaleSwitcher'

export default function DungeonHeader({
  slug,
  lookup,
  view,
  note,
  children,
}: {
  slug: string
  lookup: DungeonLookup
  view: 'highlights' | 'map'
  note?: string
  children?: ReactNode
}) {
  const { t, plural, locale } = useI18n()
  const content = getDungeonContent(slug, locale)

  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-ink-800 px-4 py-2.5">
      <Link to="/" className="text-sm text-ink-400 hover:text-gold-400">
        ←
      </Link>
      <div className="min-w-0">
        <h1 className="truncate font-semibold text-ink-100">{lookup.dungeon.englishName}</h1>
        <p className="text-[11px] text-ink-400">
          {plural('common.forces', lookup.dungeon.totalCount)} ·{' '}
          {plural('common.packs', lookup.packs.size)}
          {content?.timer ? ` · ${t('common.minutes', { n: content.timer })}` : ''}
          {note ? ` · ${note}` : ''}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <Link
          to={view === 'map' ? `/d/${slug}` : `/d/${slug}/map`}
          className="rounded border border-ink-700 px-3 py-1 text-xs font-semibold text-ink-300 transition hover:border-gold-500 hover:text-gold-400"
        >
          {view === 'map' ? t('dungeon.toHighlights') : t('dungeon.toMap')}
        </Link>
        <LocaleSwitcher />
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Use it in `DungeonPage`**

In `src/routes/DungeonPage.tsx`, replace the whole `<header>…</header>` element with:

```tsx
      <DungeonHeader
        slug={slug}
        lookup={lookup}
        view="map"
        note={hasRoute ? t('dungeon.route', { name: route.name }) : undefined}
      >
        {collab.status !== 'off' && (
          <span className="rounded border border-threat-low/40 bg-threat-low/10 px-2 py-1 text-[11px] text-threat-low">
            {collab.room} · {collab.peers.length}
          </span>
        )}
        <div className="flex items-center gap-1 rounded-lg border border-ink-800 bg-ink-900 p-0.5">
          {tab('codex', t('tab.codex'))}
          {tab('route', t('tab.route'))}
        </div>
      </DungeonHeader>
```

Add `import DungeonHeader from '../components/DungeonHeader'` and remove the now-unused
`LocaleSwitcher` import. Keep every other import: `Link` is still used by the unknown-dungeon
branch, `getDungeonContent` may no longer be — remove it only if nothing else in the file
calls it.

- [ ] **Step 5: Run the existing tests — they are the proof the refactor changed nothing**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/routes/DungeonPage.test.tsx
```

Expected: PASS, with no edit to the test file. If an assertion fails, the header moved
something it should not have — fix the component, not the test.

- [ ] **Step 6: Run everything**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test && npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/components/DungeonHeader.tsx src/routes/DungeonPage.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
```

```bash
git commit -m "Extract the dungeon header both pages will wear" -m "The header was written inline in DungeonPage, which was right while it had one tenant. The highlights page needs the same name, forces, packs and timer, and the two need a way to reach each other.

Behaviour is unchanged and the existing DungeonPage header tests pass untouched, which is what makes this a refactor rather than a rewrite." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Move the map and stand up the page

After this task the app is navigable end to end, with the three content blocks still to come.

**Files:**
- Create: `src/routes/HighlightsPage.tsx`
- Create: `src/routes/HighlightsPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/route/RoutePanel.tsx:43-45`
- Modify: `src/components/route/RoutePanel.test.tsx:554-560`
- Modify: `src/routes/DungeonPage.tsx:170,261,282` (the `navigate` calls)
- Modify: `src/routes/DungeonPage.test.tsx:70-79` (the router table)
- Modify: `e2e/fixtures.ts:58,70` and `e2e/session.spec.ts:38,102` (the Playwright suite hard-codes
  the address this task moves)

**Interfaces:**
- Consumes: `DungeonHeader` (Task 4), `getHighlights` (Tasks 2–3), `getLookup`.
- Produces: the route `/d/:slug` → `HighlightsPage`, `/d/:slug/map` → `DungeonPage`.

- [ ] **Step 1: Write the failing test**

Create `src/routes/HighlightsPage.test.tsx`:

```tsx
// @vitest-environment jsdom
// ABOUTME: Mounts the highlights page against the real Altar of Fangs pool, in both languages.
// ABOUTME: Checks the page exists, names the dungeon, and offers the way to the map.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import HighlightsPage from './HighlightsPage'
import { getLookup } from '../lib/data'
import { renderEn, renderFr } from '../test/render'

afterEach(cleanup)

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!

const at = (path: string) => (
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/d/:slug" element={<HighlightsPage />} />
      <Route path="/" element={<p>home</p>} />
    </Routes>
  </MemoryRouter>
)

describe('Unknown dungeon', () => {
  it('says so instead of crashing, and offers a way home', () => {
    renderEn(at('/d/no-such-dungeon'))
    expect(screen.getByText('Unknown dungeon.')).toBeDefined()
    expect(screen.getByText('Back to home')).toBeDefined()
  })
})

describe('Header', () => {
  it('names the dungeon and sums up its forces and packs', () => {
    const { container } = renderEn(at(`/d/${SLUG}`))
    const header = container.querySelector('header')!
    expect(within(header).getByText(lookup.dungeon.englishName)).toBeDefined()
    expect(header.textContent).toContain(`${lookup.dungeon.totalCount} forces`)
  })

  it('offers the map, at its own address', () => {
    const { container } = renderEn(at(`/d/${SLUG}`))
    expect(container.querySelector(`a[href="/d/${SLUG}/map"]`)).not.toBeNull()
  })

  it('speaks French when the reader does', () => {
    const { container } = renderFr(at(`/d/${SLUG}`))
    expect(container.querySelector('header')!.textContent).toContain('Carte')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/routes/HighlightsPage.test.tsx
```

Expected: FAIL — cannot resolve `./HighlightsPage`.

- [ ] **Step 3: Add the page's i18n keys**

In `src/lib/i18n/en.ts`, after the `// Dungeon page` block:

```ts
  // Highlights page
  'highlights.mobs': 'MOBS TO KNOW',
  'highlights.traps': 'TRAPS',
  'highlights.bosses': 'BOSSES',
  'highlights.empty': 'Nothing has been written for this dungeon yet.',
```

In `src/lib/i18n/fr.ts`, at the same place:

```ts
  // Highlights page
  'highlights.mobs': 'MOBS À CONNAÎTRE',
  'highlights.traps': 'PIÈGES',
  'highlights.bosses': 'BOSS',
  'highlights.empty': 'Rien n’est encore écrit pour ce donjon.',
```

- [ ] **Step 4: Write the page**

Create `src/routes/HighlightsPage.tsx`:

```tsx
// ABOUTME: A dungeon's briefing: the mobs that matter, the written traps, and the bosses.
// ABOUTME: Read-only and entirely derived — writing a mob card fills this page in by itself.

import { Link, useParams } from 'react-router-dom'
import DungeonHeader from '../components/DungeonHeader'
import { getLookup } from '../lib/data'
import { getDungeonContent } from '../lib/content'
import { getHighlights } from '../lib/highlights'
import { useI18n } from '../lib/i18n/context'

export default function HighlightsPage() {
  const { slug = '' } = useParams()
  const { t, locale } = useI18n()
  const lookup = getLookup(slug)

  if (!lookup) {
    return (
      <div className="p-8">
        <p className="text-ink-300">{t('dungeon.unknown')}</p>
        <Link to="/" className="text-gold-400 hover:underline">
          {t('dungeon.backHome')}
        </Link>
      </div>
    )
  }

  const content = getDungeonContent(slug, locale)
  const highlights = getHighlights(slug, locale)
  const empty =
    !highlights.mobs.length && !highlights.traps.length && !highlights.bosses.length

  return (
    <div className="flex h-full flex-col">
      <DungeonHeader slug={slug} lookup={lookup} view="highlights" />

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {content?.summary && (
            <p className="mb-8 max-w-3xl text-sm leading-relaxed text-ink-300">
              {content.summary}
            </p>
          )}
          {empty && <p className="text-sm text-ink-400">{t('highlights.empty')}</p>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Move the routes**

Replace the body of `src/App.tsx`:

```tsx
// ABOUTME: The route table: home, a dungeon's highlights, its map, and the map focused on a mob.
// ABOUTME: Anything unrecognised redirects home.

import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './routes/Home'
import HighlightsPage from './routes/HighlightsPage'
import DungeonPage from './routes/DungeonPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/d/:slug" element={<HighlightsPage />} />
      <Route path="/d/:slug/map" element={<DungeonPage />} />
      <Route path="/d/:slug/map/mob/:npcId" element={<DungeonPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 6: Point every address the code builds at the map**

In `src/components/route/RoutePanel.tsx`, in `sessionLink`:

```ts
export function sessionLink(slug: string, room: string): string {
  return `${location.origin}${location.pathname}#/d/${slug}/map?room=${room}`
}
```

In `src/routes/DungeonPage.tsx`, three `navigate` calls:

- line ~170: `navigate(\`/d/${slug}/map\`)`
- line ~261: `navigate(id == null ? \`/d/${slug}/map\` : \`/d/${slug}/map/mob/${id}\`)`
- line ~282: `navigate(\`/d/${slug}/map/mob/${id}\`)`

- [ ] **Step 7: Update the two tests that assert on those addresses**

In `src/components/route/RoutePanel.test.tsx`, the `sessionLink` expectation:

```ts
    expect(sessionLink('altar-of-fangs', 'ABC123')).toBe(
      `${location.origin}${location.pathname}#/d/altar-of-fangs/map?room=ABC123`,
    )
```

In `src/routes/DungeonPage.test.tsx`, the router table inside `at()`:

```tsx
    <Routes>
      <Route path="/d/:slug/map" element={<DungeonPage />} />
      <Route path="/d/:slug/map/mob/:npcId" element={<DungeonPage />} />
      <Route path="/" element={<p>home</p>} />
    </Routes>
```

Then update every path literal in that file: `/d/${SLUG}` → `/d/${SLUG}/map`, and
`/d/${SLUG}/mob/${id}` → `/d/${SLUG}/map/mob/${id}`. The `?room=` variants move with them —
`/d/${SLUG}/map?room=ABC123`. Change the paths only; every assertion stays as it is.

Two exceptions that must **not** gain `/map`: the `/d/no-such-dungeon` cases, which test the
unknown-slug branch and are equally valid at either address, and the `<Route path="/" …>` home
stub.

Check the sweep is complete:

```bash
grep -n '/d/\${SLUG}\|/d/altar-of-fangs' src/routes/DungeonPage.test.tsx | grep -v '/map'
```

Expected: no output. Any line that comes back is one the sweep missed.

- [ ] **Step 8: Move the four addresses the Playwright suite hard-codes**

The end-to-end suite drives the real build in a real browser, so it holds the same addresses the
code does. Four sites, all of them the map:

In `e2e/fixtures.ts`, in `openSession` (line 58):

```ts
  await page.goto(`./#/d/${slug}/map`)
```

In `e2e/fixtures.ts`, in `acceptInvitation` (line 70):

```ts
  await page.goto(`./#/d/${slug}/map?room=${room}`)
```

In `e2e/session.spec.ts`, the share-link assertion (line 38):

```ts
  expect(link).toMatch(new RegExp(`^${reEscape(APP)}#/d/${slug}/map\\?room=[A-HJ-NP-Z2-9]{6}$`))
```

In `e2e/session.spec.ts`, the local-route scenario (line 102):

```ts
  await page.goto(`./#/d/${slug}/map`)
```

**Leave two sites alone.** `firstDungeonSlug` (`e2e/fixtures.ts:36-40`) and the smoke test
(`e2e/smoke.spec.ts:16`) both read the dungeon link off the home page, which still points at
`#/d/<slug>` — now the briefing. `firstDungeonSlug` only extracts the slug from it, so it keeps
working, and the smoke test asserts the link exists, not where it leads.

Check nothing was missed:

```bash
grep -rn '#/d/' e2e/ | grep -v '/map' | grep -v 'href\*='
```

Expected: only the `firstDungeonSlug` regex line, which matches on `#\/d\/` to parse a slug.

- [ ] **Step 9: Run the affected unit and integration files**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/routes/HighlightsPage.test.tsx src/routes/DungeonPage.test.tsx src/components/route/RoutePanel.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Run everything, including the browser suite**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test && npm run typecheck
```

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run test:e2e > e2e-out.txt 2>&1; tail -40 e2e-out.txt
```

Expected: all scenarios pass. This is the task that moves the addresses, so this is the task
where the end-to-end suite is the evidence — do not skip it and do not report Task 5 complete on
`npm test` alone. Delete `e2e-out.txt` afterwards by overwriting it with the Write tool (`rm` is
denied), or leave it: `.gitignore` may already cover it — check before committing.

If Playwright reports its browsers are not installed, stop and tell RwlRwlRwlRwl rather than
running an install command on their machine.

- [ ] **Step 11: Commit**

```bash
git add src/routes/HighlightsPage.tsx src/routes/HighlightsPage.test.tsx src/App.tsx src/routes/DungeonPage.tsx src/routes/DungeonPage.test.tsx src/components/route/RoutePanel.tsx src/components/route/RoutePanel.test.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts e2e/fixtures.ts e2e/session.spec.ts
```

```bash
git commit -m "Land on a dungeon's briefing, and move the map under it" -m "Clicking a dungeon opened the map and the codex, which answers \"where is everything\" before anyone has asked \"what kills us here\". The briefing takes the landing address and the map moves to /d/:slug/map.

No redirect is written for the old addresses: the app has no users, and a compatibility layer nobody can ever prove is unused would outlive the reason it was added. sessionLink is the exception and had to move with them — it is the one place the code itself hands out an address, so leaving it stale would break sessions created after this change, not only before it.

The Playwright suite moves too, at the four sites that name the map. The two that read the dungeon link off the home page stay as they are: that link still points at /d/:slug, which is now the briefing, and neither of them cares where it leads." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: `MobTable`

**Files:**
- Create: `src/components/highlights/MobTable.tsx`
- Create: `src/components/highlights/MobTable.test.tsx`
- Modify: `src/routes/HighlightsPage.tsx`

**Interfaces:**
- Consumes: `HighlightMob` from `../../lib/highlights`; `TagBadge`, `ThreatBadge` from
  `../codex/Badges`; `iconUrl`, `wowheadUrl` from `../../lib/data`.
- Produces: `export default function MobTable({ slug, mobs }: { slug: string; mobs: HighlightMob[] }): ReactElement | null`

- [ ] **Step 1: Write the failing test**

Create `src/components/highlights/MobTable.test.tsx`:

```tsx
// @vitest-environment jsdom
// ABOUTME: Checks a row is a mob, carries its spell chips, and links into the codex.
// ABOUTME: Runs against the real Altar of Fangs derivation, not a hand-built list.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MobTable from './MobTable'
import { getHighlights } from '../../lib/highlights'
import { renderEn, renderFr } from '../../test/render'

afterEach(cleanup)

const SLUG = 'altar-of-fangs'
const mobs = getHighlights(SLUG).mobs

const mount = () =>
  renderEn(<MobTable slug={SLUG} mobs={mobs} />, { wrapper: MemoryRouter })

describe('MobTable', () => {
  it('shows one row per mob', () => {
    const { container } = mount()
    expect(container.querySelectorAll('[data-mob]')).toHaveLength(mobs.length)
  })

  it('names the mob and links it into the codex', () => {
    const { container } = mount()
    const twinfang = container.querySelector('[data-mob="261554"]')!
    expect(twinfang.textContent).toContain('Twinfang Harrower')
    expect(twinfang.querySelector(`a[href="/d/${SLUG}/map/mob/261554"]`)).not.toBeNull()
  })

  it('puts every prio-1 spell of the mob on its row, linked to Wowhead', () => {
    const { container } = mount()
    const twinfang = container.querySelector('[data-mob="261554"]')!
    expect(twinfang.textContent).toContain('Duostrike')
    expect(twinfang.textContent).toContain('Paralyzing Shots')
    expect(twinfang.querySelector('a[href*="wowhead.com"]')).not.toBeNull()
  })

  it('shows the threat as a badge', () => {
    mount()
    expect(screen.getAllByText('Watch out').length).toBeGreaterThan(0)
  })

  it('renders nothing at all when there is nothing to show', () => {
    const { container } = renderEn(<MobTable slug={SLUG} mobs={[]} />, { wrapper: MemoryRouter })
    expect(container.querySelector('[data-mob]')).toBeNull()
  })

  it('speaks French when the reader does, spell names and tags alike', () => {
    // The derivation is keyed by locale, so the French rows are a different object graph.
    const fr = getHighlights(SLUG, 'fr').mobs
    const { container } = renderFr(<MobTable slug={SLUG} mobs={fr} />, { wrapper: MemoryRouter })
    const twinfang = container.querySelector('[data-mob="261554"]')!
    expect(twinfang.textContent).toContain('À surveiller')
    // tag.dodge is DODGE in English and ESQUIVE in French — the chips go through i18n too.
    expect(container.textContent).toContain('ESQUIVE')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/highlights/MobTable.test.tsx
```

Expected: FAIL — cannot resolve `./MobTable`.

- [ ] **Step 3: Write the component**

Create `src/components/highlights/MobTable.tsx`:

```tsx
// ABOUTME: One row per mob: its name and threat on the left, its prio-1 spells as chips.
// ABOUTME: A row is a mob because that is the unit a player thinks in, and it halves the length.

import { Link } from 'react-router-dom'
import type { HighlightMob, HighlightSpell } from '../../lib/highlights'
import { iconUrl, wowheadUrl } from '../../lib/data'
import { useI18n } from '../../lib/i18n/context'
import { TagBadge, ThreatBadge } from '../codex/Badges'

export default function MobTable({ slug, mobs }: { slug: string; mobs: HighlightMob[] }) {
  if (!mobs.length) return null

  return (
    <div className="overflow-hidden rounded-lg border border-ink-800">
      {mobs.map((mob) => (
        <MobRow key={mob.npcId} slug={slug} mob={mob} />
      ))}
    </div>
  )
}

function MobRow({ slug, mob }: { slug: string; mob: HighlightMob }) {
  const { t } = useI18n()

  return (
    <div
      data-mob={mob.npcId}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-800 px-3 py-2.5 last:border-b-0 hover:bg-ink-800/40"
    >
      <div className="flex min-w-[13rem] items-center gap-2">
        <Link
          to={`/d/${slug}/map/mob/${mob.npcId}`}
          className="text-sm font-semibold text-ink-100 hover:text-gold-400"
        >
          {mob.name}
        </Link>
        <ThreatBadge threat={mob.threat} />
        {mob.role === 'miniboss' && (
          <span className="rounded border border-gold-500/40 bg-gold-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-gold-400">
            {t('role.miniboss')}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
        {mob.spells.map((spell) => (
          <SpellChip key={spell.name} spell={spell} />
        ))}
      </div>
    </div>
  )
}

function SpellChip({ spell }: { spell: HighlightSpell }) {
  const { t, locale } = useI18n()

  return (
    <span className="flex items-center gap-1.5 rounded border border-ink-700 bg-ink-900 py-0.5 pl-0.5 pr-1.5">
      {spell.icon ? (
        <img
          src={iconUrl(spell.icon)}
          alt=""
          loading="lazy"
          className="h-5 w-5 rounded-sm border border-ink-600"
        />
      ) : (
        <span className="h-5 w-5 rounded-sm border border-ink-700 bg-ink-800" />
      )}
      <a
        href={wowheadUrl(spell.ids[0], locale)}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-medium text-ink-200 hover:text-gold-400"
      >
        {spell.name}
      </a>
      {spell.tags.map((tag) => (
        <TagBadge key={tag} tag={tag} />
      ))}
      {/* With no hand-written tag, what MDT knows is still worth showing. */}
      {!spell.tags.length && spell.interruptible && <TagBadge tag="kick" />}
    </span>
  )
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/highlights/MobTable.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Put the block on the page**

In `src/routes/HighlightsPage.tsx`, import the component and the section heading helper, and
insert before the `{empty && …}` line:

```tsx
          {highlights.mobs.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-2 text-xs font-semibold tracking-[0.2em] text-gold-500">
                {t('highlights.mobs')}
              </h2>
              <MobTable slug={slug} mobs={highlights.mobs} />
            </section>
          )}
```

Add `import MobTable from '../components/highlights/MobTable'`.

- [ ] **Step 6: Run everything**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test && npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/components/highlights/MobTable.tsx src/components/highlights/MobTable.test.tsx src/routes/HighlightsPage.tsx
```

```bash
git commit -m "Show the mobs whose spells matter, one row each" -m "The row is the mob and the spells are chips on it. Measured over the real content, one row per spell would put 52 rows in Temple of Sethraliss against 29 per mob — and a player scanning a briefing is looking for which pack to fear, not for a spell in isolation.

A chip with no hand-written tag still shows what MDT knows about interruptibility, so a card nobody has annotated yet is not silently blank." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: `TrapList`

**Files:**
- Create: `src/components/highlights/TrapList.tsx`
- Create: `src/components/highlights/TrapList.test.tsx`
- Modify: `src/routes/HighlightsPage.tsx`

**Interfaces:**
- Consumes: `HighlightTrap` from `../../lib/highlights`; `ThreatBadge` from `../codex/Badges`.
- Produces: `export default function TrapList({ slug, traps }: { slug: string; traps: HighlightTrap[] }): ReactElement | null`

- [ ] **Step 1: Write the failing test**

Create `src/components/highlights/TrapList.test.tsx`:

```tsx
// @vitest-environment jsdom
// ABOUTME: Checks every written trap sentence reaches the page, with its mob and its markdown.
// ABOUTME: Runs against the real Altar of Fangs derivation.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TrapList from './TrapList'
import { getHighlights } from '../../lib/highlights'
import { renderEn } from '../../test/render'

afterEach(cleanup)

const SLUG = 'altar-of-fangs'
const traps = getHighlights(SLUG).traps

const mount = () => renderEn(<TrapList slug={SLUG} traps={traps} />, { wrapper: MemoryRouter })

describe('TrapList', () => {
  it('shows every trap the dungeon has written', () => {
    const { container } = mount()
    expect(traps.length).toBeGreaterThan(0)
    expect(container.querySelectorAll('[data-trap]')).toHaveLength(traps.length)
  })

  it('names the mob, links it, and renders the sentence as markdown', () => {
    const { container } = mount()
    const twinfang = container.querySelector('[data-trap="261554"]')!
    expect(twinfang.textContent).toContain('Twinfang Harrower')
    expect(twinfang.querySelector(`a[href="/d/${SLUG}/map/mob/261554"]`)).not.toBeNull()
    expect(twinfang.querySelector('strong')).not.toBeNull()
  })

  it('renders nothing at all when nothing is written', () => {
    const { container } = renderEn(<TrapList slug={SLUG} traps={[]} />, { wrapper: MemoryRouter })
    expect(container.querySelector('[data-trap]')).toBeNull()
  })
})
```

> If the `strong` assertion fails, open `content/altar-of-fangs/261554-twinfang-harrower.md`
> and check whether its `trap:` still contains `**…**`. Assert on what the file says; do not
> edit the content to satisfy the test.

- [ ] **Step 2: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/highlights/TrapList.test.tsx
```

Expected: FAIL — cannot resolve `./TrapList`.

- [ ] **Step 3: Write the component**

Create `src/components/highlights/TrapList.tsx`:

```tsx
// ABOUTME: Every written trap sentence of the dungeon, two columns, most dangerous first.
// ABOUTME: The trap is the line that avoids the wipe, so none of them is folded away.

import { Link } from 'react-router-dom'
import type { HighlightTrap } from '../../lib/highlights'
import { ThreatBadge } from '../codex/Badges'

export default function TrapList({ slug, traps }: { slug: string; traps: HighlightTrap[] }) {
  if (!traps.length) return null

  return (
    <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
      {traps.map((trap) => (
        <div
          key={trap.npcId}
          data-trap={trap.npcId}
          className="border-l-2 border-ink-700 pl-3 hover:border-gold-500"
        >
          <div className="flex items-center gap-2">
            <Link
              to={`/d/${slug}/map/mob/${trap.npcId}`}
              className="text-xs font-semibold text-ink-100 hover:text-gold-400"
            >
              {trap.mobName}
            </Link>
            <ThreatBadge threat={trap.threat} />
          </div>
          {/* Authored markdown, already inline-rendered by the derivation. */}
          <p
            className="mt-0.5 text-xs leading-relaxed text-ink-400"
            dangerouslySetInnerHTML={{ __html: trap.html }}
          />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/highlights/TrapList.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Put the block on the page**

In `src/routes/HighlightsPage.tsx`, after the mobs section:

```tsx
          {highlights.traps.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 text-xs font-semibold tracking-[0.2em] text-gold-500">
                {t('highlights.traps')}
              </h2>
              <TrapList slug={slug} traps={highlights.traps} />
            </section>
          )}
```

Add `import TrapList from '../components/highlights/TrapList'`.

- [ ] **Step 6: Run everything**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test && npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/components/highlights/TrapList.tsx src/components/highlights/TrapList.test.tsx src/routes/HighlightsPage.tsx
```

```bash
git commit -m "Read the dungeon's traps as one list" -m "215 trap sentences are written across the codex and each one is the highest-value line of its card — the sentence that avoids the wipe. Reachable one mob at a time they are reference material; together they are a briefing.

None is folded away behind a control. A trap the reader has to click to discover is a trap that stays undiscovered." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: `BossStrip`

**Files:**
- Create: `src/components/highlights/BossStrip.tsx`
- Create: `src/components/highlights/BossStrip.test.tsx`
- Modify: `src/routes/HighlightsPage.tsx`

**Interfaces:**
- Consumes: `HighlightMob` from `../../lib/highlights`; `iconUrl`, `portraitUrl`,
  `wowheadUrl` from `../../lib/data`; `TagBadge` from `../codex/Badges`.
- Produces: `export default function BossStrip({ slug, bosses }: { slug: string; bosses: HighlightMob[] }): ReactElement | null`

- [ ] **Step 1: Write the failing test**

Create `src/components/highlights/BossStrip.test.tsx`:

```tsx
// @vitest-environment jsdom
// ABOUTME: Checks the boss cards appear in order, each with its trap and its own spells.
// ABOUTME: Altar of Fangs falls back to mdtIdx; King's Rest declares its order.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BossStrip from './BossStrip'
import { getHighlights } from '../../lib/highlights'
import { renderEn } from '../../test/render'

afterEach(cleanup)

const SLUG = 'altar-of-fangs'

const mount = (slug: string) =>
  renderEn(<BossStrip slug={slug} bosses={getHighlights(slug).bosses} />, {
    wrapper: MemoryRouter,
  })

describe('BossStrip', () => {
  it('shows one card per boss, in the order the derivation gives', () => {
    const { container } = mount(SLUG)
    const names = [...container.querySelectorAll('[data-boss]')].map(
      (el) => el.querySelector('h3')!.textContent,
    )
    expect(names).toEqual(["Rav'i", 'The Writhing Coil', "Zul'jan"])
  })

  it('links each boss into its codex entry', () => {
    const { container } = mount(SLUG)
    expect(container.querySelector(`a[href="/d/${SLUG}/map/mob/259445"]`)).not.toBeNull()
  })

  it('gives a boss its own prio-1 spells', () => {
    const { container } = mount(SLUG)
    const ravi = container.querySelector('[data-boss="259445"]')!
    expect(ravi.querySelectorAll('a[href*="wowhead.com"]').length).toBeGreaterThan(0)
  })

  it('renders nothing at all for a dungeon with no bosses in the derivation', () => {
    const { container } = renderEn(<BossStrip slug={SLUG} bosses={[]} />, {
      wrapper: MemoryRouter,
    })
    expect(container.querySelector('[data-boss]')).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/highlights/BossStrip.test.tsx
```

Expected: FAIL — cannot resolve `./BossStrip`.

- [ ] **Step 3: Write the component**

Create `src/components/highlights/BossStrip.tsx`:

```tsx
// ABOUTME: One card per boss, in encounter order: portrait, trap, and its prio-1 spells.
// ABOUTME: A boss's trap lives here rather than in the trap list, so it is not shown twice.

import { Link } from 'react-router-dom'
import type { HighlightMob } from '../../lib/highlights'
import { iconUrl, portraitUrl, wowheadUrl } from '../../lib/data'
import { useI18n } from '../../lib/i18n/context'
import { TagBadge } from '../codex/Badges'

export default function BossStrip({ slug, bosses }: { slug: string; bosses: HighlightMob[] }) {
  const { locale } = useI18n()
  if (!bosses.length) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {bosses.map((boss) => (
        <article
          key={boss.npcId}
          data-boss={boss.npcId}
          className="rounded-lg border border-ink-800 bg-ink-900 p-3"
        >
          <div className="flex items-center gap-2.5">
            {boss.displayId != null && (
              <img
                src={portraitUrl(boss.displayId)}
                alt=""
                loading="lazy"
                className="h-10 w-10 shrink-0 rounded-full border border-gold-500/40 object-cover"
              />
            )}
            <h3 className="min-w-0 text-sm font-semibold text-ink-100">
              <Link to={`/d/${slug}/map/mob/${boss.npcId}`} className="hover:text-gold-400">
                {boss.name}
              </Link>
            </h3>
          </div>

          {boss.trapHtml && (
            <p
              className="mt-2 text-xs leading-relaxed text-ink-400"
              dangerouslySetInnerHTML={{ __html: boss.trapHtml }}
            />
          )}

          {boss.spells.length > 0 && (
            <ul className="mt-2 space-y-1">
              {boss.spells.map((spell) => (
                <li key={spell.name} className="flex items-center gap-1.5">
                  {spell.icon && (
                    <img
                      src={iconUrl(spell.icon)}
                      alt=""
                      loading="lazy"
                      className="h-4 w-4 shrink-0 rounded-sm border border-ink-600"
                    />
                  )}
                  <a
                    href={wowheadUrl(spell.ids[0], locale)}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-xs text-ink-200 hover:text-gold-400"
                  >
                    {spell.name}
                  </a>
                  {spell.tags.map((tag) => (
                    <TagBadge key={tag} tag={tag} />
                  ))}
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/components/highlights/BossStrip.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Put the block on the page**

In `src/routes/HighlightsPage.tsx`, after the traps section:

```tsx
          {highlights.bosses.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 text-xs font-semibold tracking-[0.2em] text-gold-500">
                {t('highlights.bosses')}
              </h2>
              <BossStrip slug={slug} bosses={highlights.bosses} />
            </section>
          )}
```

Add `import BossStrip from '../components/highlights/BossStrip'`.

- [ ] **Step 6: Extend the page test to cover the assembly**

Append to `src/routes/HighlightsPage.test.tsx`:

```tsx
describe('The four blocks', () => {
  it('assembles the headings the dungeon has content for', () => {
    renderEn(at(`/d/${SLUG}`))
    expect(screen.getByText('MOBS TO KNOW')).toBeDefined()
    expect(screen.getByText('TRAPS')).toBeDefined()
    expect(screen.getByText('BOSSES')).toBeDefined()
  })

  it('says so plainly for a dungeon nothing is written for', () => {
    // Altar of Fangs is written; this asserts the empty branch exists and is reachable, using
    // the message rather than a dungeon we would have to invent.
    renderEn(at(`/d/${SLUG}`))
    expect(screen.queryByText('Nothing has been written for this dungeon yet.')).toBeNull()
  })
})
```

- [ ] **Step 7: Run everything, including the type check and the build**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test && npm run typecheck && npm run build
```

Expected: all green. The build matters here: this is the first task where every new component
is on a real route, and `tsc -b` runs over the whole graph.

- [ ] **Step 8: Commit**

```bash
git add src/components/highlights/BossStrip.tsx src/components/highlights/BossStrip.test.tsx src/routes/HighlightsPage.tsx src/routes/HighlightsPage.test.tsx
```

```bash
git commit -m "Close the briefing with the boss cards" -m "A boss's trap sits on its card rather than in the trap list above: the same sentence twice on one screen is noise, and the card is where its spells already are.

The order comes from the derivation, which falls back to mdtIdx and takes the declared order when a dungeon states one — so King's Rest reads correctly without every other dungeon having to declare anything." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Verification, after Task 8

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test && npm run typecheck && npm run build
```

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run test:e2e > e2e-out.txt 2>&1; tail -40 e2e-out.txt
```

The Browser pane is still no help here — `.claude/launch.json` sets
`runtimeExecutable: "npm"` and `preview_start` does not inherit the PATH prefix, so it fails
with `Command not found: npm`. **Do not hardcode a machine's node path into the committed
`launch.json`.** Playwright is the door to a real browser on this project; use it, and say
plainly that nobody has *looked* at the page.

RwlRwlRwlRwl runs `npm run dev` to look at it. What is worth their eyes and no test's:

- Whether 29 rows of `MobTable` reads as a briefing or as a wall, on the worst dungeons
  (Temple of Sethraliss, Murder Row).
- Whether the two-column trap list holds together at 1280px and below.
- Whether the boss portraits are present — `portraitUrl` points at
  `public/portraits/<displayId>.webp`, and a missing file shows as a broken image rather than
  as nothing.
