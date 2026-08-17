# Den of Nal'orakk — 32/32 written

Timer unknown · 729 forces required · 4 boss entries, 18 trash, 10 zero-force units.

## Verdicts — reviewed with RwlRwlRwlRwl

The **Threat** column is what the card carries after the review. `⇩` marks a proposal
RwlRwlRwlRwl overruled downwards; `⇩*` one I lowered myself when re-reading the dungeon under
his calibration rule (see `ruby-life-pools.md`).

| Mob | Weight | Threat | Why |
| --- | --- | --- | --- |
| Spirit of Hunger | **175** (24%) | `high` | Steals 15% max health per stack; the effigy is a curse most groups do not dispel |
| Territorial Matriarch | 128 (18%) | `medium` ⇩ | Was `high` on the 40-yard stacking enrage; overruled |
| Thornclaw Gatherer | 115 (16%) | `medium` | The pool (78k/sec for 20 sec) matters, the mob does not |
| Keen-Eyed Striker (241816) | 112 (15%) | `medium` | Stacking bleed on a target of its choosing |
| Earthwhisper Tender | 98 (13%) | `high` | The dungeon's healer — 5% max health to the whole pack every 2 sec |
| Frostfang | 90 (12%) | `low` ⇩ | Was `medium` on a 60% attack-speed buff. See the open question: the card still warns the buff may not be soothable, and `low` implies otherwise |
| Grizzled Warbringer (245146) | 75 (10%) | `high` | Method Tough; stacking armour-ignoring party damage |
| Frigid Mauler | 72 (10%) | `medium` ⇩* | Was `high` on -50% group haste, but it comes from a free 3.5-second kick — the clearest answer in the dungeon |
| Terra Rumbler | 70 (10%) | `low` ⇩ | Was `medium` on 24k party-wide every 2 sec |
| Glacial Revenant | 56 (8%) | `low` ⇩ | Was `medium`; small hit, and a death patch that is arguably useful |
| Avatar of Determination | 56 (8%) | `high` | Tombs the whole party until broken, and stuns for 4 sec |
| The Winter Squall | 50 (7%) | `high` | A cloud that blocks targeting both ways. Rests on the mechanic alone — its tooltips are unscaled, so no figure is quotable |
| Stormbound Mystic | 35 (5%) | `medium` | Two kickable casts, no other complication |
| Loa Speaker Nanea | 35 (5%) | `low` ⇩ | Was `high` — Method Tough, 7.8M health, 30-second ground hazards. Two steps down, and the widest gap between the data and the judgement in the season so far |
| **Ruthless Totemcaller** | 25 (3%) | `high` | **~120k/sec party-wide while its totem stands.** Lowest weight, highest damage |
| Bonded Beasttamer | 24 (3%) | `medium` | Enrage shared with its pet, one kickable cast |
| Loyal Saberfang | 20 (3%) | `medium` | 12-second untauntable fixate |
| Keen-Eyed Striker (245752) | 7 (1%) | `low` | The variant with Greater Invisibility and Scavenge; a nuisance, not a threat |
| **Curious Yearling** | **0** | `high` | **Worth no forces and casts the Matriarch's full enrage.** Nineteen on the map |

Note the two entries where forces and danger disagree completely — **Ruthless Totemcaller**
(3% of the count, the dungeon's highest sustained damage) and **Curious Yearling** (0% of the
count, the dungeon's most dangerous buff). Both are `high` on that basis rather than on weight.
The Yearling now outranks the Matriarch whose enrage it casts, which is deliberate: the
Matriarch is a body you can kill, the Yearlings are nineteen you cannot.

## Two claims MDT does not carry — pending RwlRwlRwlRwl

Raised in review and **not written**, because MDT holds neither:

| Claim | What MDT actually holds |
| --- | --- |
| Earthwhisper Tender also ignores armour and lays a silence zone | The Tender has exactly three spells: Healing Breeze, Earth Bolt, Xal'atath's Gift. **No silence exists anywhere in this dungeon** — the season's only two are Aspix (Temple of Sethraliss) and Lightwarden Ruia (The Blinding Vale). Armour-ignoring damage in the Den belongs to Grizzled Warbringer's Primal Echo, and armour *shredding* to Thornclaw Gatherer's Shredding Claws |
| Stormbound Mystic also has a heal | The Mystic has exactly three spells: Arc Lightning, Lightning Bolt, Xal'atath's Gift. The dungeon's only ally heal is the Tender's Healing Breeze; the only self-heal is Spirit of Hunger's Feast of Misery |

If these come from playing the dungeon rather than from a data source, they go in the prose as
observed behaviour — never attributed to MDT, and never as a badge, since a badge is generated
from data that does not contain them.

**Bosses** (The Hoardmonger, Sentinel of Winter, Nalorakk, Echo of Nalorakk) carry no
`threat`. Bosses are worth 0 forces here, as in Altar of Fangs and Ruby Life Pools — unlike
The Blinding Vale.

## Unscaled tooltips — do not quote these numbers

Several mobs carry placeholder damage values in `spells.json`, orders of magnitude below their
neighbours. Their cards describe behaviour and durations, and quote no figures:

| Mob | Ability | Reads as |
| --- | --- | --- |
| Grizzled Warbringer | Primal Echo | 10 Physical |
| Grizzled Warbringer | Poison Spear Volley | 35 Nature |
| Loa Speaker Nanea | Lightning Bolt, Earthquake | 12 / 16 Nature |
| Volatile Totem | Volatile Flames | 5 Fire |
| The Winter Squall | Harsh Winter (`1309947`) | 0 damage, 0-yard radius |
| The Winter Squall | Harsh Winter (`1309964`) | "38793 yard radius" — the damage value in the radius field |

## Open questions

1. **Frostfang's Bloodrush.** +60% attack and movement speed for 10 sec. MDT records **no
   dispel type**, and Method files it as a plain buff — so neither source says it is an enrage.
   The card tells the reader not to count on soothing it. Worth one look in game, because if
   it *is* soothable the mob drops to `low`.

2. **Loyal Saberfang's Shred Armor.** Method lists it as a tank buster on this mob; MDT holds
   no such spell. The card follows MDT and says so.

3. **Spells with no tooltip text at all** — `Matriarch's Vigil` (1241219), `Overwhelm Prey`
   (1246877), `Heal` (1264753), `Stunned` (1297796), `Echoing Maul` on the Echo (1242976),
   `Create Bonfire` (1253083), `Summoning Ritual` (1250805). Each card says explicitly that
   nothing can be said, rather than guessing.

4. **The Pale Eye and Snow Orb Stalker** are scripting units with one textless spell each. They
   have cards because MDT places them. If the codex ever wants to hide such units, these are
   the examples.

## The Nalorakk encounter, in one paragraph

It inverts the usual instinct and is worth reading before pulling. Every mechanic targets
**Zul'jarra**, an ally. Echoes that reach her, and Forceful Slams that hit nobody, land on her
and return as **Demoralizing Scream** — 145k party-wide plus a stacking +10% damage taken. So
players intercept charges (68k each) and stand *inside* the 776k slam rather than clear of it.
Her **Defensive Stance** is the one time she protects them, cutting Overwhelming Onslaught by
80% for anyone behind her.

## Written from

- `src/data/generated/den-of-nalorakk.json` — every spell ID checked against it.
- `src/data/generated/spells.json`.
- `https://www.method.gg/guides/dungeons/den-of-nalorakk/ability-tracker`.

Method's "Tough" mobs: Spirit of Hunger, Avatar of Determination, The Winter Squall, Grizzled
Warbringer, Loa Speaker Nanea, Earthwhisper Tender (marked on Healing Breeze). All six are
proposed `high`. Method also has an **Environment** section (Harsh Winds) with no MDT mob
behind it — no card exists for it, and none should.

**No CC data**: all 32 mobs have an empty `cc` list, as with every Midnight dungeon. No card
here claims anything about crowd control.
