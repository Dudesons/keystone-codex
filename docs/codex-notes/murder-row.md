# Murder Row — 41/41 written

34 minute timer (already in `TIMERS`) · 655 forces required · 5 boss entries, 20 trash,
16 encounter and role-play units.

## Verdicts to confirm

| Mob | Weight | Proposed | Why |
| --- | --- | --- | --- |
| Defiled Golem | **245** (37%) | `high` | A third of the dungeon; slam seeds several 194k detonations |
| Shivan Punisher | 175 (27%) | `high` | **Punishing Might rewards it for missing** — avoidance makes it stronger |
| Unleashed Imp | 116 (18%) | `medium` | 58 bodies at 2 forces; unanswerable by interrupts, just kill them |
| Corrupted Warlock | 100 (15%) | `high` | 582k Curse of Doom; two self-heals, neither interruptible |
| Fel Invoker | 77 (12%) | `high` | **Health Funnel: 150% of a health bar over 30 sec.** The kick of the dungeon |
| Trained Felhunter | 75 (11%) | `medium` | Melee only; Imprison is the handler's leash, not a player CC |
| Felonious Mage | 63 (10%) | `medium` | One channel worth kicking; no damage figure in the data |
| Wrathguard Flayer | 55 (8%) | `high` | -60% damage taken and CC immunity for a minute, on a 5-force body |
| Bribed Guard | 50 (8%) | `high` | +20% Physical taken for 20 sec, stacking with everything else |
| Row Hooligan | 36 (5%) | `medium` | The bleed is four times the hit |
| Bribed Captain | 35 (5%) | `high` | **Deep Corruption: +25% damage, -25% AoE taken, no dispel type** |
| Felmaster Lucsei | 30 (5%) | `high` | Unlimited-range frontal |
| Seductive Sayaad ×2 | 24 / 6 | `high` | 6-second disorient, zero damage — loses the interrupt race it should win |
| Demon Fly | 20 (3%) | `low` | A 29k dash and nothing else |
| Felwyrm | 18 (3%) | `medium` | One force, 194k on death, eighteen of them |
| Street Sneak | 18 (3%) | `high` | Stealth opener; takes **maximum** health per stack |
| Keen Taskmaster | 14 (2%) | `high` | **+200% attack speed** to the whole Worker pack |
| Massive Felwyrm | 12 (2%) | `high` | 291k death explosion, and it spawns more explosions |
| Warehouse Worker | 12 (2%) | `medium` | 3-second stun on a 2-force body |

**Bosses** (Xathuux, Kystia, Nibbles, Zaen, Lithiel) carry no `threat`; all worth 0 forces.
Note Kystia and Nibbles are one encounter, as are Kystia and her mirror image (`255050`).

Calls worth checking: **Unleashed Imp** at `medium` (58 units — is the volume alone worth
`high`?) and **Keen Taskmaster** / **Massive Felwyrm** at `high` on 14 and 12 forces
respectively, both judged on effect rather than weight.

## The Illicit Rain — a role-play sequence, not combat

Seven NPCs in this dungeon belong to a tavern minigame rather than to any pull:
**Belath Dawnblade** (the host, whose spell list *is* the rulebook), **Silvermoon Patron**,
**Rowdy Patron**, **Nauseous Patron**, **Selenar Sunshy**, **Masked Noble** and
**Influentual Reviewer**.

Belath's abilities name four jobs — Server, Cleaner, Entertainer, Bouncer — performed while
**Disguised** as employees. Two of these NPCs carry real mechanics worth knowing:

- **Selenar Sunshy's Spill Zone** is **-70% movement speed**, the harshest slow in the pool.
- **Influentual Reviewer's Scathing Review**: the tooltip states that *interrupting it makes
  the spell backfire and forces them to leave*. The kick is the solution, not a mitigation.

Every one of these has a card because MDT places them on the map. If the codex ever wants to
hide non-combat NPCs, this dungeon is the reason and the test case.

## Recurring themes

**Things that explode on death**: Felwyrm (194k / 4 yd), Tiny Felwyrm (194k), Massive Felwyrm
(291k / 10 yd), Forbidden Freight (291k + knockback). The first three are all **magic
dispellable before the kill** — an option most groups never look for on a one-force mob.

**Healing to stop**: Fel Invoker's Health Funnel (150% of a bar, kickable), Corrupted Warlock's
Dark Pact and Drain Life (**neither interruptible**).

**Buffs with no dispel type** — cannot be soothed, must be out-killed: Shivan Punisher's
Demonic Frenzy, Bribed Captain's Deep Corruption.

## Unscaled tooltips — not quoted in any card

| Mob | Ability | Reads as |
| --- | --- | --- |
| Bribed Guard / Captain | Shield Bash | 55 Physical |
| Bribed Guard / Captain | Glaive Toss | 9 Physical, 3 bleed |
| Felonious Mage | Fel Missiles | no figure at all |
| Kystia | Felshield | `[abs(20 * 4)]%` — an unresolved formula |
| Masked Noble, Trained Felhunter (272246) | — | 0 health recorded |

Also: **Felmaster Lucsei's Eye Beam** has two variants reading 38793 and 10857 — the same
ability at two scales, which is why neither figure is quoted.

## Open questions

1. **`Release Demon`** (`1217937`, Felmaster Lucsei) has no tooltip text. The name suggests it
   frees a Trained Felhunter; the card says that is inference, not data.
2. **Method lists a "Doomguard"** with a kickable Doom Bolt. **MDT has no such mob** in Murder
   Row. No card was created for it.
3. **Rowdy Patron's `Unsatisfied Customer`** is flagged both interruptible and enrage on what is
   otherwise pure role-play. Probably vestigial; worth a glance.
4. **The Infernal has 202.7M health** — eight times Lithiel's. It is terrain, not a kill target,
   and the card says so.

## Written from

- `src/data/generated/murder-row.json` — every spell ID checked against it.
- `src/data/generated/spells.json`.
- `https://www.method.gg/guides/dungeons/murder-row/ability-tracker`.

Method's "Tough": Bribed Guard, Bribed Captain, Massive Felwyrm, Shivan Punisher, Corrupted
Warlock, Doomguard (absent from MDT), Felmaster Lucsei, Defiled Golem.

**No CC data**: all 41 mobs have an empty `cc` list, as with every Midnight dungeon.
