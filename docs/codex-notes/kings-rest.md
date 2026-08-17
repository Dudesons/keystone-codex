# King's Rest — 39/39 written

Timer unknown · 608 forces required · 6 boss entries, 23 trash, 10 encounter units.

**This dungeon has real CC data** (25 of 39 mobs), unlike the Midnight ones — so its cards can
and do say what crowd control applies.

## Verdicts — reviewed with RwlRwlRwlRwl

This dungeon was **re-derived from the data before review**, not carried over from the first
pass: the original proposals rated 18 of 24 mobs `high`, which the reviewed dungeons had
already shown to be a scale of its own. The `Was` column is that first pass.

| Mob | Weight | Was | Threat | Why |
| --- | --- | --- | --- | --- |
| Animated Guardian | **88** (14%) | high | `high` | +75% attack speed with **no dispel type** — the one buff here that cannot be soothed, on a Taunt-only body |
| Royal Berserker | 66 (11%) | high | `medium` | 394k lunge, but it takes every CC in the game: stun, incap, silence, root, shackle |
| Shadow-Borne Champion | 50 (8%) | high | `medium` | Overruled by RwlRwlRwlRwl. Shadow Whirlwind reaches 100 yards and Vigilant Defense blocks ranged for 6 sec, but the +150% is a soothable enrage |
| Umbral Warrior | 30 (5%) | low | `low` | One 14.5k ability, full CC list. Method's tank-buster claim has nothing behind it in the data |
| Interment Construct | 30 (5%) | high | `high` | Entomb → Wail of Mourning, party-wide and **increasing with time** until someone frees the player |
| **Shadow of Zul** | 30 (5%) | high | `high` | Now rated on what it does — see below. Previously rated on forces and health alone, which was guessing |
| Bloodsworn Assassin | 28 (5%) | medium | `low` | A 24k/sec bleed and -10% movement; dispellable and stunnable |
| Spectral Shaman | 28 (5%) | high | `medium` | Healing Tide Totem is instant, so there is no kick — the answer is focusing the totem, and the card leads with that |
| Half-Finished Mummy | 28 (5%) | high | `medium` | Party-wide disease, but kickable **and** dispellable |
| Queen Patlaa | 25 (4%) | high | `medium` | Volley zones at 67k/sec, a soothable +25% pack buff, a poison slow |
| King A'akul | 25 (4%) | high | `medium` | Bleed with -20% healing received; bleed-dispellable, and Blood Drain heals him 0% |
| King Rahu'ai | 25 (4%) | high | `medium` | The 30% wall is uninterruptible but magic-dispellable — an answer, just not a kick |
| King Timalji | 25 (4%) | high | `high` | Bladestorm **walks toward a player** at 164k every half-second |
| Queen Wasi | 25 (4%) | high | `medium` | Bind Soul charms for 10 sec, but is kickable *and* magic-dispellable, single target |
| Purification Construct | 25 (4%) | high | `medium` | Overruled. It burns the floor permanently, but the damage itself is flat |
| Ghostly Brute | 25 (4%) | high | `high` | **727k Soul Crush** plus +30% Physical taken. Nothing kickable, nothing dispellable, Taunt only |
| Phantom Hex Priest | 21 (3%) | high | `medium` | Hex is a curse, but kickable, dispellable, and the mob takes eight kinds of CC |
| Risen Hexer | 20 (3%) | high | `medium` | Two kickable casts, both dispellable — and the "party-wide" claim turned out to be wrong (below) |
| Honored Raptor | 20 (3%) | medium | `low` | Leap-and-cone, avoidable and stunnable |
| Embalming Fluid | 17 (3%) | medium | `low` | One force each; a stacking 30% slow, full CC list |
| Skeletal Hunting Raptor | 10 (2%) | medium | `low` | A leap plus a soothable +25% pack buff |
| Seneschal M'bara | 10 (2%) | high | `medium` | 35% heal that is kickable *and* magic-dispellable; the wall is dispellable too |
| Guard Captain Atu | 10 (2%) | medium | `low` | One ability, and it comes off as magic |
| Minion of Zul (133943) | **0** | high | `low` | Dispelling Bound by Shadow kills it outright. Worth **knowing** — but `high` was using the field for "interesting" rather than "dangerous" |

**Bosses** (The Golden Serpent, Mchimba, King Dazar, and the Council trio Aka'ali / Zanazal /
Kula) carry no `threat`; all worth 0 forces.

### A claim that was wrong: Hex Volley is not party-wide

The Risen Hexer's card said Hex Volley hit "everyone", in the note, the trap and the prose. MDT's
tooltip reads *"Inflicts 116379 Shadow damage and curses for an additional 38793 Shadow damage
every 1 sec for 12 sec"* — no radius, no AoE wording. The claim was inferred from the word
*Volley*. All three places now describe the tooltip, and the mob dropped a level as a result.

## Shadow of Zul — written from play, not from data

**MDT extracted an empty spell list for this mob**: 30 forces, 8.4 million health, no abilities.
RwlRwlRwlRwl supplied what it does, and the card now carries it as prose, in order:

1. Two players are marked, each with a large area around them, and have to split — from the
   group and from each other.
2. Two soaks follow.
3. One cast to interrupt.

This is **observed behaviour, not a data source**, and the card says so. Nothing is written into
`spells:` — the codex only carries IDs that exist in the extracted data, and Method's three
names (*Shadow Barrage*, *Pool of Darkness*, *Dark Revelation*) are deliberately not mapped onto
the three parts above, because matching them would be a guess.

## Recurring spells worth knowing

| Spell | Cast by | Answer |
| --- | --- | --- |
| **Captain's Bulwark** (`1296671`) — -30% damage taken for allies | Seneschal M'bara, Guard Captain Atu, King Rahu'ai | **Not interruptible.** Magic dispel. |
| **Heavy Slams** (`1310755`) — 24k party-wide per melee swing | Animated Guardian, Interment Construct, Purification Construct | Nothing; it is baseline pressure |
| **Bestial Berserk** (`1297763`) — +25% to the pack | Queen Patlaa, Skeletal Hunting Raptor | Enrage — soothe |
| **Hunting Leap** | Honored Raptor, Skeletal Hunting Raptor, Reban | Stun where the mob allows it |
| **Wretched Discharge** (`267763`) | Half-Finished Mummy, Mchimba | Kick, or dispel as disease |

King's Rest asks for an unusually wide dispel kit: **bleed** (Royal Berserker, Bloodsworn
Assassin, King A'akul, Kula), **curse** (Risen Hexer, Phantom Hex Priest), **poison** (Queen
Patlaa, Embalming Fluid, Zanazal), **disease** (Half-Finished Mummy), **magic** (five mobs) and
**enrage** (Shadow-Borne Champion, Queen Patlaa).

## Data oddities

- **`Suppression Slam`** (Animated Guardian) reads as **0 damage** — unscaled. The 2.5-second
  stun is the real ability and is what the card describes.
- **`Rune of Echoes`** (`1289063`, on Animated Gold) carries a tooltip describing a *player*
  rune — "Your Core Rune (Void-Touched Orbs)…" — which has nothing to do with this dungeon.
  Listed in the card, explicitly not described.
- **`Liquid Gold`** (T'zala, King Dazar) is unscaled: reads as 10 Fire.
- **`Blood Drain`** (King A'akul) says it heals him for **0%** of the damage dealt, which is
  either a scaling placeholder or a real change. The card does not claim it heals.
- **`Reinforced`** (`1309499`, all three of Zanazal's totems) has no tooltip text.
- Several tooltips still name **Rezan** and **Reban** interchangeably, and Skeletal Hunting
  Raptor's Bestial Berserk names Queen Patlaa. Blizzard's copy, not extraction errors.

## Written from

- `src/data/generated/kings-rest.json` — every spell ID checked against it.
- `src/data/generated/spells.json`.
- `https://www.method.gg/guides/dungeons/kings-rest/ability-tracker`.

Method's "Tough": Animated Guardian, Risen Hexer, Shadow-Borne Champion, King Rahu'ai,
Seneschal M'bara, King Timaji, Queen Wasi, Queen Patlaa, Skeletal Hunting Raptor, Purification
Construct, Interment Construct, Phantom Hex Priest, Royal Berserker, Ghostly Brute, Shadow of
Zul. Method spells the king "Timaji"; MDT spells him "Timalji" — the card follows MDT.
