# A rank axis for mobs — design

**Goal:** let a card say what a mob *ranks* as — a boss, a miniboss, or neither — instead of
inferring it from MDT's single boolean, and stop `role` from carrying two unrelated meanings.

**Why now:** `enemy.isBoss` is the only rank the app knows, and it is wrong in both directions on
shipped content. `role` grew a `miniboss` value to paper over one of those directions, which made a
field documented as "what shape of mob it is" ([CONTRIBUTING.md](../../CONTRIBUTING.md)) also answer
"how big a deal is it".

**Depends on:** nothing. It touches no tips code. But it edits `indicators.ts`, `highlights.ts`,
`CodexPanel.tsx`, `DungeonMap.tsx` and `MobCard.tsx` — every one of which the `tips-discoverability`
branch also edits — so the **implementation** branch is cut from `main` after that work lands. This
design document is cut from `main` and conflicts with nothing.

## What the data actually says

Three facts, measured over the eight generated dungeons rather than assumed:

**`role` is already a shape field, unanimously.** All 36 mobs MDT flags `isBoss` carry a card, and
every one of those cards records a shape — `melee`, `caster`, once `add`. Not one says `boss`. The
value was never missing; the field was never the place for it.

**MDT flags things players do not call bosses.** Echo of Nalorakk has 3.4M health against
Nalorakk's 21.9M, and its own card calls it `role: add` — yet it wears the gold ring, the 22px blip,
the `BOSS` label, a slot in the codex's boss group and a row in the Overview's boss strip, beside
the real Nalorakk. King's Rest reports six bosses for three encounters; the Blinding Vale reports
six.

**And it does not flag things players do call minibosses.** `count: 0` units with enormous health
and no flag: Murder Row's Infernal at 202M, Altar of Fangs' Uncoiled Writhe at 32M, King's Rest's
T'zala at 27M, Den of Nalorakk's Zul'jarra at 21.9M, Temple of Sethraliss' Lightning Spire at 21.6M.
On the map they are ordinary blips.

**`encounterID` cannot arbitrate.** [`highlights.ts`](../../src/lib/highlights.ts) already records
that Altar of Fangs' three bosses all report 2880; the same collapse holds in five of the eight
dungeons. Three carry genuine per-encounter ids — King's Rest, Temple of Sethraliss and Ruby Life
Pools, where Erkhart and Kyrakka correctly share 2503 — so the field is neither reliably present nor
reliably absent. Nothing in the generated data separates "a numbered encounter" from "a unit that
appears in one".

## The decisions

### 1. `rank` is a new field, not a new `role` value

`MobContent.rank?: 'boss' | 'miniboss'`. A judgement, so it lives in the base card only and never in
a `.fr.md`, exactly as `threat`, `role`, `tag` and `prio` do.

Adding `boss` to `ROLES` was the obvious move and is the wrong one: it would put a second,
hand-maintained answer beside MDT's, free to disagree with it, in a field 36 cards already use for
something else. Separating the axes costs one field and removes the ambiguity permanently.

### 2. Absent, it inherits MDT

`rank = content.rank ?? (enemy.isBoss ? 'boss' : undefined)`.

No card changes meaning by not being edited. That is what makes the migration safe, and it keeps the
invariant that a mob with no `.md` entry still renders correctly.

### 3. Unlike `role`, an unknown value is ignored — and caught by a test

`role` is free text on purpose: it is *displayed*, so a typo renders verbatim and the reader sees
the word someone wrote ([content.ts](../../src/lib/content.ts), `isRole`). `rank` is never displayed
as text — it decides placement — so the same tolerance would let `rank: bos` silently drop a boss
off the Overview with nothing on screen to say so.

An unrecognised value is therefore ignored, MDT's answer stands, and
[`content.integrity.test.ts`](../../src/lib/content.integrity.test.ts) gains an assertion that every
`rank:` under `content/**` is a legal value. That file already checks every declared image both
exists and parses; this is the same idea applied to the one field where a typo is invisible. The
typo fails a test run instead of shipping.

### 4. One derivation, six consumers

`MobIndicators` gains `rank`, filled inside `getIndicators` from the `getMobContent` call it already
makes — the one-line pattern `hasTips` established. Nothing downstream reads `enemy.isBoss` again.

| Consumer | Today | After |
| --- | --- | --- |
| `ring` | `isBoss` → gold | `rank === 'boss'` → gold |
| `blipRadius` | 22 or 14 | 22, **18**, or 14 |
| `priority` | `isBoss \|\| role === 'miniboss' \|\| threat high\|lethal` | `rank !== undefined \|\| threat high\|lethal` |
| `earnsARow` | `… \|\| role === 'miniboss'` | `… \|\| rank !== undefined` |
| `CodexPanel` boss group | `e.isBoss` | `rank === 'boss'` |
| `getHighlights` boss strip | `enemy.isBoss` | `rank === 'boss'` |

`CodexPanel` currently filters enemies without reading content at all. It will call `getIndicators`
per enemy, which is cached per `locale/slug/npcId` and already called for every card it renders.

`earnsARow`'s new condition reads as "any rank at all", but it can only ever see a miniboss: bosses
leave the loop before it, in the branch above. Written as `rank !== undefined` it stays correct if
decision 7 is ever revisited.

### 5. Size carries rank; colour carries threat

A miniboss gets an 18px blip, between trash's 14 and a boss's 22, and **keeps its threat ring
colour**.

Giving minibosses their own ring colour was the first instinct and it is wrong: the ring colour *is*
the threat rating, so a miniboss colour would overwrite green, amber, orange or red on exactly the
mobs whose threat matters most. Bosses keep the gold override they already have — they are the
exception, not the rule a miniboss should copy.

The map legend gains a row for the mid-size blip, in its ring group — where the blip is already
explained, and where `legend.ring.boss` sits today. Without it, a size difference is a signal nobody
was told about.

### 6. A miniboss is marked in place, not given its own list

It leaves the boss group and the boss strip. It does **not** gain a "Minibosses" section in either
the codex panel or the Overview: it stays in the trash list and the mob table, wearing a `MINIBOSS`
label.

The Overview is already four sections deep, and a fifth buys grouping for a category that is a
handful of mobs per dungeon. The label is what a reader needs; a section is what a reader has to
scroll past.

### 7. Demotion stops at miniboss

There is no value meaning "MDT flagged this and it is plain trash". Every mismatch found in the data
is served by `miniboss`. If a real case appears, it is a third value in an existing enum, not a
redesign.

`rank: boss` on a mob MDT does not flag is legal and works — `orderBosses` sorts by `mdtIdx`, which
every enemy has — but no shipped card needs it.

## Migration

Thirty base cards say `role: miniboss`, spread across all eight dungeons. None is in a `.fr.md`; no
`.fr.md` carries `role` at all.

Scripted and mechanical: `role: miniboss` becomes `rank: miniboss`, and `role:` is left empty. It is
lossless on screen — `priority` and `earnsARow` both key off `rank` afterwards, so the same mobs
keep the same weight and the same table rows.

Those thirty cards then record no *shape*. That is deliberate: the shape is a judgement worth making
from having played the pull, not from pattern-matching a spell list, and inventing one would be
inventing a fact. A follow-up issue lists them.

**`miniboss` leaves `ROLES` in the same commit as the migration.** A card still saying
`role: miniboss` after the removal would render the literal word and grant nothing — the two changes
are one change.

## What gets built

| File | Change |
| --- | --- |
| `src/lib/content.ts` | `MobContent.rank`, a strict parse, `miniboss` out of `ROLES` |
| `src/lib/content.integrity.test.ts` | Every `rank:` under `content/**` is a legal value |
| `src/lib/indicators.ts` | `MobIndicators.rank`; `ring` and `priority` read it |
| `src/components/map/viewport.ts` | `blipRadius` takes rank: 22 / 18 / 14 |
| `src/components/codex/MobCard.tsx` | `MINIBOSS` label beside the existing `BOSS` one |
| `src/components/codex/CodexPanel.tsx` | Boss group filtered on rank |
| `src/components/map/DungeonMap.tsx` | Tooltip label; one legend row |
| `src/lib/highlights.ts` | Boss strip and `earnsARow` on rank |
| `src/lib/i18n/*` | `mob.miniboss`, `map.miniboss`, `legend.ring.miniboss`, both dictionaries |
| `content/**/*.md` | The thirty-card migration |
| `scripts/content-stub.mjs` | Scaffold: a `rank:` line, `miniboss` out of the role comment |
| `CONTRIBUTING.md` + `.fr.md` | Field table, the `role` row, the `.fr.md` exclusion list — same commit |
| `.claude/skills/codex-content/SKILL.md` | When to call something a miniboss |

## Testing

| Level | What it covers |
| --- | --- |
| Unit | `rank` inherits `isBoss`, a card overrides it to `miniboss`, a card promotes an unflagged mob, an unknown value is ignored; `earnsARow` through rank; `blipRadius` at all three sizes; the integrity assertion |
| Integration | The `MINIBOSS` label on a card; `CodexPanel` putting a demoted mob in the trash group; the map's blip size and the new legend row |
| End-to-end | Den of Nalorakk's Overview boss strip lists three bosses, not four — the whole stack proving Echo of Nalorakk moved |

No mocks: the tests read the real cards through the real loader, as the suite already does. The
promotion and unknown-value branches have no real content to exercise them, so they use
`content/__fixtures__/`, which is unreachable from the app and exists for exactly this.

## Deliberately not in this slice

- **Filling in the shape** of the thirty migrated cards. A follow-up issue, and a human judgement.
- **A third rank value.** Decision 7.
- **A minibosses section** on the Overview or in the codex panel. Decision 6.
- **Any use of `encounterID`.** It groups nothing usable, and this design does not need it to.
