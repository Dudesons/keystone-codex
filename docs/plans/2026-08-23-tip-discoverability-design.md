# Making a tip findable — design

**Goal:** a reader should learn that a mob has a tip *before* scrolling to the bottom of its
card, and should be able to find every tip in a dungeon from the map and the Overview.

**Why now:** tips shipped and immediately proved the gap. The section sits at the bottom of
the card, which is right for reading and wrong for discovery: on a long card, in the route
builder's narrow column, a tip is invisible until you scroll past the spell list. Nothing
anywhere else in the app says a tip exists at all.

**Depends on:** the tips feature (`src/lib/tips.ts`, `MobTips`, `MobContent.tips`), on branch
`tips-and-contributing-design` / [PR #13](https://github.com/Dudesons/keystone-codex/pull/13).
This branch is cut from it, not from `main`.

## Scope

Three surfaces, one vocabulary:

- **A — the card.** A marker in the header that jumps to the section.
- **B — the map.** A blip badge saying this mob has something written about it.
- **C — the Overview.** A section listing every tip in the dungeon, playable in place.

## The decisions

### 1. One derivation, three consumers

`MobIndicators` gains `hasTips: boolean`, filled inside `getIndicators` from the
`getMobContent` call it **already makes**. No second content read, no new cache: the existing
`locale/slug/npcId` key already varies correctly, because a `.fr.md` that replaces the tips
list can change the answer.

`hasTrap: boolean` is already on that interface and is the exact precedent. Adding a sibling
beside it costs one line and inherits the caching, the locale handling and the tests' shape.

### 2. The card marker is a badge that jumps, not a reordering

Decision 9 of the tips design put tips at the bottom on the reasoning that the trap and the
spell list are what a router reads *mid-pull*, while a tip is what they read *once*. That
reasoning still holds. The problem was never the position — it was that nothing announced the
position.

So the fix is a marker in the header, beside the existing badges, whose click scrolls the
section into view with `{ behavior: 'smooth', block: 'nearest' }` — the idiom
`CodexPanel.tsx:22` already uses, and the one that behaves in both the codex column and the
route panel's narrower one.

Reordering was considered and refused: it fixes discovery by pushing the spell list down on
every card that has a tip, which is a cost paid during the pull to solve a problem that
happens before it.

### 3. The marker hides in compact, exactly as the section does

`MobCard`'s compact mode hides tips. A badge that stays visible there would be a control that
scrolls to nothing. It renders behind the same `!compact` guard.

This is the kind of pairing that rots: the guard is in two places and nothing structural keeps
them together. A test asserts the absence of the badge in compact mode for a mob that has
tips — not the presence of the section, which is already covered.

### 4. The map reuses the badge mechanism it already has

`DungeonMap` already builds a `badges` array of `{ color, glyph, title }` per blip — `K` for
kick — and already renders a legend. A tips badge is one more entry plus one more legend row.

The glyph is **`?`**. The badges are single characters in a small circle, `K` sets that
precedent, and a film or loop symbol reads as "repeat" to anyone who has used a media player.

Per blip rather than per pack. Pack-level was the original request, and it matches how a
router thinks — but the pack outline is a different drawing surface, needs its own derivation,
and cannot say *which* mob to open. A blip badge points at the mob whose card holds the tip, so
the marker and the content agree.

### 5. One marker for every kind of tip

Not a play glyph for video and an image glyph for a screenshot. A mob can carry several kinds
at once, so a per-kind vocabulary needs a precedence rule or has to stack, and the map already
carries threat rings, `K` badges and priority marks.

The marker means *there is something written here*. The reader learns which kind on arrival,
which costs nothing — they were going to the card anyway.

### 6. The Overview gets its own section, not inline rows

`getHighlights` gains `tips: HighlightTip[]` — `{ npcId, mobName, tips, fallback }` — rendered
by a `TipList` component in a fourth section of `HighlightsPage`, built like `TrapList`.

Inline placement on existing rows was refused for a reason the page already demonstrates: the
mob table holds only non-boss mobs with a `prio: 1` spell that also clear `earnsARow`. A tip on
any other mob would never appear. The traps section exists to catch exactly that overflow, and
tips have the same shape of problem.

`HighlightTip` carries `fallback` because `MobTips` takes it: a French reader looking at a card
whose `.fr.md` omits `tips:` should see the same `EN` mark here as on the card.

### 7. The Overview mounts the real `MobTips`, not a second player

A video is playable on the Overview rather than only linked. That is a deliberate choice to
mount the existing component rather than build a lighter one, and the reason is decision 4 of
the tips design: **nothing reaches Google until the reader clicks.** That guarantee lives
inside `MobTips` — its own state, its own click handler — so reusing it carries the guarantee
along. A second embed path would have to re-earn it, and would be free to forget it.

The cost is a page that can hold several embeds at once. Acceptable: they are all inert until
clicked, which is the whole point.

## What gets built

| File | Change |
| --- | --- |
| `src/lib/indicators.ts` | `MobIndicators.hasTips`, set from the existing `getMobContent` call. |
| `src/lib/indicators.test.ts` | `hasTips` true, false, and across a locale swap. |
| `src/components/codex/Badges.tsx` | The tips marker: a button, not a static badge. |
| `src/components/codex/MobCard.tsx` | Render it in the header behind `!compact`; wire the scroll target. |
| `src/components/codex/MobCard.test.tsx` | Present with tips, absent without, absent in compact, click scrolls. |
| `src/components/map/DungeonMap.tsx` | One `badges.push` entry and one legend row. |
| `src/components/map/DungeonMap.test.tsx` | Badge on a mob with tips, absent otherwise; legend row present. |
| `src/lib/highlights.ts` | `HighlightTip`, `DungeonHighlights.tips`. |
| `src/lib/highlights.test.ts` | Every mob with tips listed, including one outside the shortlist. |
| `src/components/highlights/TipList.tsx` | **new.** Mounts `MobTips` per mob. |
| `src/components/highlights/TipList.test.tsx` | **new.** Renders; no iframe before the click. |
| `src/routes/HighlightsPage.tsx` | The fourth section. |
| `src/lib/i18n/*` | `map.badgeTips`, `legend.tips`, `highlights.tips`, `mob.jumpToTips`, both dictionaries. |
| `e2e/tips.spec.ts` | The map badge, and the Overview player making no request before the click. |

## Testing

| Level | What it covers |
| --- | --- |
| Unit | `hasTips` across content states and locales; `getHighlights().tips` including a mob the shortlist excludes. |
| Integration | The card badge's presence, absence, compact suppression and scroll call; `TipList` rendering with no iframe before the click and one after. |
| End-to-end | The `?` badge on the map for a mob with a tip; the Overview's embed making zero requests to `youtube` / `ytimg` / `googlevideo` hosts before the click. |

No mocks: the tests read the real cards through the real loader, as the suite already does.
`scrollIntoView` is not implemented by jsdom and is stubbed per-file, as `CodexPanel.test.tsx`
already does.

## Deliberately not in this slice

- **Pack-level markers** on the map. Decision 4.
- **Per-kind glyphs.** Decision 5.
- **Dungeon-level tips** in `_dungeon.md`. Still open, still unblocked.
- **Any change to the MDT codec.** `content/` remains structurally unable to reach a share
  string; a marker derived from tip data inherits that for free.
- **A sanitizer for `inlineMarkdown`.** Decided separately: pull-request review is the barrier,
  and both guides' House rules now say so.
