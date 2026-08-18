---
npcId: 134616
name: "Barbed Krolusk"   # auto
count: 5   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1291399
    name: "Serrated Charge"   # auto
    # Instant · 60 yd range
    tag: dispel
    prio: 1
    note: "Charges a player for 58k plus 39k a second for 6 sec. A bleed by Method's reading — Stoneform clears it. Its only ability."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Eight units at 5 forces each, with one charge and nothing else.

**Serrated Charge** is the dungeon's shared bleed — the
[Sand-Sworn Rider](#/d/temple-of-sethraliss/map/mob/134629) and the
[Dutiful Tamer](#/d/temple-of-sethraliss/map/mob/139422) both cast it too. Six seconds at 39k is
modest alone and adds up across a pack.

Unusually for a beast here, MDT lists **no Taunt** among its applicable CC — Stun, Silence,
Fear, Root, Slow, Disorient and Sap, but no taunt.
