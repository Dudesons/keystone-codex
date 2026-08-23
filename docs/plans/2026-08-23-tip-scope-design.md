# Saying where a tip applies — design

**Goal:** let a tip declare which pull it is about, so the map marks the blip a reader is standing
next to rather than every clone of the mob.

**Why now:** the `?` badge shipped and immediately proved too broad. Sporeblight Belcher has **11
clones spread across 11 different packs** (80, 73, 12, 11, 20, 33, 34, 26, 44, 67, 52), and its one
tip is about a single pull — *"Naowh — taking the pull after the first boss"*, which is pack 44. The
map paints eleven `?` badges for one piece of advice. Ten of them point at a pull the tip says
nothing about, and the noise grows with every located tip written.

**Depends on:** the tips feature (merged) and the `?` badge from
[`2026-08-23-tip-discoverability-design.md`](2026-08-23-tip-discoverability-design.md) / PR #14.
Implementation is cut from `main` after that lands.

## The three kinds of tip that exist in practice

1. **About the mob**, wherever you meet it — how its frontal behaves, what to interrupt.
2. **About one group** — this pull, in this corridor.
3. **About a combined pull** — two or more groups taken together, which is how a route usually
   moves.

Today the format can only express the first, and the map treats every tip as if it were.

## The decisions

### 1. `packs:` on the tip entry, and it takes a list

```yaml
tips:
  - video: https://youtu.be/9D0gCU8Tp5Y?t=123
    label: "Naowh — taking the pull after the first boss"
    packs: [44]
```

Absent, the tip is about the mob and behaves exactly as it does today — no card changes meaning by
not being edited. `packs: [44, 45]` is a combined pull. All three tip kinds accept the key.

A bare `packs: 44` is normalised to `[44]` rather than dropped. Someone will write it, and silently
discarding it would produce a card that looks correct and a map that behaves as though the key were
never there — the failure mode this whole design exists to remove.

### 2. Pack ids, not clone ids — and what that costs

A clone reference would be the stabler anchor. `mdtIdx` is authoritative and never renumbered —
`.claude/skills/mdt-update/SKILL.md` states the rule, and MDT's own share strings reference clones by
it, so it cannot drift without breaking every saved route in the world. Nothing makes the same
promise about `g`: `scripts/mdt-diff.mjs` computes `packsOf()` from it and reports pack changes as
findings, so the tooling already expects them to move.

Pack ids win anyway, on two grounds. A pack is the unit a router actually points at — "the first
pack after the first boss" is a group, not a mob instance — so a clone anchor would express the
common case worse. And the map tooltip already names the pack, so a contributor can read the number
off the screen; nothing in the UI tells them a clone id.

**The cost, recorded rather than hidden:** if an MDT update renumbers packs, a scoped tip points at a
different pull and looks entirely correct while doing it. The integrity test below narrows that but
cannot close it. Re-reading located tips is a step for
[`mdt-update`](../../.claude/skills/mdt-update/SKILL.md), not something a test can do.

### 3. Two validations, in two places

`src/lib/tips.ts` imports nothing and stays that way — that is what makes it a pure parser with a
direct unit test. So it checks only the **shape**: positive integers, or the key is dropped.

Whether pack 44 exists needs the generated data, which is `content.integrity.test.ts`'s job. This is
the split `image:` already uses, where the parser checks the filename and the test checks the file.

### 4. The integrity rule is "exists, and holds the mob at least once"

Every pack a tip names must exist in that dungeon, and the mob must appear in **at least one** of
them.

Not in *every* one: a combined pull of 44 and 45 is a legitimate scope for a tip on a mob that
stands only in 44, and requiring membership in both would reject a correct card.

**Its limit is worth stating.** A typo like `[44, 4]`, where 4 is a real pack elsewhere in the
dungeon, passes both checks. Nothing mechanical catches a pack id that is wrong but valid.

### 5. The map badges a blip, not a mob

`MobIndicators` gains two fields beside `hasTips`, which keeps its current meaning — any tip at all —
because the card badge and the Overview section both still want it:

- `generalTips: boolean` — at least one tip carrying no `packs`
- `tipPacks: number[]` — every pack named by the scoped tips

A blip badges when `generalTips || tipPacks.includes(clone.g)`. `Blip` gains a `pack` prop; its call
site already reads `clone.g` one line above, for `inActivePack`.

Sporeblight Belcher goes from eleven badges to one. A mob standing in only one of two combined packs
badges once, which is right: the tip is about a pull it takes part in, and that is where it stands.

### 6. The card and the Overview say which pull

A scoped tip renders a chip beside its label: `Pack 44` for one, `Packs 44 + 45` for a combined pull,
the `+` carrying the sense of "one pull, two groups".

Without it the ambiguity would move out of the map and into the text: a reader on the Overview would
see a tip about a pull with no way to know which. The chip lives in `MobTips`, so the card and the
Overview — which mounts the same component — read identically.

### 7. The translation has to restate the packs, and a test says so

Tips merge **whole-list**: `translation?.tips ?? base?.tips`. A `.fr.md` that restates the tips and
omits `packs:` therefore produces a French tip with no scope.

`getIndicators` is keyed by locale, so the consequence is that **the French map shows eleven badges
where the English shows one**, with nothing on either screen to reveal the disagreement. It would be
found by a French-speaking reader and by nobody else.

The integrity test therefore also asserts that a card's translated tips declare the same packs as its
base card. It is one more assertion over files the test already reads, and it closes a failure mode
that no amount of care in review reliably catches.

## What gets built

| File | Change |
| --- | --- |
| `src/lib/tips.ts` | `packs?: number[]` on every tip kind; parse, normalise a scalar, reject a non-integer |
| `src/lib/tips.test.ts` | The shape rules, including the scalar and the rejections |
| `src/lib/indicators.ts` | `generalTips`, `tipPacks` |
| `src/lib/indicators.test.ts` | Both fields across general, scoped and mixed cards |
| `src/components/map/DungeonMap.tsx` | `Blip` takes `pack`; the badge condition |
| `src/components/map/DungeonMap.test.tsx` | One blip badged, its siblings not |
| `src/components/codex/MobTips.tsx` | The pack chip |
| `src/components/codex/MobTips.test.tsx` | One pack, two packs, none |
| `src/lib/content.integrity.test.ts` | Existence, membership, base/translation agreement |
| `src/lib/i18n/*` | `tip.pack`, `tip.packs`, both dictionaries |
| `content/the-blinding-vale/254850-sporeblight-belcher.md` + `.fr.md` | `packs: [44]`, in both |
| `CONTRIBUTING.md` + `.fr.md` | The key, how to find a pack number, the translation obligation |
| `.claude/skills/codex-content/SKILL.md` | When a tip is about a pull rather than a mob |
| `.claude/skills/mdt-update/SKILL.md` | Re-read located tips after an update — decision 2's cost |
| `e2e/tips.spec.ts` | Exactly one `?` badge for Sporeblight Belcher |

## Testing

| Level | What it covers |
| --- | --- |
| Unit | `packs` parsed from a list and from a scalar; a non-integer, a negative and a zero dropped; `generalTips` and `tipPacks` over a general card, a scoped card and a card carrying both |
| Integration | The map badging the clone in pack 44 and not its ten siblings; the `Pack 44` and `Packs 44 + 45` chips; no chip on a general tip |
| Integrity | Every named pack exists; the mob is in at least one; a translation names the same packs as its base |
| End-to-end | The map shows **exactly one** `?` for Sporeblight Belcher — eleven today, which is what makes the assertion real rather than vacuous |

No mocks: the tests read the real cards and the real generated data, as the suite already does.
Pack 44 of the Blinding Vale holds one Sporeblight Belcher, one Lightgorged Lasher and two Underbrush
Stalkers, so the real content exercises both the scoped and the unscoped path.

## Deliberately not in this slice

- **Clone-level scoping.** Decision 2. A group is the unit a route points at; a single mob inside a
  group has no case yet.
- **Naming a pull in prose** rather than by number — "the first pack after the first boss" is how a
  person says it, but nothing on the map could resolve it to a blip.
- **Pack-level markers on the map**, still. The badge stays on the blip, which is the thing that
  knows which card to open; scoping changes which blips get one, not what a badge is.
- **Catching a pack id that is wrong but valid.** Decision 4 states the limit instead of pretending
  to close it.
