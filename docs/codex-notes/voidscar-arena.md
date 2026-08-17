# Voidscar Arena — 32/32 written

Timer unknown · 738 forces required · 3 bosses, 24 trash, 5 encounter units.

## Verdicts — reviewed with RwlRwlRwlRwl

The **Threat** column is what the card carries. `⇩` marks a proposal RwlRwlRwlRwl overruled
downwards; `⇩*` one I lowered myself before showing him. Eight of twenty-four moved down, none
up — this is the dungeon where his scale became legible (see below).

| Mob | Weight | Threat | Why |
| --- | --- | --- | --- |
| Watchful Harrower | **260** (35%) | `medium` ⇩ | Was `high` on 65 forces a body and an 873k shared hit. Stacking for it is a known answer |
| Brutal Overseer | 200 (27%) | `high` | 30-second ramp, +10% per slam, ended only by breaking the shield |
| Agitated Voidscythe | 200 (27%) | `high` | 679k single hit — the largest in the trash |
| Kilivore Screamer | 105 (14%) | `high` | 6-second group fear, fifteen units of it |
| Savage Shredclaw | 95 (13%) | `medium` | +20% damage taken; an amplifier, not a threat |
| Devouring Brutalizer | 90 (12%) | `high` | ~2.7M on the tank per Brutalize, two self-heals, unskippable |
| Voidtouched Magi | 75 (10%) | `low` ⇩ | Was `high`, then `medium`; two 4-second casts, one kicked and one dodged, and nothing else |
| Enthralled Shaman | 63 (9%) | `medium` ⇩ | Was `high` on Magma Totem's ~120k/sec. The totem is a body you kill |
| Scavenging Siphoid | 60 (8%) | `low` | One force each; **but see the open question** |
| Lost Sethrak | 56 (8%) | `medium` | 20-second pools that overlap |
| Dominated Brawler | 56 (8%) | `medium` | An enrage and a kick, neither optional |
| Feral Saberon | 52 (7%) | `medium` | The shared enrage's most common carrier |
| Voidminder | 42 (6%) | `low` ⇩ | Was `high` on "30% of a health bar healed". Mending Void is **single-target**, 3% per tick, and kickable — see the healer comparison below |
| Aegyra the Unyielding | 40 (5%) | `high` | Champion's Spear chains the group into Earthsplitter |
| Raj'kess the Spellstorm | 40 (5%) | `low` ⇩ | Was `high` on Method's Tough marker; entirely positional, and every one of its tooltips is unscaled |
| Longtooth Tuskarr | 35 (5%) | `medium` | Two enrages, one of which cuts both ways |
| Sycophantic Tarasek | 32 (4%) | `medium` | A magic dispel and an enrage on one body |
| Chitigoth | 25 (3%) | `high` | 100-yard unavoidable aura for 10 sec |
| Brutok | 25 (3%) | `high` | 388k charge — but dodging it hands back a 5-second stun |
| Blistercreep | 12 (2%) | `low` | One force, small radius, unscaled number |
| Angry Krolusk | 8 (1%) | `low` ⇩ | Was `medium` on -40% movement for 12 sec |
| Protective Turtle | 5 (0.7%) | `low` ⇩ | Was `high` on a -75% party-wide wall — the call I flagged hardest, overruled hardest. Five forces, and the wall may be kickable |
| Raging Raptor | 5 (0.7%) | `low` | Nothing but the shared enrage |
| Abducted Drakonid | 5 (0.7%) | `low` ⇩ | Was `medium`; instant, nothing to kick, magic dispel is the only answer |

**Bosses** (Taz'Rah, Atroxus, Charonus) carry no `threat`; worth 0 forces.

### The two healers, and why one is `high` and the other `low`

Worth recording, because it looked like an inconsistency and is not. Both cost 7 forces:

| | Earthwhisper Tender (Den) — `high` | Voidminder (Voidscar) — `low` |
| --- | --- | --- |
| Heals | **nearby allies**, 5% max health / 2 sec | **the target**, 3% max health / 2 sec |
| Cast | 3.5 sec | 20-second channel |
| Answers | interrupt **or** magic dispel | interrupt |

Pack-wide against single-target is the whole difference. The scale is not counting healing
throughput, it is asking how much of the pull the ability changes.

## The dungeon's signature: Feral Rage

`1249661` — *"+20% melee haste to nearby allies within 30 yards"*, flagged `dispel: enrage` —
is cast by **eight** different mobs: Feral Saberon, Longtooth Tuskarr, Sycophantic Tarasek,
Chitigoth, Brutok, Raging Raptor, Protective Turtle, Abducted Drakonid.

Plus three more enrages on top: **Bloodsurge** (Dominated Brawler) and **Bolster** (Longtooth
Tuskarr, which raises its own damage 50% *and* its target's damage taken 20%).

This is the fact to carry into a route: Voidscar Arena wants more than one soothe in the group.

## Shared with other dungeons

**Magma Totem** (npcId `248666`, spell `1246821`) is the same NPC MDT places in Den of
Nal'orakk. Both dungeons have a card for it, written consistently. Likewise **Mending Void**
(`1310324`) belongs to both the Voidminder and the Devouring Brutalizer.

## Open questions

1. **Scavenging Siphoid — `low` or not?** MDT's Void Tentacles tooltip is unscaled (reads as
   1 damage); Method classes the same ability a **tank buster**. Sixty of them on the map at
   one force each. The card says plainly that the two sources disagree. If the tentacles hit
   properly in game this becomes at least `medium`.

2. **Protective Turtle's Shell Guard — interruptible?** MDT does not flag it; Method files it
   under *Stop*. The card states both. It matters a lot: a kickable 75% raid wall is a very
   different mob from an unkickable one.

3. **Devouring Brutalizer's Devour** — a 9-second cast healing it for half its health, which
   MDT does **not** mark interruptible. If it is kickable in game, that changes the fight
   entirely.

4. **`Demoralizing Shout`** (`1298899`, Dominated Brawler) is flagged interruptible with **no
   tooltip text at all**. Method calls it important. What it actually does is unknown from the
   data, and the card says so.

5. **`Thundering Storm`** (`1299270` / `1299273`, Raj'kess) — likewise no tooltip text.

## Unscaled tooltips — not quoted in any card

| Mob | Ability | Reads as |
| --- | --- | --- |
| Scavenging Siphoid | Void Tentacles | 1 Shadow |
| Blistercreep | Blisterburst | 14 Fire |
| Raj'kess | Raging Typhoon / Crashing Wave | 10 / 12 Nature |
| Sycophantic Tarasek | Melt Armor | 10 Fire, 0-yard radius |
| Brutok | Head Bash | 150 Fire every 5.2 sec |

Aegyra the Unyielding also has **0 health** recorded in MDT, unlike every other mob in the
dungeon. Nothing in her card depends on it.

## Written from

- `src/data/generated/voidscar-arena.json` — every spell ID checked against it.
- `src/data/generated/spells.json`.
- `https://www.method.gg/guides/dungeons/voidscar-arena/ability-tracker`.

Method's "Tough": Brutal Overseer, Aegyra, Voidtouched Magi, Raj'kess, Chitigoth, Brutok,
Agitated Voidscythe, Watchful Harrower, Devouring Brutalizer. All nine proposed `high`.
Method spells the screamer "Killvore"; MDT spells it "Kilivore" — the card follows MDT.

**No CC data**: all 32 mobs have an empty `cc` list, as with every Midnight dungeon.
