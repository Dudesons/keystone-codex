# Temple of Sethraliss — 45/45 written

Timer unknown · 687 forces required · 5 boss entries, 21 trash, 19 encounter units.

**This dungeon has partial CC data** (18 of 45 mobs), so its cards say what applies where MDT
knows.

## Verdicts to confirm

| Mob | Weight | Proposed | Why |
| --- | --- | --- | --- |
| Sandfury Stonefist | **100** (15%) | `high` | Sunder Slam stacks +50% Physical damage taken |
| Sand-Sworn Rider | **100** (15%) | `high` | 4-second disorient on a frontal, plus a summon |
| Agitated Nimbus | 75 (11%) | `high` | Stacking buff that feeds a party-wide hit — but dispellable |
| Sandswept Hunter | 63 (9%) | `medium` | ~490k channel, stoppable by any CC in a long list |
| Storm Adept | 56 (8%) | `medium` | One kickable bolt, full CC list |
| Orb Watcher | 50 (7%) | `high` | 582k buster that also sprays 291k shrapnel; CC-immune |
| Shrouded Fang | 49 (7%) | `high` | Stealth opener with a stun |
| Poisonous Viper | 42 (6%) | `medium` | A single 10-second poison |
| Barbed Krolusk | 35 (5%) | `medium` | One charge, one bleed |
| Lightning Serpent | 35 (5%) | `medium` | Leaves a pool where the buff expires |
| Static Anomaly | 30 (4%) | `medium` | Teleports to players; cannot be held |
| Imbued Stormcaller | 28 (4%) | `high` | Three abilities wanting three globals; +50% damage buff |
| Twisted Hexxer | 25 (4%) | `high` | **Hex Muck turns players into frogs** |
| Brood Tender | 21 (3%) | `medium` | One kickable bolt |
| **Faithless Tormentor** | 20 (3%) | `high` | **Fixates the healer by design**, -5% healing per hit, stacking |
| **Temple Disruptor** | 20 (3%) | `high` | **MDT has no spells for it.** Judged on Method's "Tough" + Interrupt |
| Krolusk Matriarch | 16 (2%) | `high` | 727k Head Butt — and **no Taunt applies** |
| Faithless Subjugator | 14 (2%) | `high` | Embryonic Vigor: +30% damage **until cancelled** |
| Dutiful Tamer | 7 (1%) | `medium` | Summons Krolusks worth no forces |
| Spark Channeler (139110) | 5 (1%) | `high` | 291k **and a 6-second stun**, CC-immune |
| Spark Channeler (265057) | 5 (1%) | `medium` | **No spells in MDT** — placeholder judgement, the weakest call here |

**Bosses** (Merektha, Avatar of Sethraliss, Adderis, Aspix, Galvazzt) carry no `threat`; all
worth 0 forces. Adderis and Aspix are one encounter.

Calls worth checking: **Faithless Tormentor** and **Spark Channeler (139110)** are both `high`
on 20 and 5 forces — judged entirely on effect. And **Spark Channeler (265057)** at `medium` is
a guess about a mob with no data at all.

## Three data gaps that need a look in game

1. **`Avatar of Sethraliss` (133392) — no spells at all.** 23.8M health, the dungeon's final
   boss, and an empty ability list. Unusually, the fight is still legible because MDT carries
   its **adds** and they hold the mechanics: Essence Defiler (blocks all external healing on
   her), Corrupted Guardian (485k buster, and its explosion creates the orbs), Lifeforce (the
   cleanse-or-burst decision), plus encounter versions of the Twisted Hexxer and Faithless
   Tormentor. Method names the Avatar's own abilities and several match spells MDT files under
   the adds — so the attribution is what is missing, not the fight.

2. **`Temple Disruptor` (269227) — no spells.** Method names *Essence Disruption*, an
   interruptible cast to stop. Four units at 5 forces each.

3. **`Lightning Spire` (135445) — no spells, 0.2M health.** Method lists Lightning Spire among
   Galvazzt's abilities as avoidable party damage, and that is now the *only* reason to think
   the mechanic exists. **This entry used to read "21.6M health" and rested on it**: a
   boss-sized health bar on a spell-less NPC was the second, independent reason. MDT 6.2.10
   corrected the figure to 235,746, so that reason was a data error all along. Its cards, and
   Galvazzt's, were rewritten rather than renumbered — the conclusion changed, not just the
   number. **A health figure is data like any other, and an argument built on one inherits its
   errors.**

Also `Spark Channeler` (265057), `Merektha` (134487), `Polarized Spire`, `Swarming Krolusk`,
`Faithless Conscript`, `Snake` and `Lesser Lifeforce` have empty spell lists — those read as
scripting or filler rather than gaps.

**In none of these cases were Method's ability names written into a spell list.** They are
recorded in the cards' prose. The codex only carries IDs that exist in the extracted data.

## The Avatar's central trade — worth reading before pulling

Every option costs something:

- **Leave a Lifeforce orb** → **Corruption Burst**: 194k party-wide, **and +100% damage taken
  from that ability for 3 sec**, so consecutive bursts escalate.
- **Touch it** → cleansed, and the toucher takes **Corruption**: -33% healing done and
  **+250% Physical damage taken** for 15 sec, stacking. Its damage-per-second component
  **became unscaled in the patch shipped alongside MDT 6.2.10** — the tooltip went from 29095
  Shadow to a bare `4` — so the cards describe the debuff and quote no figure for it.
- **Leave it cleansed** → the Avatar **consumes** it, healing 2% plus a stacking regeneration.

Meanwhile four Faithless Tormentors are fixating the healer, and two Essence Defilers are
blocking external healing on the boss.

## Recurring spells

| Spell | Cast by |
| --- | --- |
| **Serrated Charge** (`1291399`) | Barbed Krolusk, Sand-Sworn Rider, Dutiful Tamer |
| **Scouring Sand** (`272655`) — frontal + 4s disorient | Sand-Sworn Rider, Krolusk Matriarch |
| **Lightning Bolt** (`1291262`) | Storm Adept, Imbued Stormcaller |
| **Accumulate Charge** (`1310739`) — magic dispel | Agitated Nimbus, Imbued Stormcaller |
| **Loose Sparks** (`267483`) — 291k + 6s stun | Spark Channeler (139110), Loose Spark |
| **Swarming Krolusks** (`1292990`) | Sand-Sworn Rider, Dutiful Tamer |
| **Lingering Storm** (`1289589` / `1293133`) | Lightning Serpent, Storm Serpent, Merektha |

## Data oddities

- **`Cytotoxin`** (Poisonous Viper) is flagged **interruptible and instant-cast** — nothing to
  interrupt. The card says the poison dispel is the real answer.
- **`???`** (`1300666`, Twisted Hexxer) has no name and no tooltip text at all.
- **`[DNT]Summon Sand egg`** (`1289208`, Egg Marker) is developer scaffolding — `[DNT]` means
  "do not translate". Listed, not described.
- **Unscaled tooltips**: `Volley` (Sandswept Marksman, reads 54), `Siphon Energy` (Eye of
  Sethraliss, reads 4).
- **Krolusk Matriarch and Barbed Krolusk have no Taunt** in their CC lists — unusual, and it
  matters for the Matriarch's 727k Head Butt.

## Written from

- `src/data/generated/temple-of-sethraliss.json` — every spell ID checked against it.
- `src/data/generated/spells.json`.
- `https://www.method.gg/guides/dungeons/temple-of-sethraliss/ability-tracker`.

Method's "Tough": Sandfury Stonefist, Sand-Sworn Rider, Dutiful Tamer, Krolusk Matriarch,
Agitated Nimbus, Orb Watcher, Temple Disruptor, Twisted Hexxer, Spark Channeler. Method also
groups **Adderis and Aspix** as one boss and lists a **Shrouded Fang** ability called
*Slither Strike* under a "Tough mob ability" heading, which does not match its own categories —
treated as noise.
