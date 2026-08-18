# Hover intelligence — design

**Goal:** while building a route, hovering a mob on the map answers the three questions that
decide whether to pull it — how much of the dungeon's forces it gives, how cheaply it gives
them, and what it does to you — without leaving the Route tab.

**Why now:** the Route tab has no codex at all. Its right-hand panel is `RoutePanel`, so the
mob entries written in `content/**.md` are reachable only from the Codex tab, which is the
tab you are *not* in while routing. The numbers are in the same situation: `CloneTooltip`
shows a mob's raw force count and nothing else — not its share of the dungeon, not MDT's
efficiency score.

Nothing has to be generated or fetched for any of it. `Dungeon.totalCount` and `Enemy.health`
are already in the committed data, for all 260 mobs across the eight dungeons.

## Scope: this is slice B of three

The decomposition is the one recorded in
[the slice A design](2026-08-17-mdt-overlays-design.md#scope-this-is-slice-a-of-three). A is
merged work. **This spec covers B only.** C — the left-hand editing toolbar, drawing, undo,
re-export — is still deferred, and is the one that breaks the round-trip invariant.

B shares no code with C, but it does claim the screen real estate C was going to want. That is
deliberate and is decision 2.

## The formula is verified, not assumed

MDT computes a mob's efficiency score as (`Appendix A` of the slice A design, quoted from the
addon source):

```lua
local totalCount = MDT.dungeonTotalCount[db.currentDungeonIdx].normal
local score = 2.5 * (count / totalCount) * 13000 / (health / 20000)
```

Applied to the committed data for Murder Row (`totalCount: 690`), it reproduces what the game
prints:

| Mob | `count` | `health` | Share | Score |
| --- | --- | --- | --- | --- |
| Bribed Captain | 35 | 7 783 812 | 5.07 % | **4.2** |
| Defiled Golem | 35 | 8 432 463 | 5.07 % | 3.9 |

A screenshot of MDT's own tooltip for Bribed Captain reads "Forces : 35 (5.07%)" and "Score
d'efficacité: 4.2". The agreement is to the digit MDT displays, on data we extracted
independently — which is why the unit test below asserts those exact values rather than
whatever our own code happens to produce.

## The decisions

### 1. Hover is the trigger, because clicking is not free

In the Route tab, clicking a mob calls `actions.toggleClones` — it **adds the pack to the
current pull**. A design where the panel fills on click would make it impossible to weigh a
pack before taking it, which is the entire purpose of showing a share and a score.

Hover mutates nothing and already exists: `DungeonPage` tracks `hoveredNpc` and `DungeonMap`
tracks `hoverClone` today.

### 2. A real left column, not a bigger floating card

`DungeonPage` is a flat flex row — map in `flex-1`, `aside w-[400px] shrink-0` on the right,
and **no responsive breakpoints anywhere in the file**. The app is desktop-only by
construction. So the panel becomes a second `aside`, `w-[360px] shrink-0 border-r`, mounted
before the map and only when `mode === 'route'`.

Rejected: growing `CloneTooltip` into a large floating card. A codex entry is prose of
unpredictable length; a floating panel sized to it covers the map exactly where you are
looking, and its height changes under the cursor. A column gives prose a stable width and its
own scroll.

The cost is stated rather than hidden: the map loses 360px permanently. On a 1440-wide laptop
it drops to roughly 680px. Nothing in the codebase would warn us — there are no breakpoints to
break.

This also settles where slice C's editing toolbar goes. It gets a strip in this column instead
of re-litigating the page's layout later.

### 3. Route tab only

The Codex tab's right-hand panel is already a scrolling list of full `MobCard`s that scrolls
itself to the hovered mob. A second copy of the same card on the left would be noise, and it
would cost 360px of map for nothing.

The Codex tab still gains from this slice: the shared statistics block (decision 4) is mounted
by `CloneTooltip` too, so hovering there starts showing the share and the score.

### 4. One statistics block, one calculation, both mounted in two places

The numbers appear in two surfaces — the column, and `CloneTooltip`. They are therefore one
component, not two renderings that must be kept in step.

The calculation goes further out, into a pure module with no React, in the shape
`src/lib/indicators.ts` already established:

```ts
contribution(enemy: Enemy, dungeon: Dungeon): { count: number; share: number; score: number | null }
scoreColor(score: number): string
```

`scoreColor` implements MDT's own ramp, from Appendix A:

```
v = score / 10
red   = max(0, min(1, 2 * (1 - v)))
green = min(1, 2 * v)
blue  = 0
```

Read it carefully before implementing it: the two channels saturate at different scores. Green
reaches full at a score of **5**, but red only reaches zero at **10** — so the ramp is red at 0,
**yellow at 5**, and green only at 10 and above. "Red through green, green from 5 up" is the
plausible reading and it is wrong.

### 5. Zero-force mobs show no score

**21 of Murder Row's 41 mobs give no forces.** This is not an edge case; it is half the map.

Their computed score is `0` — not `Infinity`, since the division is by health, not by count —
but printing "0.0 % · 0.0" on half the mobs is noise shaped like information. A score measures
forces per point of health; it says nothing about a mob that grants none. So `contribution`
returns `score: null` for them, and the block prints the existing `common.noForce` string in
place of both numbers.

**We do not know what MDT displays in this case and have not checked.** This is our choice,
not an imitation of the addon's.

### 6. Missing health is guarded, though it does not occur

Zero of the 260 committed mobs lack a `health` value. The guard is one branch — `score: null`,
rendered as an em dash — and a test pins it, so that a future extraction changing the field
produces a visible gap rather than an `Infinity` displayed with confidence.

### 7. Right-click freezes; the tooltip becomes the comparison surface

Left click is taken (`toggleClones`) and `Ctrl`/`Cmd` is taken (single mob instead of pack) —
verified in `DungeonMap.tsx`. `Shift` is free and no `onContextMenu` exists anywhere in `src/`.

Right-click on a mob freezes the column on it. The handler is attached **to the mob blips
themselves, not to the map surface**, so the browser's context menu keeps working everywhere
else on the map.

Freezing raises a question the word "frozen" answers badly: what happens when you then hover
another mob? Ignoring the hover entirely would defeat the only reason to freeze — comparing.
So while the column is frozen, `CloneTooltip` comes back and carries the *hovered* mob's
statistics.

The resulting division of labour:

| State | The left column | The map tooltip |
| --- | --- | --- |
| Nothing frozen | follows the hover; keeps the last mob when the cursor leaves the map | hidden |
| Frozen on A, hovering B | stays on A, full entry | A's role ends here — shows **B's** statistics |
| Right-click B | moves to B | hidden again |
| Right-click A again, or the header's pin | back to following | hidden |

Keeping the last hovered mob when the cursor leaves the map is what makes the column readable
at all: without it, the entry would clear at the moment you move the mouse toward it.

### 8. The codex entry is `MobCard`, mounted unchanged

The column mounts the same `MobCard` the Codex tab uses. One component, one place to improve.

It also settles the missing-entry case by construction rather than with a new branch: a mob
with no `.md` file behaves in the column exactly as it already behaves in the Codex tab. The
repository's invariant — a mob with no entry still renders — is inherited, not re-implemented.

## What gets built

| File | Change |
| --- | --- |
| `src/lib/contribution.ts` | new — `contribution`, `scoreColor`. Pure, no React. |
| `src/lib/contribution.test.ts` | new — the anchored values below. |
| `src/components/codex/MobStats.tsx` | new — the shared statistics block. |
| `src/components/route/MobPanel.tsx` | new — the left column: header, `MobStats`, indicator chips, `MobCard`. |
| `src/routes/DungeonPage.tsx` | mounts the column when `mode === 'route'`; owns the frozen-mob state. |
| `src/components/map/DungeonMap.tsx` | `onCloneContextMenu` on the blips; `CloneTooltip` gains `MobStats` and a mount condition. |
| `src/lib/i18n/en.ts`, `fr.ts` | the share label, the score label, the column's empty state, the pin's accessible name. |

## Testing

| Level | What it proves |
| --- | --- |
| Unit, node | `contribution` returns 5.07 % / 4.2 for Bribed Captain and 5.07 % / 3.9 for Defiled Golem, from `murder-row.json` as committed — the first confirmed against the game's own tooltip. Plus `score: null` for a zero-force mob, `score: null` for absent health, and `scoreColor` at its bounds. |
| Integration, jsdom | The column follows the hover; right-click freezes it; hovering while frozen leaves the column alone and brings the tooltip back with the *other* mob's numbers; right-click does not reach `toggleClones`; the column is absent from the Codex tab. |
| End-to-end | Nothing new. Hover and right-click are better pinned in jsdom, and the Playwright suite exists for collaboration, not local inspection. |

The unit test is the one that matters most, because it is anchored outside our own code: if the
extraction changes which field carries health, or MDT changes its formula, it fails instead of
letting us print a confident wrong number.

## Deliberately not in this slice

- **Any editing.** Nothing here writes to the route or to the preset. That is slice C.
- **Comparing two full entries side by side.** The frozen state compares one entry against one
  set of numbers. Two columns of prose is a different feature and has not been asked for.
- **A responsive layout.** The app has none today; adding breakpoints for this slice would be
  the first, and would be doing it for the wrong reason.
