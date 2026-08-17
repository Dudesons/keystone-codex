---
npcId: 254850
name: "Sporeblight Belcher"   # auto
count: 25   # auto — forces per unit

threat: high
role: melee

spells:
  - id: 1263636
    name: "Belch Spores"   # auto
    # 1.5 sec cast
    tag: dodge
    prio: 1
    note: "291k Nature per impact, one every 1.5 sec for 3 sec. Ground damage — the whole cast is avoidable by moving."
  - id: 1263642
    name: "Belch Spores"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 1263628
    name: "Spouting Floret"   # auto
    # Instant · 60 yd range
    tag: dodge
    prio: 2
    note: "87k to everyone within 60 yd every 2 sec for 6 sec. Range is no escape — this one is healed, not dodged."
  - id: 1271385
    name: "Spouting Floret"   # auto
    # 2 sec cast · 60 yd range
    tag: dodge
  - id: 1242200
    name: "Lightwarden's Blight"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "291k to everyone nearby when it dies, and it leaves Blight Resin on the floor. Eleven of these bodies is eleven explosions."
  - id: 1242180
    name: "Lightwarden's Blight"   # auto
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Twenty-five forces a body and 291k when each one dies. Do not let several die on top of the group at once — stagger the kills or spread them out."
---

**The heaviest mob in the dungeon by a distance**: eleven units at 25 forces each, roughly 42%
of the count a group needs to clear. No route avoids it.

Two of its abilities are the usual trade — **Belch Spores** is entirely avoidable ground
damage, **Spouting Floret** reaches 60 yards and is not. The one that decides pulls is the
third.

**Lightwarden's Blight** is not this mob's own doing; it is the Lightwarden's mark, carried by
half the trash in the Vale, and it detonates for 291k when the body drops. On a pull holding
three or four Belchers, the danger is not the fight — it is the moment they all die together.
