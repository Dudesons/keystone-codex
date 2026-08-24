# Mob and spell search — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** let a reader type a mob name, a mob id, a spell name or a spell id anywhere in the app and
land on the right mob's card.

**Architecture:** a pure index module over the already-loaded generated data (`src/lib/search.ts`),
and an overlay palette mounted once above the route table. Every result is a mob, so a spell match
resolves to the mobs that cast it and no new route is needed.

**Tech Stack:** React 19, TypeScript, Tailwind 4, react-router-dom (HashRouter), Vitest
(`app` project: node for `lib/`, jsdom for components), Playwright for end-to-end. **No new
dependency is added.**

**Spec:** [`2026-08-24-mob-and-spell-search-design.md`](2026-08-24-mob-and-spell-search-design.md)

## Global Constraints

- **TDD is mandatory.** Watch every test fail before implementing. A test that passes on its first
  run proves nothing — if one does, change it until it fails for the right reason.
- **Every new UI string goes in both `src/lib/i18n/en.ts` and `src/lib/i18n/fr.ts`.** `tsc` fails on
  a key that is missing from either or left over in one, which replaces a completeness test.
- **Never write a game term into a dictionary.** Mob names come from MDT, spell names from Wowhead.
- **Component test files** carry `// @vitest-environment jsdom` on their first line, declare their
  own `afterEach(cleanup)`, and mount through `src/test/render.tsx` (`renderEn` / `renderFr`) rather
  than Testing Library's bare `render`.
- **No new dependency.** No fuzzy-match library, no command-palette library.
- **Nothing under `src/data/generated/` is edited.** The index is derived at runtime.
- **Commit style:** imperative subject, no `feat:`/`fix:` prefix, body says *why*. Trailer
  `Co-authored-by: Claude Opus 5 <noreply@anthropic.com>`. **Never `--no-verify`.**
- **Playwright matches an accessible name as a case-insensitive substring by default.** Use
  `exact: true` on any locator whose name is a prefix of another control's.
- Branch: `search-mobs-and-spells`, already cut from `main` and carrying the design doc.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/search.ts` | **New.** Builds the per-locale index; answers a query. Pure, no React. |
| `src/lib/search.test.ts` | **New.** Unit tests against the real generated data. Node environment. |
| `src/components/SearchPalette.tsx` | **New.** `SearchProvider`, the `useSearch` hook, and the overlay. All the search UI in one file. |
| `src/components/SearchPalette.test.tsx` | **New.** Integration tests, jsdom. |
| `src/App.tsx` | Wraps the route table in `SearchProvider`. |
| `src/components/DungeonHeader.tsx` | The trigger button. |
| `src/routes/Home.tsx` | The trigger button. |
| `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts` | Seven new strings. |
| `e2e/search.spec.ts` | **New.** Two scenarios in a real browser. |

Why the provider and the overlay share one file: they are one feature with one piece of state, and
the hook exists only so a button three levels down can flip it. Splitting them would mean a context
module whose only consumer is its neighbour.

---

### Task 1: The index and the query

**Files:**
- Create: `src/lib/search.ts`
- Test: `src/lib/search.test.ts`

**Interfaces:**
- Consumes: `dungeonList`, `getLookup`, `getNpcLabel`, `getSpell` from `src/lib/data.ts`;
  `getIndicators` from `src/lib/indicators.ts`; `DEFAULT_LOCALE`, `Locale` from
  `src/lib/i18n/locales.ts`; `Enemy`, `Rank`, `Threat` from `src/lib/types.ts`.
- Produces:
  ```ts
  export const SEARCH_LIMIT = 20
  export interface SearchHit {
    slug: string
    dungeonName: string
    npcId: number
    name: string
    displayId?: number
    threat?: Threat
    rank?: Rank
    viaSpell?: string
  }
  export interface SearchResults { hits: SearchHit[]; total: number }
  export function foldForSearch(text: string): string
  export function search(query: string, locale?: Locale, currentSlug?: string): SearchResults
  ```

Background the implementer needs:

- `getLookup(slug)!.enemyById` is a `Map<number, Enemy>` holding **one row per npc id**. A mob that
  appears twice in MDT's table is one card and must be one hit — iterate `enemyById.values()`, never
  `dungeon.enemies`, which has 260 rows to `enemyById`'s fewer.
- `getNpcLabel(enemy, locale).name` is the localized name, falling back to MDT's English one.
  `enemy.name` is always the English one. **They genuinely differ** — `Merektha` is `Merekpha` in
  French — which is why both are indexed.
- `getSpell(id, locale)` returns `Spell | undefined`; `Spell` has `.name`. It can be `undefined`,
  because MDT references spells Wowhead has no entry for.
- `getIndicators(slug, enemy, locale)` returns `{ threat?, rank?, ... }`. It is cached internally, so
  calling it per entry at build time is cheap.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/search.test.ts`:

```ts
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

describe('Searching by spell name', () => {
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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run --project app src/lib/search.test.ts
```

Expected: every test fails to even collect, with `Failed to resolve import "./search"`. That is the
right failure — the module does not exist. Do **not** proceed until you have seen it.

- [ ] **Step 3: Write the implementation**

Create `src/lib/search.ts`:

```ts
// ABOUTME: The index behind the search palette: every mob, its names, its ids and its spells.
// ABOUTME: One entry per mob; a spell match resolves to the mobs that cast it.

/**
 * Searching the codex.
 *
 * Every result is a mob, because a mob already has an address — `/d/<slug>/codex/mob/<npcId>` —
 * and a spell has none. A spell match therefore resolves to the mobs that cast it, which is also
 * the question behind searching for one: where do I meet this.
 *
 * The index is built from data the app already holds in memory, so it costs one pass and no
 * network. It is cached per locale, like `getLookup` and `getIndicators`, because a mob's name
 * and its spells' names both change with the language.
 */

import { dungeonList, getLookup, getNpcLabel, getSpell } from './data'
import { getIndicators } from './indicators'
import { DEFAULT_LOCALE, type Locale } from './i18n/locales'
import type { Enemy, Rank, Threat } from './types'

/** Rows shown at once. The total is reported alongside, so a cap never reads as "that is all". */
export const SEARCH_LIMIT = 20

export interface SearchHit {
  slug: string
  dungeonName: string
  npcId: number
  name: string
  displayId?: number
  threat?: Threat
  rank?: Rank
  /** The spell that matched, set only when the mob's own name did not. */
  viaSpell?: string
}

export interface SearchResults {
  /** At most `SEARCH_LIMIT` of them. */
  hits: SearchHit[]
  total: number
}

/**
 * Folds a string to what a reader can be expected to type: no case, no accents, no punctuation,
 * no spaces. `Nal'orakk`, `nal orakk` and `nalorakk` all fold to the same thing, which is the
 * point — a name is read in a guide and typed from memory.
 */
export const foldForSearch = (text: string): string =>
  text
    .normalize('NFD')
    // Written as escapes, not as literal combining marks: those are invisible in an editor and
    // survive a copy-paste only by luck.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

interface IndexedSpell {
  id: number
  name: string
  folded: string
}

interface Entry {
  slug: string
  dungeonName: string
  enemy: Enemy
  label: string
  /** The localized name and the English one, folded. Often identical, sometimes not. */
  folded: string[]
  spells: IndexedSpell[]
  threat?: Threat
  rank?: Rank
}

const indexCache = new Map<Locale, Entry[]>()

function buildIndex(locale: Locale): Entry[] {
  const entries: Entry[] = []

  for (const summary of dungeonList) {
    const lookup = getLookup(summary.slug)
    if (!lookup) continue

    // `enemyById` holds one row per npc id. `dungeon.enemies` repeats a mob that MDT lists
    // twice, and a mob is one card, so it would be one hit shown twice.
    for (const enemy of lookup.enemyById.values()) {
      const label = getNpcLabel(enemy, locale).name
      const { threat, rank } = getIndicators(summary.slug, enemy, locale)

      const spells: IndexedSpell[] = []
      for (const ref of enemy.spells) {
        // MDT references spells Wowhead has no entry for; an unnamed spell is still searchable
        // by its id, which is why the id is kept whatever the name turns out to be.
        const name = getSpell(ref.id, locale)?.name ?? ''
        spells.push({ id: ref.id, name, folded: foldForSearch(name) })
      }

      entries.push({
        slug: summary.slug,
        dungeonName: summary.englishName,
        enemy,
        label,
        folded: [...new Set([foldForSearch(label), foldForSearch(enemy.name)])].filter(Boolean),
        spells,
        threat,
        rank,
      })
    }
  }

  return entries
}

function getIndex(locale: Locale): Entry[] {
  const cached = indexCache.get(locale)
  if (cached) return cached
  const built = buildIndex(locale)
  indexCache.set(locale, built)
  return built
}

/**
 * Ranking tiers, best first. Determinism is what lets a test pin an order at all, so the sort
 * falls through to the mob's own name rather than leaving ties to iteration order.
 */
const EXACT = 0
const PREFIX = 1
const CONTAINS = 2
const VIA_SPELL = 3

interface Scored {
  entry: Entry
  tier: number
  viaSpell?: string
}

/** A mob's own name against the folded query. Returns nothing when no name matches. */
function nameTier(entry: Entry, folded: string): number | undefined {
  let best: number | undefined
  for (const name of entry.folded) {
    const tier = name === folded ? EXACT : name.startsWith(folded) ? PREFIX : name.includes(folded) ? CONTAINS : undefined
    if (tier !== undefined && (best === undefined || tier < best)) best = tier
  }
  return best
}

function scoreByName(entries: Entry[], folded: string): Scored[] {
  const scored: Scored[] = []
  for (const entry of entries) {
    const tier = nameTier(entry, folded)
    if (tier !== undefined) {
      scored.push({ entry, tier })
      continue
    }
    const spell = entry.spells.find((s) => s.folded && s.folded.includes(folded))
    if (spell) scored.push({ entry, tier: VIA_SPELL, viaSpell: spell.name })
  }
  return scored
}

/** An id is pasted, not explored, so it matches exactly or not at all. */
function scoreById(entries: Entry[], id: number): Scored[] {
  const scored: Scored[] = []
  for (const entry of entries) {
    if (entry.enemy.id === id) {
      scored.push({ entry, tier: EXACT })
      continue
    }
    const spell = entry.spells.find((s) => s.id === id)
    // A spell with no Wowhead entry still matches its id; the row falls back to the id itself
    // rather than claiming an empty name.
    if (spell) scored.push({ entry, tier: VIA_SPELL, viaSpell: spell.name || String(spell.id) })
  }
  return scored
}

const toHit = ({ entry, viaSpell }: Scored): SearchHit => ({
  slug: entry.slug,
  dungeonName: entry.dungeonName,
  npcId: entry.enemy.id,
  name: entry.label,
  displayId: entry.enemy.displayId,
  threat: entry.threat,
  rank: entry.rank,
  viaSpell,
})

export function search(
  query: string,
  locale: Locale = DEFAULT_LOCALE,
  currentSlug?: string,
): SearchResults {
  const trimmed = query.trim()
  if (!trimmed) return { hits: [], total: 0 }

  const entries = getIndex(locale)
  let scored: Scored[]

  if (/^\d+$/.test(trimmed)) {
    scored = scoreById(entries, Number(trimmed))
  } else {
    const folded = foldForSearch(trimmed)
    // An all-punctuation query folds to nothing, and `''.startsWith('')` is true — so without
    // this the whole corpus comes back. Checked before scoring, not after.
    if (!folded) return { hits: [], total: 0 }
    scored = scoreByName(entries, folded)
  }

  scored.sort(
    (a, b) =>
      a.tier - b.tier ||
      Number(b.entry.slug === currentSlug) - Number(a.entry.slug === currentSlug) ||
      a.entry.label.localeCompare(b.entry.label) ||
      a.entry.enemy.id - b.entry.enemy.id,
  )

  return { hits: scored.slice(0, SEARCH_LIMIT).map(toHit), total: scored.length }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run --project app src/lib/search.test.ts
```

Expected: PASS, all of them, with no console output. If `sorts the dungeon you are in first` fails,
the query `'a'` may not match anything in the last dungeon — pick a different letter and say so in a
comment rather than deleting the test.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/search.ts src/lib/search.test.ts
git commit -m "Index every mob by its names, its ids and the spells it casts"
```

---

### Task 2: The palette, its provider, and navigating a result

**Files:**
- Create: `src/components/SearchPalette.tsx`
- Test: `src/components/SearchPalette.test.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`

**Interfaces:**
- Consumes: `search`, `SEARCH_LIMIT`, `type SearchHit` from `src/lib/search.ts`; `useI18n` from
  `src/lib/i18n/context.tsx`; `ThreatBadge` from `src/components/codex/Badges.tsx`; `portraitUrl`
  from `src/lib/data.ts`; `useNavigate`, `useLocation` from `react-router-dom`.
- Produces:
  ```ts
  export function SearchProvider({ children }: { children: ReactNode }): JSX.Element
  export function useSearch(): { open: () => void }
  ```
  `SearchProvider` must be rendered inside a router — it reads the location to know which dungeon
  sorts first. `useSearch` throws outside the provider, the same way `useI18n` does.

- [ ] **Step 1: Add the strings**

In `src/lib/i18n/en.ts`, after the `collab.*` block:

```ts
  // Search
  'search.open': 'Search',
  'search.label': 'Search mobs and spells',
  'search.placeholder': 'A mob, a spell, or an id',
  'search.viaSpell': 'casts {spell}',
  'search.empty': 'Nothing matches “{query}”',
  'search.showing': 'Showing {shown} of {total}',
  'search.hint': '↑↓ to move · Enter to open · Esc to close',
```

In `src/lib/i18n/fr.ts`, at the matching position:

```ts
  // Recherche
  'search.open': 'Rechercher',
  'search.label': 'Rechercher un mob ou un sort',
  'search.placeholder': 'Un mob, un sort, ou un identifiant',
  'search.viaSpell': 'lance {spell}',
  'search.empty': 'Rien ne correspond à « {query} »',
  'search.showing': '{shown} sur {total}',
  'search.hint': '↑↓ pour naviguer · Entrée pour ouvrir · Échap pour fermer',
```

- [ ] **Step 2: Write the failing tests**

Create `src/components/SearchPalette.test.tsx`:

```tsx
// @vitest-environment jsdom
// ABOUTME: The search palette: what it lists, and where a chosen row goes.
// ABOUTME: Mounted inside a real router, so a navigation is a real navigation.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SearchProvider, useSearch } from './SearchPalette'
import { dungeonList, getLookup, getNpcLabel } from '../lib/data'
import { renderEn } from '../test/render'

afterEach(cleanup)

/** Shows the current address, so a test can assert a navigation happened without a real browser. */
function Address() {
  return <span data-testid="address">{useLocation().pathname}</span>
}

function OpenButton() {
  const { open } = useSearch()
  return <button onClick={open}>open it</button>
}

const mount = () =>
  renderEn(
    <MemoryRouter initialEntries={['/']}>
      <SearchProvider>
        <OpenButton />
        <Address />
        <Routes>
          <Route path="*" element={null} />
        </Routes>
      </SearchProvider>
    </MemoryRouter>,
  )

const firstMob = () => {
  const slug = dungeonList[0].slug
  const enemy = [...getLookup(slug)!.enemyById.values()][0]
  return { slug, npcId: enemy.id, name: getNpcLabel(enemy, 'en').name }
}

describe('Opening and closing', () => {
  it('shows no palette until something opens it', () => {
    mount()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('opens when a consumer calls open()', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'open it' }))
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'open it' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('forgets the previous query when reopened', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'open it' }))
    await user.type(screen.getByRole('combobox'), 'abc')
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'open it' }))
    expect(screen.getByRole('combobox')).toHaveValue('')
  })
})

describe('Listing results', () => {
  it('lists a mob searched by name, with its dungeon', async () => {
    const user = userEvent.setup()
    const { name, npcId } = firstMob()
    mount()
    await user.click(screen.getByRole('button', { name: 'open it' }))
    await user.type(screen.getByRole('combobox'), name)
    const row = await screen.findByTestId(`hit-${npcId}`)
    expect(within(row).getByText(name)).toBeInTheDocument()
    expect(within(row).getByText(dungeonList[0].englishName)).toBeInTheDocument()
  })

  it('says which spell put a mob in the list', async () => {
    const user = userEvent.setup()
    // A spell name that no mob is called, so every hit is spell-derived.
    const slug = dungeonList[0].slug
    const enemy = [...getLookup(slug)!.enemyById.values()].find((e) => e.spells.length > 0)!
    mount()
    await user.click(screen.getByRole('button', { name: 'open it' }))
    await user.type(screen.getByRole('combobox'), String(enemy.spells[0].id))
    const row = await screen.findByTestId(`hit-${enemy.id}`)
    expect(within(row).getByText(/casts /)).toBeInTheDocument()
  })

  it('says so when nothing matches, rather than showing an empty box', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'open it' }))
    await user.type(screen.getByRole('combobox'), 'zzzzqqqqxxxx')
    expect(await screen.findByText(/Nothing matches/)).toBeInTheDocument()
  })

  it('reports the true total when the cap bites', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'open it' }))
    await user.type(screen.getByRole('combobox'), 'a')
    expect(await screen.findByText(/Showing \d+ of \d+/)).toBeInTheDocument()
  })
})

describe('Choosing a result', () => {
  it('goes to the mob’s card on click', async () => {
    const user = userEvent.setup()
    const { slug, npcId, name } = firstMob()
    mount()
    await user.click(screen.getByRole('button', { name: 'open it' }))
    await user.type(screen.getByRole('combobox'), name)
    await user.click(await screen.findByTestId(`hit-${npcId}`))
    expect(screen.getByTestId('address')).toHaveTextContent(`/d/${slug}/codex/mob/${npcId}`)
  })

  it('goes to the first result on Enter', async () => {
    const user = userEvent.setup()
    const { slug, npcId, name } = firstMob()
    mount()
    await user.click(screen.getByRole('button', { name: 'open it' }))
    await user.type(screen.getByRole('combobox'), name)
    await screen.findByTestId(`hit-${npcId}`)
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('address')).toHaveTextContent(`/d/${slug}/codex/mob/`)
  })

  it('moves the selection with the arrow keys before Enter takes it', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'open it' }))
    await user.type(screen.getByRole('combobox'), 'a')
    await user.keyboard('{ArrowDown}')
    const rows = screen.getAllByTestId(/^hit-/)
    expect(rows[1]).toHaveAttribute('aria-selected', 'true')
    expect(rows[0]).toHaveAttribute('aria-selected', 'false')
  })

  it('does not walk the selection off either end of the list', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'open it' }))
    await user.type(screen.getByRole('combobox'), 'a')
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(screen.getAllByTestId(/^hit-/)[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('closes once a result has been taken', async () => {
    const user = userEvent.setup()
    const { npcId, name } = firstMob()
    mount()
    await user.click(screen.getByRole('button', { name: 'open it' }))
    await user.type(screen.getByRole('combobox'), name)
    await user.click(await screen.findByTestId(`hit-${npcId}`))
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
npx vitest run --project app src/components/SearchPalette.test.tsx
```

Expected: collection fails on `Failed to resolve import "./SearchPalette"`.

- [ ] **Step 4: Write the implementation**

Create `src/components/SearchPalette.tsx`:

```tsx
// ABOUTME: The search overlay, and the provider that lets any button open it.
// ABOUTME: An overlay rather than a field: the codex and route tabs have no room to give.

/**
 * Search, as an overlay.
 *
 * The codex and route tabs fill the viewport with fixed-width panels, so there is no space for a
 * search field on the two pages people spend the most time on. An overlay costs no layout and
 * behaves the same everywhere.
 *
 * The provider holds the open state so a button anywhere in the tree can raise it, and reads the
 * location so the dungeon a reader is already in sorts first.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { portraitUrl } from '../lib/data'
import { search, type SearchHit } from '../lib/search'
import { useI18n } from '../lib/i18n/context'
import { ThreatBadge } from './codex/Badges'

interface SearchControl {
  open: () => void
}

const SearchContext = createContext<SearchControl | null>(null)

export function useSearch(): SearchControl {
  const control = useContext(SearchContext)
  if (!control) throw new Error('useSearch outside a SearchProvider')
  return control
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const control = useMemo(() => ({ open }), [open])

  return (
    <SearchContext.Provider value={control}>
      {children}
      {isOpen && <Palette onClose={close} />}
    </SearchContext.Provider>
  )
}

function Palette({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // `/d/<slug>/…`. Absent on the home page, which is why the whole thing is optional downstream.
  const currentSlug = pathname.match(/^\/d\/([^/]+)/)?.[1]

  const results = useMemo(() => search(query, locale, currentSlug), [query, locale, currentSlug])

  // A new query is a new list: keeping the index would leave an unrelated row pre-selected, and
  // Enter would take it.
  useEffect(() => setSelected(0), [query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const go = (hit: SearchHit) => {
    navigate(`/d/${hit.slug}/codex/mob/${hit.npcId}`)
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((i) => Math.min(i + 1, results.hits.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const hit = results.hits[selected]
      if (hit) go(hit)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Clicking away closes it. Not a button: it is a backdrop, and it carries no label. */}
      <div className="absolute inset-0 bg-ink-950/70" onClick={onClose} aria-hidden="true" />
      <div className="relative w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-ink-700 bg-ink-900 shadow-2xl">
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded="true"
          aria-label={t('search.label')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('search.placeholder')}
          className="w-full border-b border-ink-800 bg-transparent px-4 py-3 text-sm text-ink-100 outline-none placeholder:text-ink-600"
        />

        {query.trim() && results.total === 0 && (
          <p className="px-4 py-6 text-center text-xs text-ink-400">
            {t('search.empty', { query: query.trim() })}
          </p>
        )}

        {results.hits.length > 0 && (
          <ul className="thin-scroll max-h-[50vh] overflow-y-auto">
            {results.hits.map((hit, i) => (
              <li key={`${hit.slug}:${hit.npcId}`}>
                <button
                  data-testid={`hit-${hit.npcId}`}
                  aria-selected={i === selected}
                  onClick={() => go(hit)}
                  onMouseEnter={() => setSelected(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left ${
                    i === selected ? 'bg-ink-800' : 'hover:bg-ink-800/50'
                  }`}
                >
                  {hit.displayId != null && (
                    <img
                      src={portraitUrl(hit.displayId)}
                      alt=""
                      loading="lazy"
                      className="h-7 w-7 shrink-0 rounded-full border border-gold-500/40 object-cover"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink-100">{hit.name}</span>
                      <ThreatBadge threat={hit.threat} />
                    </span>
                    <span className="block truncate text-[11px] text-ink-400">
                      {hit.dungeonName}
                      {hit.viaSpell ? ` · ${t('search.viaSpell', { spell: hit.viaSpell })}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-ink-800 px-4 py-2 text-[10px] text-ink-600">
          <span>{t('search.hint')}</span>
          {results.total > results.hits.length && (
            <span>{t('search.showing', { shown: results.hits.length, total: results.total })}</span>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run --project app src/components/SearchPalette.test.tsx
```

Expected: PASS, output pristine. React logs a warning if `aria-selected` lands on an element whose
role does not support it — if that appears, add `role="option"` to the button and `role="listbox"`
to the `<ul>`, and keep the test as it is.

- [ ] **Step 6: Typecheck and run the whole suite**

```bash
npm run typecheck
npm test
```

Expected: both clean. `tsc` is what proves `fr.ts` gained exactly the keys `en.ts` did.

- [ ] **Step 7: Commit**

```bash
git add src/components/SearchPalette.tsx src/components/SearchPalette.test.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit -m "Show what a search found, and go where a chosen row points"
```

---

### Task 3: Opening it from the keyboard, anywhere

**Files:**
- Modify: `src/components/SearchPalette.tsx` (the provider gains the key binding)
- Modify: `src/App.tsx`
- Create: `src/App.test.tsx`

**Interfaces:**
- Consumes: `SearchProvider` from Task 2.
- Produces: nothing new. `App` renders `<SearchProvider>` around the route table.

Background the implementer needs: **`src/routes/DungeonPage.tsx` already binds `Escape`, `Delete`
and `Ctrl+Z` on `document` in route mode, and this does not conflict** — that handler returns early
when the event target is an `<input>`, a `<textarea>` or contenteditable, because a key pressed in a
text field is text and not a command. The palette's input holds focus while it is open, so it takes
`Escape` without dropping the active drawing tool. The new binding needs the *same* guard for the
opposite reason: `/` is a printable character, and the route panel has a name field and a room-code
field where a slash is a slash.

- [ ] **Step 1: Write the failing tests**

Create `src/App.test.tsx`:

```tsx
// @vitest-environment jsdom
// ABOUTME: The app shell: that search is reachable from every page, by keyboard.
// ABOUTME: App was pure wiring until it mounted the palette; this is the test that follows.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { renderEn } from './test/render'

afterEach(cleanup)

const mountAt = (path: string) =>
  renderEn(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

describe('Reaching search from the keyboard', () => {
  it('opens on Ctrl+K from the home page', async () => {
    const user = userEvent.setup()
    mountAt('/')
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('opens on Cmd+K, for the same reason', async () => {
    const user = userEvent.setup()
    mountAt('/')
    await user.keyboard('{Meta>}k{/Meta}')
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('opens on a bare slash', async () => {
    const user = userEvent.setup()
    mountAt('/')
    await user.keyboard('/')
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('leaves a slash typed into a text field alone', async () => {
    // The route panel has a name field and a room-code field. A slash typed there is a slash,
    // and this is the case that will actually happen.
    const user = userEvent.setup()
    mountAt('/')
    const field = document.createElement('input')
    document.body.appendChild(field)
    field.focus()
    await user.keyboard('/')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(field).toHaveValue('/')
    field.remove()
  })

  it('is reachable from inside a dungeon too', async () => {
    const user = userEvent.setup()
    mountAt('/d/altar-of-fangs')
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run --project app src/App.test.tsx
```

Expected: FAIL — `Unable to find an accessible element with the role "combobox"` on every test that
expects one. If instead the whole file errors on a missing `scrollIntoView` or `ResizeObserver`, stub
them at the top of the file as `CodexPanel.test.tsx` and `DungeonPage.test.tsx` do; jsdom implements
neither, and mounting a dungeon page needs both.

- [ ] **Step 3: Add the binding to the provider**

In `src/components/SearchPalette.tsx`, inside `SearchProvider`, after the `close` callback:

```tsx
  // Ctrl/Cmd+K and a bare slash, from anywhere. The guard is the same one
  // `DungeonPage`'s handler uses, and for the same reason: a key pressed in a text field is
  // text, not a command. `/` needs it because it is printable; Ctrl+K gets it because one rule
  // is easier to keep true than two.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true
      if (typing) return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen(true)
        return
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setIsOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
```

- [ ] **Step 4: Mount the provider**

Replace the body of `src/App.tsx`:

```tsx
// ABOUTME: The route table: home, a dungeon's briefing, its codex (with a mob focused or not),
// ABOUTME: and its route — wrapped in the search palette, which every page can raise.

import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './routes/Home'
import HighlightsPage from './routes/HighlightsPage'
import DungeonPage from './routes/DungeonPage'
import { SearchProvider } from './components/SearchPalette'

export default function App() {
  return (
    <SearchProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/d/:slug" element={<HighlightsPage />} />
        <Route path="/d/:slug/codex" element={<DungeonPage mode="codex" />} />
        <Route path="/d/:slug/codex/mob/:npcId" element={<DungeonPage mode="codex" />} />
        <Route path="/d/:slug/route" element={<DungeonPage mode="route" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SearchProvider>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run --project app src/App.test.tsx
npm test
```

Expected: both clean. Watch specifically that no `DungeonPage` or `RoutePanel` test regressed — the
new `document` listener is live in every test that mounts `App`, and nowhere else.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/components/SearchPalette.tsx
git commit -m "Reach search from any page, with the keyboard"
```

---

### Task 4: The button that makes it discoverable

**Files:**
- Modify: `src/components/DungeonHeader.tsx`
- Modify: `src/routes/Home.tsx`
- Test: `src/components/SearchPalette.test.tsx` (extend), `src/routes/Home.test.tsx` (extend)

**Interfaces:**
- Consumes: `useSearch` from `src/components/SearchPalette.tsx`.
- Produces: nothing new.

A shortcut nobody knows about is a feature nobody has. Both surfaces get the same control, labelled
from `search.open` so the two stay in step.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/SearchPalette.test.tsx`:

```tsx
describe('The trigger button', () => {
  it('opens the palette from a dungeon header', async () => {
    const user = userEvent.setup()
    const lookup = getLookup(dungeonList[0].slug)!
    renderEn(
      <MemoryRouter initialEntries={[`/d/${dungeonList[0].slug}`]}>
        <SearchProvider>
          <DungeonHeader slug={dungeonList[0].slug} lookup={lookup} view="overview" />
        </SearchProvider>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
```

Add `import DungeonHeader from './DungeonHeader'` to that file's imports.

`src/routes/Home.test.tsx` currently mounts through, at line 16:

```tsx
const mount = () => renderEn(<Home />, { wrapper: MemoryRouter })
```

`Home` will call `useSearch`, which throws outside a provider, so **every test in that file breaks
until `mount` supplies one.** Change that one line rather than each test — they all read through it:

```tsx
const mount = () =>
  renderEn(
    <MemoryRouter>
      <SearchProvider>
        <Home />
      </SearchProvider>
    </MemoryRouter>,
  )
```

and add `import { SearchProvider } from '../components/SearchPalette'`. Note the wrapper moves from
the `options.wrapper` form to an explicit element, because two nested wrappers do not fit the
`wrapper` option; `renderIn` nests a caller's wrapper inside the locale provider, so this is
equivalent.

Then add the new test. **That file uses `fireEvent`, not `userEvent`** — match it:

```tsx
  it('offers a way into search, since a shortcut nobody knows is a feature nobody has', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.getByRole('combobox')).toBeDefined()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run --project app src/components/SearchPalette.test.tsx src/routes/Home.test.tsx
```

Expected: FAIL with `Unable to find an accessible element with the role "button" and name "Search"`.

- [ ] **Step 3: Add the button to the header**

In `src/components/DungeonHeader.tsx`, add the import:

```tsx
import { useSearch } from './SearchPalette'
```

and inside the component, before the `return`:

```tsx
  const { open: openSearch } = useSearch()
```

then in the `ml-auto` group, immediately before `{children}`:

```tsx
        <button
          onClick={openSearch}
          className="rounded border border-ink-800 px-2 py-1 text-xs text-ink-400 transition hover:border-gold-500 hover:text-gold-400"
        >
          {t('search.open')}
        </button>
```

- [ ] **Step 4: Add the button to the home page**

In `src/routes/Home.tsx`, add the import:

```tsx
import { useSearch } from '../components/SearchPalette'
```

destructure it beside the existing hook:

```tsx
  const { open: openSearch } = useSearch()
```

and put the control next to the locale switcher, replacing `<LocaleSwitcher />` in the header with:

```tsx
        <div className="flex items-center gap-2">
          <button
            onClick={openSearch}
            className="rounded border border-ink-800 px-2 py-1 text-xs text-ink-400 transition hover:border-gold-500 hover:text-gold-400"
          >
            {t('search.open')}
          </button>
          <LocaleSwitcher />
        </div>
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test
npm run typecheck
```

Expected: clean. Several existing tests mount `DungeonHeader` or `Home` **without** a
`SearchProvider`, and `useSearch` throws outside one — so this step will break them. Fix them by
wrapping their mount in `<SearchProvider>`, not by making `useSearch` return a no-op: a hook that
silently does nothing outside its provider hides exactly the mistake it should report.

- [ ] **Step 6: Commit**

```bash
git add src/components/DungeonHeader.tsx src/routes/Home.tsx src/components/SearchPalette.test.tsx src/routes/Home.test.tsx
git commit -m "Put search where it can be found without knowing the shortcut"
```

---

### Task 5: One end-to-end scenario

**Files:**
- Create: `e2e/search.spec.ts`

**Interfaces:**
- Consumes: the existing `e2e/urls.ts` and `e2e/fixtures.ts` helpers.

This proves the shortcut, the index and the navigation work together in a real browser, under the
deployed sub-path `/keystone-codex/` that the harness serves. `npm test` does not run it;
`npm run test:e2e` does.

**Two scenarios, where the design named one.** The single scenario it described covers the shortcut
and the navigation but not the thing that makes this feature more than a filter — that a spell
reaches its casters, and that the row says so. That is worth its own scenario rather than being
folded into the first and asserted on weakly.

- [ ] **Step 1: Write the failing test**

The suite navigates with a **relative** `goto` against the config's `baseURL`, which is what carries
the deployed sub-path — `await page.goto('./#/d/the-blinding-vale/route')`. Do not import a URL
helper and do not build an absolute URL: `e2e/urls.ts` exports only `APP` and `RELAY`, and they are
for the config and the fixtures.

Create `e2e/search.spec.ts`:

```ts
// ABOUTME: Search in a real browser: the shortcut opens it, an id lands on the right mob's card.
// ABOUTME: Runs under the deployed sub-path, so a wrong base URL fails here as it would live.

import { expect, test } from '@playwright/test'

/** Sporeblight Belcher, in The Blinding Vale. The tips suite already rests on this id. */
const NPC_ID = 254850

test('an id typed into the palette lands on that mob’s card', async ({ page }) => {
  await page.goto('./#/d/the-blinding-vale/route')

  // Ctrl+K from the route tab, which is the case the overlay exists for: the panels fill the
  // viewport and there is nowhere a search field could have gone.
  await page.keyboard.press('Control+k')
  const box = page.getByRole('combobox')
  await expect(box).toBeVisible()

  // An id rather than a name, so the assertion rests on the data and not on Wowhead's wording.
  await box.fill(String(NPC_ID))
  const row = page.getByTestId(`hit-${NPC_ID}`)
  await expect(row).toBeVisible()
  await row.click()

  await expect(page).toHaveURL(new RegExp(`/d/the-blinding-vale/codex/mob/${NPC_ID}`))
  await expect(page.getByRole('combobox')).toHaveCount(0)
})

test('a spell reaches the mob that casts it', async ({ page }) => {
  // Belch Spores, one of Sporeblight Belcher's six spells — the same spell CONTRIBUTING uses as
  // its worked example. Searched by id rather than name so the assertion does not rest on
  // Wowhead's wording, which the pipeline may re-fetch at any time.
  const SPELL_ID = 1263636

  await page.goto('./#/d/the-blinding-vale')
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox').fill(String(SPELL_ID))

  const row = page.getByTestId(`hit-${NPC_ID}`)
  await expect(row).toBeVisible()
  // The row has to say why it is a row, or a list of mobs after typing a spell is a mystery.
  await expect(row).toContainText('casts')

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/d/the-blinding-vale/codex/mob/`))
})
```

- [ ] **Step 3: Run it to verify it fails, then passes**

```bash
npx playwright install chromium
npm run test:e2e -- search.spec.ts
```

Run it once against `main`'s build to see it fail if you can; otherwise verify the failure by
temporarily changing the expected URL, confirming the test reports that, and changing it back.

Ports 4173 and 8787 must be free. The relay may print an
`[WebServer] ... Uncaught Error: internal error` line on some runs — that is
**recorded in CLAUDE.md as a known, undiagnosed line**, not something this task introduced. Do not
chase it.

- [ ] **Step 4: Run the whole end-to-end suite**

```bash
npm run test:e2e
```

Expected: every scenario passes, the new one included.

- [ ] **Step 5: Commit**

```bash
git add e2e/search.spec.ts
git commit -m "Prove search works in a browser, under the deployed sub-path"
```

---

## Final verification

- [ ] `npm test` — all green, output pristine
- [ ] `npm run typecheck` — clean
- [ ] `npm run build` — succeeds
- [ ] `npm run test:e2e` — all green
- [ ] `npm run dev`, then by hand: `Ctrl+K` on the home page, on a briefing, on the codex tab and on
      the route tab; search a mob name, a mob id, a spell name and a spell id; check the French
      locale finds a mob by its English name
- [ ] Open the PR against `main`, describing the two decisions that carry the design (every result
      is a mob; an overlay because the tabs have no room) rather than restating the diff

## Notes for whoever executes this

- **The design doc is on this branch** and is the argument behind these choices. Read it before
  changing one.
- **Do not add a fuzzy matcher.** 260 mobs is small; the design says why.
- **Do not index the prose.** Explicitly out of scope, and it wants a different row shape.
- If a test here turns out to be wrong, say so and fix the test deliberately — but never delete one
  because it fails. Raise it instead.
