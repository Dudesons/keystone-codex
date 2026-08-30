# A season-wide tips index — design

**Goal:** one page listing every tip written in the season, grouped by dungeon, where the dungeon
name opens that dungeon's map and each tip row jumps the map to the pull the tip is about.

**Why now:** a tip is only reachable today by opening the dungeon that holds it and scrolling its
briefing, or by finding the `?` pip on the map. Nothing shows what has been written across the
season, which is the view a reader wants before deciding where to spend an evening — and the view a
contributor wants, to see how thin the coverage still is.

**Honest state of the content:** exactly **one** real tip exists — Sporeblight Belcher in The
Blinding Vale, one video, `packs: [44]`. Everything else under `content/**` carrying `tips:` is a
fixture. This page will show one dungeon and one row on the day it ships. That is a fact about the
codex, not a reason to shape the page around emptiness, but it is why the design leans on
derivation: the page fills in as cards are written, with no code change.

**Depends on:** the tips feature, the `?` badge from
[`2026-08-23-tip-discoverability-design.md`](2026-08-23-tip-discoverability-design.md), and tip
scope from [`2026-08-23-tip-scope-design.md`](2026-08-23-tip-scope-design.md). All merged.

## The decisions

### 1. A new top-level route, `/tips`, reached from the home header

`/tips` sits beside `/`, not under `/d/:slug`: it spans the season, and `DungeonHeader`'s three tabs
are views *of one dungeon*. Adding a fourth tab there would make a season-wide page look like a
dungeon-local one.

Its one entry point is a link in the home page header, beside the search button and the locale
switcher. The home page is the only other page that spans all dungeons, so it is the only place
where a season-wide link is not a non-sequitur. Not in `DungeonHeader`, not in the footer, not in
the search palette — those can be added later if the page proves worth finding from elsewhere;
adding them now is furniture ahead of demand.

### 2. The data is derived, never authored — `src/lib/tipIndex.ts`

```ts
getSeasonTips(locale): { slug: string; name: string; tips: HighlightTip[] }[]
```

built from `dungeonList` × `getHighlights(slug, locale).tips`. It invents no new concept and reads
no new file: `getHighlights` already collects every mob carrying tips and sorts them most-dangerous
first, so the index inherits that order rather than choosing a second one that could disagree with
the briefing's.

It is a thin function and it still earns its own module and its own unit test, for the same reason
`highlights.ts` is not inlined into `HighlightsPage`: the page then holds no logic to test through
a DOM.

### 3. The tip card is extracted from `TipList`, not copied

`TipList` already renders exactly the card this page needs — mob name linking to its codex entry, a
`ThreatBadge`, and `MobTips` mounted underneath. That card moves into its own component and both
pages mount it.

Mounting `MobTips` rather than re-rendering tips is not a convenience: the guarantee that nothing
reaches YouTube before a click lives inside that component, in its own state. A second renderer
would have to earn that guarantee again, and would be free to forget it. `TipList`'s own comment
already says so, and this design does not create the second renderer it warns about.

### 4. The pull chip becomes the jump control, inside `MobTips`

`MobTips` already draws a `PackChip` per row reading `Pack 44`. It becomes a `Link`. The control
that says which pull the tip is about is the control that takes you there; a separate button beside
it would be a second thing naming the same pull.

Because `MobTips` is one renderer mounted in three places, the codex card and the briefing gain the
jump in the same change as the index. Inside the codex that link resolves in place — react-router
swaps the location, `DungeonPage` re-reads its params, and only the map moves.

A tip with no `packs:` gets the same chip shaped for the mob instead of no chip at all, so rows do
not go ragged and every row carries one control.

**The cost, recorded rather than hidden:** `MobTips.test.tsx` renders bare today, with no router.
A `Link` inside `MobTips` makes every one of those renders throw. Each has to be wrapped in a
`MemoryRouter` — `renderIn` already nests a caller's `wrapper` inside the locale provider for
exactly this, so the fix is mechanical, but it touches the whole file and is part of the work.

### 5. `packs:` first, the mob's clones as the fallback

The jump aims at the tip's `packs:` when it has them, and at every clone of the mob when it does
not.

Aiming always at the mob was considered and measured against the real content. Sporeblight
Belcher's 11 clones span **1483 × 956 pixels of a 1920 × 1280 map** — 77% of its width, 75% of its
height. Centring on all of them is arithmetically almost `fitTransform`: the button would move the
viewport by nearly nothing. Pack 44 holds one of those clones, at (403, −183). The author's scope is
the answer to "which of the eleven", it is already what the map's `?` pip uses, and the fallback
then applies exactly when there is nothing better to aim at.

### 6. The jump is an address: `?focus=`

`/d/<slug>/codex/mob/<npcId>?focus=44,45` for a scoped tip, `?focus=mob` for an unscoped one.

Router state (`navigate(to, { state })`) would carry the same value with no URL surface, and was
rejected: a reload would land unfocused and the jump could not be shared or bookmarked. This app's
whole posture is shareable links — `?room=`, `?route=`, `#spell-<id>` are all already addresses —
and a jump that survives neither reload nor paste would be the one exception.

The param's value is either a comma-separated pack list or the literal `mob`. That is slightly
loose for one param, and it is preferred to two params that could contradict each other.

An unparseable or unknown `?focus=` leaves the map where it was rather than throwing: the same
posture as a mob with no card still rendering.

### 7. Re-jumping to the same target: the token is `location.key`

Clicking the same chip twice produces the same URL. An effect keyed on the parsed target would not
fire the second time, and the map would sit still while the reader clicked.

React Router pushes a fresh history entry with a new `key` even for an identical path, so
`useLocation().key` changes on every click. It is the focus token. This is the same
counter-not-flag reasoning `flashToken` already uses in `MobTips` — setting a value that is already
set is not a change React renders.

**The cost:** clicking a chip repeatedly pushes duplicate history entries, so Back steps through
them. Accepted as the smaller evil; the alternative is a local counter that a pasted URL could not
reproduce.

### 8. New pure arithmetic: `focusTransform`

```ts
focusTransform(points: Point[], size: Size, padding: number): Transform
```

in `src/components/map/viewport.ts` — bounding box of the points, scaled to fit `size` with
padding, clamped to `MIN_SCALE`/`MAX_SCALE`, centred. It lives beside `fitTransform` and `zoomAt`
for the reason that module exists: pan and zoom are the parts that can be wrong without anything
looking broken, so they are pure functions pinned without a DOM.

`DungeonMap` grows one prop, `focus?: { points: Point[]; token: string }`, applied in an effect
keyed on the token. `DungeonPage` resolves `?focus=` against the lookup — packs to their members'
coordinates, `mob` to the path mob's clones — and passes the points. The map itself stays ignorant
of tips, packs and URLs; it is handed points.

### 9. A dungeon with no tips is omitted

The index lists only dungeons that have something in them. A grid of seven empty headings would
read as a broken page rather than an honest one. If the whole season has no tips, one line says so.

### 10. New interface strings, both languages

The page title and intro, the home header link, the chip's accessible label in both its scoped and
its mob-wide shape, and the empty line. Added to `en.ts` and `fr.ts` in the same commit, as every
string is. Note that the existing `tip.jump` key already means something else — the badge on a codex
card that scrolls to the tips section — so the new keys must not reuse it.

## Testing

| Type | What |
| --- | --- |
| Unit | `tipIndex.test.ts` against the real dungeon pool: grouping, order inherited from `getHighlights`, empty dungeons omitted, both locales. `viewport.test.ts` gains `focusTransform`: bounding box, a single point, padding, and the clamp biting at both `MIN_SCALE` and `MAX_SCALE`. |
| Integration | `TipsIndex.test.tsx`: the groups render, the dungeon name links to `/d/<slug>/codex`, a scoped row's chip links to `?focus=44` and an unscoped one to `?focus=mob`. `MobTips.test.tsx` gains the two chip shapes — and every existing case in it gains a `MemoryRouter`. `DungeonPage.test.tsx`: a `?focus=` param reaches the map as points, and an unparseable one leaves it alone. |
| End-to-end | One scenario in `e2e/tips.spec.ts`: from `/tips`, click the chip and assert the map's transform actually changed and the target pull is in view. |

**Why the browser is not optional here.** jsdom lays everything out at zero, so a mounted map's
container is 0×0 and `focusTransform` cannot be observed doing anything real through it. The unit
test pins the arithmetic and the integration test pins the wiring; only a real browser can show
that the two together move the map. That is the same argument that already puts the eraser drag and
the in-progress stroke in the Playwright suite.

Each scenario is watched failing before it is made to pass.

## Out of scope

- Filtering or searching the index — by dungeon, threat, or tip kind. One tip exists; a filter would
  be furniture. Revisit when the page is long enough to be hard to read.
- Entry points other than the home header: the footer, `DungeonHeader`, the search palette.
- Any change to how tips are authored. `content/**.md`, `tips.ts` and the `packs:` format are
  untouched; this design reads what is already written.
- Route mode. The jump lands in the codex, which is where a mob's card lives.
