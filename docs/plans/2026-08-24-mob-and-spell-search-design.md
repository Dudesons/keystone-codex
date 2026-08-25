# Finding a mob by its name, its id, or a spell it casts — design

**Goal:** let a reader type a mob name, a mob id, a spell name or a spell id and land on the right
mob's card, from anywhere in the app.

**Why now:** nothing in the app searches anything. The codex holds 260 mob rows across 8 dungeons
and 976 spell references, and the only way to reach one is to remember which dungeon it is in and
scroll. The question a player actually asks — *"which dungeon has Hex Volley, and who casts it?"* —
has no answer in the interface at all.

**Depends on:** nothing. Every piece of data it needs is already loaded eagerly.

## What there is to search

Measured, not estimated:

| | Count |
| --- | --- |
| Dungeons | 8 |
| Mob rows across all dungeons (`enemies`) | 260 |
| Distinct npcs with localized labels (`npcs.json`) | 259 |
| Distinct spells with localized labels (`spells.json`) | 881 |
| Spell references from a mob to a spell | 976 |
| Most spells on a single mob | 22 |

All of it is already in memory: `src/data/generated/*.json` is loaded eagerly through
`import.meta.glob`, about 0.86 MB. **An index over this costs one pass over data the app has
already paid for**, which is what makes the rest of this design cheap — no lazy loading, no
network, no search dependency, no fuzzy-match library.

## The decisions

### 1. Every result is a mob

A mob already has an address — `/d/<slug>/codex/mob/<npcId>` — and a spell has none.

Rather than invent a spell route and then decide what a spell page shows beyond what the mob card
already shows, a spell match resolves to **the mobs that cast it**. Searching *Hex Volley* answers
"where do I meet this" directly, which is the question behind the search. A spell cast by three
mobs is three results, and that is the honest answer rather than a limitation.

This also means there is exactly one kind of row to design, one kind of navigation to test, and no
new route.

### 2. Global, with the current dungeon first

Results span every dungeon and each row names its own. Scoping to the current dungeon would answer
a narrower question than the one people have, and a global list subsumes it as long as the dungeon
is visible on every row.

Where the reader already is still matters, so within a ranking tier the current dungeon's mobs come
first. That is a sort, not a filter: a better match elsewhere still outranks a weak match here.

### 3. Both the localized name and the English one

`npcs.json` carries a name per locale, and the two genuinely differ — Merektha in English is
**Merekpha** in French. MDT is the authority on the English name, guides are written with it, and a
French reader who read one needs to find the mob from the name they read.

Matching both is free, so both are indexed. Same for spells.

### 4. Digits mean an id; anything else means a name

Two query modes, chosen by the query itself:

- **All digits** → exact match against `npcId`, and against every spell id a mob casts. `262398`
  finds the mob; `1306911` finds whoever casts that spell.
- **Anything else** → accent-folded, case-insensitive substring against the indexed names.

Exact rather than prefix for ids, because an id is a thing you paste, not a thing you explore, and
a prefix match on `13` would return most of the corpus. Accent folding matters in both directions:
`nalorakk` has to reach *Nal'orakk*, and a French label typed without accents has to reach itself.

### 5. Deterministic ranking, and a visible cap

Four tiers, in order: exact name match, name starts with the query, name contains it, matched only
through a spell. Current dungeon first within a tier; mob name as the final tie-break so the order
never depends on iteration order.

Determinism is what lets a test pin the order at all. Twenty rows are shown, **and the total is
displayed next to them** — a silent truncation reads as "that is everything" when it is not.

### 6. A row says why it is a row

Name, dungeon, and the threat ring the codex already uses. When the match came from a spell and not
from the mob's name, the row also says which spell — `casts Hex Volley`. Without that, a search for
a spell returns a list of mobs with no visible connection to what was typed.

### 7. An overlay, because the pages that matter have no room

The codex and route tabs fill the viewport with fixed-width panels (360px and 400px, no
breakpoints). There is no space to grow into on the two pages people spend the most time on, so
search cannot be a field in the layout without a redesign that is not what this is for.

An overlay costs zero layout and behaves identically on every page. It mounts once in `App.tsx` so
it is reachable from every route, including the home page, which has no `DungeonHeader`.

Opened three ways: `Ctrl/Cmd+K`, `/`, and a visible button in `DungeonHeader` and on `Home`. The
button is what makes it discoverable; the shortcut is what makes it worth using twice.

`/` is a printable character, so the palette's own opening handler needs the same typing guard the
route handler has: the route panel holds a name field and a room-code field, and a slash typed into
either is a slash. `Ctrl+K` does not need the guard but gets it anyway, because one rule is easier
to keep true than two. A test covers the slash-in-a-field case specifically — it is the one that
will actually happen.

### 8. The existing key handler needs no changes

Route mode already binds `Escape`, `Delete` and `Ctrl+Z` on `document`
(`src/routes/DungeonPage.tsx`), which looks like a conflict and is not: **that handler already
returns early when the event target is an `<input>`, a `<textarea>` or contenteditable**, because a
key pressed in a text field is text and not a command.

A palette whose input holds focus therefore takes `Escape` without dropping the active drawing
tool, and takes `Ctrl+Z` without fighting undo — for free, through a guard that is already there
for a different reason. A test pins it, because it is the kind of thing a later refactor of that
guard would silently break.

## What gets built

| File | Role |
| --- | --- |
| `src/lib/search.ts` | **New.** Builds the index and answers a query. Pure, no React, cached per locale following `getLookup`'s pattern. |
| `src/lib/search.test.ts` | **New.** Unit tests against the real generated data. |
| `src/components/SearchPalette.tsx` | **New.** The overlay: input, result rows, keyboard navigation. |
| `src/components/SearchPalette.test.tsx` | **New.** Integration tests. |
| `src/App.tsx` | Mounts the palette once, alongside the route table. |
| `src/components/DungeonHeader.tsx` | The trigger button. |
| `src/routes/Home.tsx` | The trigger button. |
| `src/lib/i18n/en.ts`, `fr.ts` | The new strings. |
| `e2e/search.spec.ts` | **New.** One scenario in a real browser. |

The index entry is one per (dungeon, mob) — 260 of them — carrying the mob, its slug, its folded
names, its npcId and the folded names and ids of its spells. Nothing else needs to be derived, and
no generated file changes.

## Testing

**Unit** (`src/lib/search.test.ts`), against the real data rather than a fixture, since the real
data is what ships:

- a digit query matches an `npcId` exactly, and does not match a mob whose name contains those digits
- a digit query matches a spell id and returns its casters
- a spell cast by several mobs returns several rows
- accent folding: a query with no accents finds an accented French label, and the reverse
- the English name finds a mob while the French locale is active (the Merektha/Merekpha case)
- ranking: exact before starts-with before contains before spell-only
- the current dungeon sorts first within a tier
- the cap returns 20 rows and reports the true total
- a query matching nothing returns nothing rather than everything

**Integration** (`SearchPalette.test.tsx`), jsdom, through `renderEn`/`renderFr`:

- opens on `Ctrl+K`, on `/`, and on the button
- arrow keys move the selection, Enter navigates to the mob's card
- `Escape` closes it
- a spell-derived row shows which spell it matched
- the row count and total are both shown when the cap bites

**E2E** (`e2e/search.spec.ts`): from the route tab, open the palette, type a spell name, press
Enter, and land on the casting mob's card — the one path that proves the shortcut, the index and
the navigation work together in a real browser with the deployed sub-path.

## Deliberately not in this slice

- **Searching the written prose, notes and traps.** The ask was name and id. Prose search wants a
  different index, a different row shape and a decision about excerpting; it is a separate feature,
  not a bigger version of this one.
- **A shareable search URL.** The overlay holds no address. If searching turns out to be something
  people link to, that is a small follow-up.
- **Fuzzy matching and typo tolerance.** 260 mobs is small enough that substring matching finds
  things, and a fuzzy matcher would be a dependency plus a relevance-tuning problem for a corpus
  that does not need it.
- **Searching POIs, traps or dungeon names.** A dungeon is already one click from home.
