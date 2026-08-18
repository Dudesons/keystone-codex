---
npcId: 137487
name: "Skeletal Hunting Raptor"   # auto
count: 10   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1297763
    name: "Bestial Berserk"   # auto
    # dispel: enrage · 2.5 sec cast · 100 yd range
    tag: dispel
    prio: 1
    note: "+25% movement, attack and cast speed to itself and its allies for 15 sec. Queen Patlaa's buff, on a raptor. Soothe it."
  - id: 270502
    name: "Hunting Leap"   # auto
    # Channeled (5 sec cast)
    tag: dodge
    prio: 1
    note: "Leaps to a player then cones at 145k a swing. Method reads it as a frontal."
  - id: 270500
    name: "Hunting Leap"   # auto
    # Instant · 300 yd range
    tag: dodge
  - id: 270503
    name: "Hunting Leap"   # auto
    # Instant
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It carries Bestial Berserk, the same pack-wide enrage Queen Patlaa casts. Ten forces on a body that buffs everything around it."
---

One unit at 10 forces, and the [Honored Raptor](#/d/kings-rest/map/mob/135192)'s leap with an
enrage bolted on.

**Bestial Berserk** is the difference: 25% more speed on everything nearby, for 15 seconds.
It is the same spell [Queen Patlaa](#/d/kings-rest/map/mob/137486) casts, and the tooltip still
names her — this raptor is one of hers.

Only **Taunt** applies to it, unlike the Honored Raptor, so the leap cannot be stunned here.
