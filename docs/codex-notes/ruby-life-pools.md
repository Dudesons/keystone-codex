# Ruby Life Pools — 24/24 written

28 minute timer · 551 total forces · 4 bosses, 20 trash entries.

## Verdicts — reviewed with RwlRwlRwlRwl

Every `threat` below was proposed from the data, then confirmed or overruled by RwlRwlRwlRwl.
The **Threat** column is now what the card carries.

| Mob | Weight | Threat | Why |
| --- | --- | --- | --- |
| Blazebound Destroyer | **100** (18%) | `high` | An important AoE and an important cast on the same body — RwlRwlRwlRwl's reading, over the death explosion the card leads with |
| Ashseer Flamelasher | 63 (11%) | `medium` | Was proposed `high` for the 3.4M channel; overruled — the channel answers to CC and the posthumous phase to a dispel, so both have answers |
| Primalist Cinderweaver | 63 (11%) | `medium` | One kickable cast, takes every CC, damage is spread-and-survive |
| Primal Juggernaut | 50 (9%) | `high` | 678k tank buster, party-wide blast, no CC but Taunt |
| Tempest Channeler | 50 (9%) | `high` | Three abilities needing three different answers, only one kickable |
| Thunderhead | 48 (9%) | `high` | Largest one-body share, tank buster with knockback, dispel that detonates |
| Storm Warrior | 45 (8%) | `low` | Confirmed `low` against my own suggestion to raise it: one instant ability at 53k AoE and a full CC list, whatever Method's tracker implies. See the disagreement below |
| Flashfrost Chillweaver | 42 (8%) | `medium` | Was proposed `high`; overruled — Ice Shield is still the dungeon's kick priority, but a kick priority is not a threat level |
| Deepstone Earthshaper | 40 (7%) | `medium` | +25% damage taken on the tank, stacking — dangerous by multiplication, not on its own |
| Ruinous Stormbringer | 40 (7%) | `high` | 10.7M health, knockback at 100 energy, only Taunt works |
| Flamegullet | 40 (7%) | `high` | Soft enrage below 50%, growing 15% per cast to ten stacks |
| Defier Draghar | 30 (5%) | `high` | Tank buster and party damage in one cast, plus a line charge |
| High Channeler Ryvati | 30 (5%) | `high` | Party-wide 4-second stun if the shield is allowed to expire |
| Earthbound Guardian | 30 (5%) | `medium` | Kickable shield, but takes full CC and its damage is steady |

**What the review taught, for the dungeons still to go:** a mob whose abilities each have a
clear answer is `medium`, even when the raw numbers are large — `high` is for the ones that
force the group to change what it is doing. Applied here to Flamelasher and Chillweaver, both
proposed `high` on damage alone.

**Bosses** (Melidrussa, Kokia, Erkhart, Kyrakka) carry no `threat`, following Altar of Fangs:
the ring is gold regardless, so the field would only add a badge.

## Open questions

1. **Infused Whelp (187894) — add or ambient trash?** Written as `role: add`, threat empty,
   because Melidrussa calls them in with Awaken Whelps and MDT prices them at 0 forces. But
   MDT also places **52** of them on the map, and Method lists them as their own mob rather
   than under the boss. If they are walked past outside the encounter, they want a threat.
   Same question, smaller, for **Primal Thundercloud** (22 placements, summoned by two trash
   casters).

2. **The grey ring on `role: add`.** Still the open thread from Altar of Fangs, now with far
   more units on screen: six entries here are `role: add` with no threat, so their rings read
   "not assessed" rather than "not applicable". Ruby Life Pools makes the case stronger than
   Altar did — 52 whelps and 22 thunderclouds is a lot of grey.

## Disagreements between sources

| Ability | MDT says | Method says | Card follows |
| --- | --- | --- | --- |
| **Rolling Thunder** (Thunderhead) | dispel: `magic` | hints Stoneform clears it, which would make it physical | MDT — the badge comes from MDT. Flagged in the card's prose. |
| **Thunderous Stomp** (Storm Warrior) | one spell, no buff | "Party Damage, **Buff**, Important" | MDT — no buff exists in the data to describe. This is why the `low` above is the shakiest call. |
| **Flaming Barrage** (Ashseer Flamelasher) | not interruptible | "Stop" | Both — MDT is right that it is not kickable; the mob takes stuns, so Method's advice still applies. Written as CC, not kick. |

## Written from

- `src/data/generated/ruby-life-pools.json` — forces, clones, health, CC lists, `interruptible`
  and `dispel` flags. **Every spell ID in every card was checked against this file.**
- `src/data/generated/spells.json` — names, cast times, ranges, damage figures.
- `https://www.method.gg/guides/dungeons/ruby-life-pools/ability-tracker` — tank buster /
  frontal / avoidable classification, which MDT has no field for, and the "Tough" marker used
  to sanity-check the weight ordering.

Method's "Tough" mobs, for reference: Primal Juggernaut, Defier Draghar, Blazebound Destroyer,
Flamegullet, Thunderhead, Ruinous Stormbringer, Tempest Channeler, High Channeler Ryvati. All
eight are proposed `high` above — the two sources agree on the shape of the dungeon.
