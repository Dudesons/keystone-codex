# The Blinding Vale — 26/26 written

Timer unknown (`_dungeon.md` left empty — not in `TIMERS`, and guessing it would be inventing
a technical detail) · 655 forces required · 6 bosses, 13 trash entries, 7 encounter adds.

## Verdicts — reviewed with RwlRwlRwlRwl

Weights are `count × placements`, i.e. the share of the 655 forces a group needs. The
**Threat** column is what the card carries after the review.

| Mob | Weight | Threat | Why |
| --- | --- | --- | --- |
| Sporeblight Belcher | **275** (42%) | `high` | Unavoidable to route around, 291k spore impacts, 291k on death, eleven bodies |
| Lightgorged Lasher | 196 (30%) | `high` | Pollination buffs the whole pack for a **minute** unless the shield is broken |
| Overgrown Hydra | 175 (27%) | `medium` | Was `high` on the 339k Bullet Seeds; a frontal you sidestep is a clear answer |
| Virid Grovekeeper | 120 (18%) | `high` | 533k tank buster that paves the ground with slowing pools |
| Lasher | 115 (18%) | `low` | One force each, 1 damage a tick; only the stacking slow is real |
| Lightfeather Petalwing | 112 (17%) | `medium` | Deals no damage at all — costs a 3-second group disorient |
| Radiant Spellsower | 98 (15%) | `medium` | Was `high` for the lasher-waking channel; overruled by RwlRwlRwlRwl — three kickable casts is a choice, not a scramble |
| Underbrush Stalker | 96 (15%) | `medium` | Bleed on a target of its choosing, not the tank |
| Luminous Thornmaw | 88 (13%) | `high` | Grievous Gash only ends at **full** health, and stacks |
| Leafy Grovecrawler | 70 (11%) | `medium` | Easy cast; the 291k death explosion is the real cost |
| Thorny Saptor | 65 (10%) | `medium` | Leaps to a player then cones from there at 145k a swing |
| Potatoad Matriarch | 30 (5%) | `medium` | Was `high`; the add spawn sits behind a 10-second window a group can simply beat |
| Spineshield Beetle | 22 (3%) | `low` | One force, but a 500k shield and 291k on death — arguably `medium` on cost alone |

Only one mob in the dungeon now carries `high` on a body that is not either 30%+ of the forces
or a tank buster: Luminous Thornmaw, on a debuff that will not fall off below full health.

**Bosses** (Meittik, Kezkitt, Lekshi, Lightwarden Ruia, Ziekket, Ikuzz) carry no `threat`,
per the Altar of Fangs convention. Note MDT prices each boss at **30 forces** here, unlike
Altar and Ruby Life Pools where bosses are worth 0.

Least confident calls: **Spineshield Beetle** (`low` by forces, `medium` by what it costs to
kill) and **Lightfeather Petalwing** (a cast that does zero damage but takes the group out of
the fight for 3 seconds).

## The dungeon-wide mechanic

**Lightwarden's Blight** (`1242180` / `1242200`) sits on six different mobs: Sporeblight
Belcher, Lightfeather Petalwing, Luminous Thornmaw, Leafy Grovecrawler, Thorny Saptor and
Spineshield Beetle. *"Upon death the light-infused creature explodes, inflicting 290947 Holy
damage to nearby players and creating a pool of Blight Resin."*

Lightwarden Ruia is its source — his **Blight Propagation** channels it into nearby allies.
Every affected card says so; it is the single most repeated fact in the dungeon and probably
belongs in the `_dungeon.md` route plan once one exists.

## Open questions

1. **Bosses worth 30 forces.** MDT gives all six bosses `count: 30` here, where Altar of Fangs
   and Ruby Life Pools give theirs 0. If that is right, boss kills contribute to the count and
   the route maths differs from the other dungeons. Worth a glance in game.

2. **The Trinity as one entry or three.** Meittik, Kezkitt and Lekshi share all damage taken
   (`Thicket's Trinity`) and Method lists them as a single boss, "Lightblossom Trinity". They
   are three cards here because MDT holds three NPCs. Each card cross-links the other two, but
   if the codex ever wants a combined view this is the case that asks for it.

3. **`role: add` and the grey ring**, again — seven entries here.

## Where the sources disagree

| Ability | MDT | Method | Card follows |
| --- | --- | --- | --- |
| **Bullet Seeds** (Overgrown Hydra) | no directional field | "Frontal" | Both — MDT has no way to express a frontal, so Method fills the gap. Named as Method's reading in the card. |
| **Hunting Leap** (Thorny Saptor) | no directional field | "Frontal, Stop" | Same. The tooltip's "attacks in a cone" backs Method up. |
| **Thornblade**, **Grievous Gash**, **Grievous Thrash**, **Thornspike**, **Incise** | `dispel: bleed` | "Special (Stoneform)" | They agree — Stoneform clears bleeds. Unusually, the two sources line up perfectly all through this dungeon. |

## Data gap — read before writing anything else here

**MDT carries no CC data for The Blinding Vale**: all 26 mobs have an empty `cc` array. The
same is true of every Midnight dungeon (mdtIndex 160–164: Murder Row, Den of Nal'orakk, The
Blinding Vale, Voidscar Arena, Altar of Fangs). It is missing data, **not** 152 mobs immune to
crowd control.

No card in this dungeon claims anything about CC, and none should until MDT fills it in.
A background task is open to stop the app rendering "Immune to every CC listed by MDT." in
that situation.

## Written from

- `src/data/generated/the-blinding-vale.json` — forces, placements, `interruptible` and
  `dispel` flags. Every spell ID in every card was checked against it.
- `src/data/generated/spells.json` — names, cast times, ranges, damage figures.
- `https://www.method.gg/guides/dungeons/the-blinding-vale/ability-tracker` — frontal / tank
  buster / avoidable classification and the "Tough" marker.

Method's "Tough" mobs: Underbrush Stalker, Virid Grovekeeper, Sporeblight Belcher, Leafy
Grovecrawler, Overgrown Hydra, Luminous Thornmaw, Potatoad Matriarch. Two of the heaviest —
Lightgorged Lasher and Radiant Spellsower — are *not* marked Tough by Method but are proposed
`high` here, on the strength of the minute-long pack buff and the lasher-waking channel
respectively. That is a deliberate disagreement, not an oversight.
