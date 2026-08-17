---
npcId: 245473
name: "Thorny Saptor"   # auto
count: 5   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 269232
    name: "Hunting Leap"   # auto
    # 2 sec cast
    tag: dodge
    prio: 1
    note: "Leaps onto a player for 68k plus 39k every second for 4 sec, then follows with cone attacks at 145k each. The cones are the expensive part, and they land where it jumped."
  - id: 269230
    name: "Hunting Leap"   # auto
    # Instant
    tag: dodge
  - id: 269231
    name: "Hunting Leap"   # auto
    # Instant · 300 yd range
    tag: dodge
  - id: 1303039
    name: "Hunting Leap"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1242200
    name: "Lightwarden's Blight"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 2
    note: "291k to everyone nearby on death, plus Blight Resin on the floor."
  - id: 1242180
    name: "Lightwarden's Blight"   # auto
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It leaps to a player and then swings cones from there. Whoever it lands on should walk it away from the group rather than stand and take it."
---

Thirteen units at 5 forces each. Method reads **Hunting Leap** as a frontal to be stopped, and
the tooltip explains why: the leap itself is modest, but the mob then follows up with repeated
cone attacks at 145k each, aimed from wherever it landed.

Since it lands on a player rather than on the tank, the person it chose decides how expensive
the cast becomes — standing still puts the cones through the group.
