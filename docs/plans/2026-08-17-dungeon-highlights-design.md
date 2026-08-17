# A dungeon's highlights page — design

**Goal:** clicking a dungeon opens a full-width page that answers "what kills us here?" in
two screens — the spells to know, the traps, the bosses — before the map and the codex are
ever loaded.

**Why now:** the material already exists and nobody reads it in aggregate. The codex holds
**419 spells marked `prio: 1`** across 226 mob files, **215 written `trap:` sentences**, plus
`threat`, `role` and the `tag` on every annotated spell. Today all of it is reachable only one
mob at a time, through a 400px panel, after picking the right blip on a map. A derived page
turns the same content into a briefing, and costs no new writing: filling in a mob card
updates the page by itself.

The reference is method.gg's dungeon guide, which opens on an "Important abilities" table and
a per-mob breakdown. We take its shape, not its length — see decision 2.

## What is derived and what is not

Everything on the page comes from `content/**.md` and the generated MDT data. One new
hand-written field is introduced, and only because the data genuinely does not exist:
`bosses:` in `_dungeon.md` (decision 4).

## The decisions

### 1. Highlights is the landing page; the map moves to `/d/:slug/map`

| Route | Component | Note |
| --- | --- | --- |
| `/` | `Home` | unchanged, still links to `/d/:slug` |
| `/d/:slug` | `HighlightsPage` | **new**, full width, no map |
| `/d/:slug/map` | `DungeonPage` | today's page, moved |
| `/d/:slug/map/mob/:npcId` | `DungeonPage` | mob selected in the codex |
| `*` | → `/` | unchanged |

Full width rather than a third tab in the 400px aside: a table of spells with a mob name on
the right does not fit in 400px, and the aside already has two tenants.

**Every address under `/d/:slug` therefore changes, and no compatibility shim is written for
the old ones.** The app has no users yet, so a breaking change costs nothing today and a
redirect layer would be dead code we would carry forever. One consequence has to be followed
through: `sessionLink()`
([RoutePanel.tsx:44](../../src/components/route/RoutePanel.tsx:44)) builds
`#/d/:slug?room=XXX`, which under the new table is the highlights page — a reading page with
no route editor and nothing that reads `?room=`. It emits `#/d/:slug/map?room=XXX` instead.

An invitation or a mob link sent before this change lands on `*` and goes home. That is
accepted, not overlooked. **If this app ever ships a link people keep, the same move will
need the redirect that is deliberately absent here.**

### 2. The page is a briefing, not a copy of the guide

method.gg lists every trash mob with its bullets. Ours does not: that is what the codex is
for, and duplicating it would make the page long in exactly the dungeons where it matters
most. Four blocks, in this order:

1. **Header band** — dungeon name, forces, packs, timer, one-sentence `summary`, and the
   button to the map.
2. **Spells to know** — the table.
3. **Traps** — every `trap:` sentence, two columns.
4. **Bosses** — one card each.

### 3. One row per mob, not per spell

**A row is a mob.** Its name, its threat pip, and every `prio: 1` spell it carries as a chip
on that same line — icon, name, tag. Bosses are excluded: they have their own block, and their
spells are a fight rather than a pull.

This is a measurement, not a preference. Counting the real content four ways, rows per dungeon:

| Rule | Altar | Nalorakk | King's Rest | Murder Row | Ruby | Sethraliss | Blinding Vale | Voidscar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| One row per spell | 14 | 36 | 44 | 45 | 26 | **52** | 29 | 47 |
| **One row per mob** | 12 | 26 | 29 | 30 | 19 | 29 | 19 | 27 |
| Threat cut, per spell | 9 | 13 | 28 | 23 | 13 | 23 | 9 | 22 |
| Threat cut, per mob | 7 | 9 | 17 | 13 | 8 | 11 | 5 | 9 |

One row per spell puts two screens of table in Temple of Sethraliss alone. The threat cut is
shorter still, but it was measured too: **2 to 11 mobs per dungeon carry no `threat` yet**, and
they would vanish without anyone able to tell whether they are harmless or merely unjudged. One
row per mob discards nothing and halves the worst case. It is also what method.gg's own table
is, visually — their seven rows are seven mobs.

Sorted by danger: `threat` descending (`lethal > high > medium > low > unset`), then mob name,
locale-aware.

**Deduplication by resolved spell name stays, and is worth nothing.** Two ids of one spell on
one mob must not produce two chips, so the rule is right — but measured across the whole codex
it merges 293 rows into 290. Three. The earlier claim that it was the mechanism keeping the
table short was wrong: on Twinfang Harrower only one of the five *Paralyzing Shots* ids carries
`prio: 1`, so the filter removes the other four before deduplication ever sees them. It is a
correctness rule, not a volume control, and nothing should be built on it.

Each chip carries what MDT already knows — `interruptible`, `dispel` — alongside the
hand-written `tag`, exactly as the codex badges do. A spell absent from `spells.json` falls
back to `#id`, as `kickList` already does.

### 4. Boss order: `mdtIdx`, with an optional override

`encounterID` cannot order or group anything: the three bosses of Altar of Fangs all report
`enc=2880`, the five of Murder Row all report `enc=2681`. `mdtIdx` is the only signal, and it
is right most of the time — Altar of Fangs yields Rav'i → The Writhing Coil → Zul'jan, which
is the order method.gg's own sidebar shows.

It is wrong for King's Rest. The order `mdtIdx` yields there is The Golden Serpent (6) →
Mchimba the Embalmer (18) → **King Dazar (25)** → Aka'ali the Conqueror (34) → Zanazal the
Wise (35) → Kula the Butcher (36). King Dazar is the dungeon's final boss and lands third: the
three Council of Tribes NPCs were reintroduced with new ids in the 269xxx range, so they sort
after everything that predates them. Whatever the true order is, `mdtIdx` is not it.

The correct sequence has to be declared, and it is a game fact rather than a repository one —
**RwlRwlRwlRwl confirms it before it is written.** The implementation plan carries the BfA
order (Golden Serpent → Mchimba → Council of Tribes → King Dazar) as the value to confirm, not
as a value to trust.

So: order by `mdtIdx`, unless `_dungeon.md` declares `bosses: [npcId, npcId, …]`, which wins.
Nothing has to be written for the page to work; one line makes King's Rest correct.

### 5. Boss traps live on the boss card, not in the trap list

The trap list covers non-boss mobs only. A boss's `trap:` sentence appears on its card in the
boss block, where its spells already are. Printing it in both places would be the same
sentence twice on one screen.

## The derivation layer — `src/lib/highlights.ts`

A pure module: no React, no DOM, testable under the `node` project. One entry point.

```ts
getHighlights(slug: string, locale: Locale): DungeonHighlights
```

```ts
/** One chip on a mob's row. Several ids can carry one name; the chip is the name. */
interface HighlightSpell {
  ids: number[]
  name: string
  icon: string
  tags: SpellTag[]
  /** From MDT, as the codex badges use it. */
  interruptible: boolean
  dispel: string[]
  /** The first non-empty note among the merged ids. */
  note?: string
}

/** A row of the table, and equally a card of the boss block — the shape is the same. */
interface HighlightMob {
  npcId: number
  name: string
  displayId?: number
  threat?: Threat
  role?: string
  /** The `trap:` sentence, already through `inlineMarkdown`. Carried for the boss cards. */
  trapHtml?: string
  spells: HighlightSpell[]
}

interface HighlightTrap {
  npcId: number
  mobName: string
  threat?: Threat
  html: string
}

interface DungeonHighlights {
  /** Non-boss mobs holding at least one `prio: 1` spell, most dangerous first. */
  mobs: HighlightMob[]
  /** Non-boss mobs holding a `trap:` sentence — a different population from `mobs`. */
  traps: HighlightTrap[]
  /** Every boss, in the declared or the `mdtIdx` order. */
  bosses: HighlightMob[]
}
```

`mobs` and `traps` are two different populations, not two views of one: a mob can carry a trap
with no `prio: 1` spell, and the reverse. Deriving one from the other in the components would
put the selection rule in the view, which is the thing this module exists to hold.

Memoised **per locale**, like `indicators.ts` — deduplication keys on the resolved spell
name, which is not the same string in English and in French, and neither is the sort order.

Mobs are visited unique by `enemy.id`: the same NPC can appear several times in
`dungeon.enemies` as variants, and `content-stub` already applies the same rule when it
writes one card per NPC.

A mob with no `.md` file contributes nothing and breaks nothing. The invariant holds: the page
is empty-tolerant by construction, and grows as the codex is written.

## Components

`src/routes/HighlightsPage.tsx`, and three pieces under `src/components/highlights/`:

| Component | Renders |
| --- | --- |
| `MobTable` | one row per mob: name and threat pip on the left, its `prio: 1` spells as chips (icon · name with a Wowhead link · tag badge) on the right. The mob name links into its codex entry. |
| `TrapList` | two columns; mob name in bold, threat pip, the sentence. |
| `BossStrip` | one card per boss: portrait, name, its trap, its `prio: 1` spells. |

`ThreatBadge`, `TagBadge` and `DispelBadges` from
[Badges.tsx](../../src/components/codex/Badges.tsx) are reused as they are, as are `iconUrl`,
`portraitUrl` and `wowheadUrl` from `lib/data`.

**One targeted refactor.** The dungeon header — name, forces, packs, timer — is written inline
in `DungeonPage`. Both pages need it now, so it moves to `src/components/DungeonHeader.tsx`,
gaining the Map ↔ Highlights link. Behaviour unchanged; the existing `DungeonPage` tests stay
as they are and are the proof of that.

## Content and i18n

`DungeonContent` gains `bosses?: number[]`, parsed in [content.ts](../../src/lib/content.ts)
and merged the way `timer` and `summary` are. `buildDungeonStub()` in
`scripts/content-stub.mjs` gains the matching commented line — and, as always, never rewrites
a file that exists.

New `highlights.*` keys go into `en.ts`. Because every other dictionary is typed against it,
`tsc` fails until `fr.ts` has them too; no game term enters either file.

## Tests

Written first, in this order.

| File | Runner | Covers |
| --- | --- | --- |
| `src/lib/highlights.test.ts` | node | a row is a mob and carries every one of its `prio: 1` spells; two ids of one name make one chip; bosses absent from the table; threat ordering; `bosses:` override honoured; a mob with no card contributes nothing; `en` and `fr` genuinely differ |
| `src/lib/content.test.ts` | node | `bosses:` parses, and merges like `timer` |
| `src/components/highlights/*.test.tsx` | jsdom | each block renders against the real Altar of Fangs pool, in both locales |
| `src/routes/HighlightsPage.test.tsx` | jsdom | the four blocks assemble against a real dungeon; an unknown slug behaves as today |
| `scripts/content-stub.test.mjs` | node | the dungeon stub carries the new line |

Updated rather than new: `DungeonPage.test.tsx` (route table), `RoutePanel.test.tsx` (the
`sessionLink` expectation).

All of it runs against real generated data and real `content/*.md`, as the rest of the suite
does. Nothing here needs a network or a WoW install.

## Out of scope

- **Grouping trash by boss segment**, as method.gg does ("Rav'i Trash", "The Writhing Coil
  Trash"). Neither MDT nor the codex knows which segment a mob belongs to, and inventing the
  grouping by position would be a guess presented as fact.
- **Affixes**, route plans, and anything else `_dungeon.md` currently stubs out.
- **Any interface state.** The page is read-only: no folding, no filtering, no selection.
- **New generated data.** The extraction chain is untouched.

## What this makes possible next

The page is a mirror of `content/`, so its quality is the codex's quality. The obvious follow
-up is a pass over the mob cards themselves — filling in missing `threat` values and spell
notes, whether from method.gg's written guide or from a video transcript — which raises the
highlights page mechanically, with no code change. That is a content project, and gets its
own decision.
