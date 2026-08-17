---
npcId: 241813
name: "Thornclaw Gatherer"   # auto
count: 5   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1297699
    name: "Rotten Supplies"   # auto
    # dispel: disease · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "39k and it leaves Rotten Ground for 20 sec. Carries a disease dispel type — an unusual one to have covered."
  - id: 1297701
    name: "Rotten Ground"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "78k every second, for twenty seconds. The pool is worth far more than the cast that made it — move off it."
  - id: 1241217
    name: "Shredding Claws"   # auto
    # Instant
    tag: tank
    note: "Melee swings can strip 5% armour for 2 sec, stacking. It decays quickly, so it only matters while the mob is in contact."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Rotten Ground sits for twenty seconds at 78k a second. The cast is nothing; standing where it landed is what kills."
---

Twenty-three units at 5 forces each, the most numerous real mob in the dungeon.

The numbers say where the danger is: **Rotten Supplies** hits for 39k, and the **Rotten
Ground** it leaves does 78k *every second for twenty seconds*. The cast is a delivery
mechanism for the pool, and the pool is what matters.

**Shredding Claws** strips armour in 5% steps but decays in 2 seconds, so it is a tank
inconvenience rather than a mechanic.
