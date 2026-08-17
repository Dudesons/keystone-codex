---
npcId: 270306
name: "Ritual Chieftain"   # auto
count: 25   # auto — forces per unit

threat: high
role: melee

# MDT carries no CC list for any Midnight dungeon yet, so nothing can be said here either way.

spells:
  - id: 1306911
    name: "Dismember"   # auto
    # 3 sec cast · Unlimited range
    tag: tank
    prio: 1
    note: "581k physical on the current target. The pack's biggest hit: mitigation required."

  - id: 1306517
    name: "Blood Sacrifice"   # auto
    # 3 sec cast
    tag: kick
    prio: 1
    note: "87k physical and absorbs the next 180k of healing. Chained with Dismember, this is what kills the tank."

  - id: 1306893
    name: "Unstable Totem"   # auto
    # Instant
    tag: dodge
    note: "The totem hits for 32k Nature every 2 s for as long as the chieftain is in combat. Focus it or step away."

  - id: 1306844
    name: "Totemic Ritual"   # auto
    tag: ignore
    note: "Just the totem-planting animation."


trap: "**Blood Sacrifice** absorbs the next 180k of healing, and **Dismember** hits for 581k. Letting the absorb land just before the buster is the sequence that kills the tank."
---

Two 3-second casts that answer each other: **Dismember** hits the tank for 581k, and **Blood
Sacrifice** absorbs the next 180k of healing. Letting the second through just before the first
is the sequence that kills.

The three IDs of *Blood Sacrifice* (1306517, 1306550, 1306641) are the same spell in instant
and cast versions — only the 3 s one is interruptible.

<!-- To confirm in game: totem placement, burst window, real value of the orb soak. -->
