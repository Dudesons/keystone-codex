# Writing a codex entry

*Cette page existe en français : [`writing-cards.fr.md`](writing-cards.fr.md).*

This page holds the **judgement**: how a mob is rated, and what a card is allowed to claim at
all. The **format** — every key, its allowed values, what a `.fr.md` may carry, how to open a
pull request — is [`CONTRIBUTING.md`](../CONTRIBUTING.md). Each answer lives in one of the two
and is pointed to from the other: a rule written twice is a rule that will disagree with itself.

A card under `content/<dungeon>/<npcId>-<slug>.md` carries only what a human brings: a threat
level, what to interrupt, the trap of the pack, and prose. Everything mechanical — name,
forces, CC, spell IDs — comes from MDT and must never be typed by hand.

Per-dungeon working notes live in [`codex-notes/`](codex-notes/): one file per dungeon recording
every rating and the reason for it, the questions only the game can answer, and where the
sources disagree. **Read the dungeon's note before editing its cards**, and update it in the
same pass — it is the record of decisions already taken.

## The threat scale

Four levels. The question is never "how big is the number", it is **how much of the pull does
this change**.

| Level | Means |
| --- | --- |
| `low` | Normal play handles it. No decision required. |
| `medium` | Needs an answer, but a routine one — a kick, a dispel, a sidestep, a soothe. |
| `high` | Forces the group to change what it is doing. |
| `lethal` | Fears the whole group, lands a massive stun, or is an AoE that kills you for standing in it. |
| *(empty)* | Nothing to rate it from. **Leave it empty rather than guess** — see below. |

Three rules that follow, and that the review kept re-deriving until they were written down:

- **Weight is not threat.** `count × placements` says how much of the dungeon a mob is worth,
  not how dangerous it is. A 35%-of-the-forces body can be `medium`; a 0-force body can be
  `high` (Den of Nal'orakk's Curious Yearling casts the Matriarch's full enrage and is worth
  nothing at all).
- **A defensive buff never raises threat.** A damage-reduction shield, a raid wall, CC
  immunity — rate the mob on its damage alone. Voidscar's Protective Turtle grants the pack
  −75% damage taken and is `low`. A buff that is *offensive* (attack speed, damage done) still
  counts, and so does a shield with an offensive component: Ruby's Tempest Stormshield
  radiates damage and detonates into a stun, so it is not a defensive buff.
- **An ability with a clear answer is at most `medium`**, however large the figure. Two
  answers is emphatically `medium`. What earns `high` is having no answer, or forcing everyone
  to stop and deal with it.

Worked example of the last two, from two mobs that look identical — both 7 forces, both "the
pack healer":

| | Earthwhisper Tender (Den) — `high` | Voidminder (Voidscar) — `low` |
| --- | --- | --- |
| Heals | **nearby allies**, 5% max health / 2 sec | **the target**, 3% max health / 2 sec |
| Answers | interrupt **or** magic dispel | interrupt |

**Bosses carry no `threat`.** Their ring is gold regardless, so the field would only add a
redundant badge. **A mob you demote with `rank: miniboss` is no longer a boss**, and its ring
goes back to being the threat rating — so a demoted card deserves one.

**`rank` is about the fight, not the health bar.** Write `boss` for something the dungeon counts
as an encounter and `miniboss` for a unit that stops the group without being one. MDT's flag is
the default and it is wrong in both directions — it flags every unit that appears in an
encounter, so a council of three reads as three bosses, and it flags nothing for the
200M-health blocker standing in a corridor. Leave `rank` out unless you are correcting it.

## What may be written at all

The hard rule, and the one that has been broken most: **never write what the data does not
hold.** Three failures to recognise, all of which happened here:

1. **Inventing spell IDs.** Every `id:` in a card must exist in
   `src/data/generated/<dungeon>.json`. Check it; do not reconstruct it from a name.
2. **Inferring from a name.** King's Rest's Hex Volley was described as party-wide across a
   note, a trap and the prose, because of the word *Volley*. MDT's tooltip names no radius. If
   the tooltip does not say it, the card does not say it.
3. **Reading absent data as a negative.** An empty `cc` list means MDT has not filled the
   dungeon in, not that the mob is immune (`hasCcData` on `DungeonLookup` now carries that
   distinction). An unrecorded dispel type does not mean an ability cannot be soothed.

### When the data is missing or wrong

| Situation | What to do |
| --- | --- |
| **No spells at all** for a mob (Shadow of Zul, Temple Disruptor) | Say so in the prose. Write nothing into `spells:`. |
| **Something you know from playing** | Write it in the prose and **mark it as observed** — never as a spell entry, never as a badge, because badges are generated from data that does not contain it. |
| **Nothing known from any source** | Leave `threat:` empty with a comment saying it is deliberate. The grey ring is honest; a guess reads exactly like a judgement. |
| **An unscaled tooltip** (`10 Physical`, `55`, a damage value in a radius field) | Describe the behaviour and the duration. **Quote no figure.** Record it in the dungeon's note. |
| **Method and MDT disagree** | Follow MDT, because the badges come from MDT — and name the disagreement in the prose. Record it in the dungeon's note. |

## What a tip is for

**Tips are for what a card cannot say.** A `tips:` entry carries a sentence, a YouTube video or
Short, or a screenshot committed under `public/tips/<dungeon>/`. The format is in
[`CONTRIBUTING.md`](../CONTRIBUTING.md); what belongs here is the judgement:

- **A tip is not a second prose block.** If it can be written as a sentence in the card, write it
  there. A tip earns its place when the thing being explained is spatial or timed — where to
  stand, what the pull looks like when it goes wrong.
- **Credit the creator in the `label:`.** We link other people's work; we do not present it as
  ours, and we do not transcribe a video's claims into the card as if they were sourced.
- **A video is not a source.** The rules in [*What may be written at
  all*](#what-may-be-written-at-all) are unchanged: a figure goes in the card only if MDT or
  Wowhead holds it. A video may contradict them, and if it does, say so in the prose rather than
  quietly following it.
- **Scope a tip when it is about a pull.** "This frontal is wide" is about the mob, belongs
  unscoped, and marks every blip of that mob. "Take this one after the first boss, from the left"
  is about one group of mobs standing in one place: `packs:` moves the mark off the mob and onto
  the pull, where the advice actually applies. Without it the map marks every clone of that mob in
  the dungeon — eleven of them, in the case this key was written for. If you cannot name the pack,
  the tip is probably general.
- **Tips are never exported to MDT**, like everything else under `content/`.

## Two details the format reference does not carry

**A cross-link between mob cards is written `#/d/<slug>/codex/mob/<npcId>`.** The renderer emits
the href verbatim and nothing in the app rewrites it, so the address has to be the one the
router actually serves — a mob's card lives under the codex route, not under the dungeon
briefing at `/d/<slug>`.

**`tag: frontal` is a cone** you avoid by not standing in front; **`tag: dodge` is a patch of
floor** you walk out of. Only `frontal` reaches the pull briefing.

## Which language a judgement goes in

`threat`, `role`, `rank`, `tag` and `prio` are judgements and live **only in the base file**; a
`.fr.md` sibling carries `note`, `trap` and prose. `CONTRIBUTING.md`'s field reference is the
full list.
