---
npcId: 263228
name: "Agitated Voidscythe"   # auto
count: 25   # auto — forces per unit

threat: high
role: melee

spells:
  - id: 1311778
    name: "Rip and Slice"   # auto
    # 2.5 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "679k on one target, plus 48k a second for 8 sec. The largest single hit in the trash."
  - id: 1233472
    name: "Rip and Slice"   # auto
    # Channeled (6 sec cast)
    tag: dodge
    prio: 1
    note: "The other form: it charges to a player's location and cleaves 82k within 10 yd for 6 sec. Melee has to leave, not just the target."
  - id: 1233485
    name: "Rip and Slice"   # auto
    # Instant · 10 yd range
    tag: dodge
  - id: 1289258
    name: "Corrosive Essence"   # auto
    # dispel: poison · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "87k every 2 sec for 12 sec. A poison — a dispel clears it outright."
  - id: 1289265
    name: "Corrosive Essence"   # auto
    # 2.5 sec cast · 100 yd range
    tag: dispel

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Rip and Slice has two forms — a 679k hit on one target, and a six-second cleave at wherever a player is standing. The second one is the group's problem, not the tank's."
---

Eight units at 25 forces each, 27% of the dungeon, and the biggest single hit in the trash.

**Rip and Slice** is worth reading as two abilities, because MDT stores it as two. One is a
679k blow on the current target. The other is a **charge to a player's location** followed by
six seconds of cleaving 82k inside 10 yards — aimed at whoever it chose, not at the tank.

**Corrosive Essence** is a straightforward 12-second poison, and this is a dungeon where poison
dispels get plenty of use.
