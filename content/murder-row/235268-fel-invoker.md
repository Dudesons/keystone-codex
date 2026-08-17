---
npcId: 235268
name: "Fel Invoker"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1214980
    name: "Health Funnel"   # auto
    # Channeled (30 sec cast) · 45 yd range
    tag: kick
    prio: 1
    note: "10% of an ally's maximum health every 2 sec for thirty seconds — up to 150% of a health bar. Kick it. Nothing else in the dungeon undoes this much damage."
  - id: 1309970
    name: "Health Funnel"   # auto
    # Instant
    tag: kick
  - id: 1297695
    name: "Felfire Bombardment"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 2
    note: "194k within 5 yd of each impact. Ground damage."
  - id: 1297693
    name: "Felfire Bombardment"   # auto
    # Instant · 60 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Health Funnel runs thirty seconds and heals 10% every two. Left alone it is worth more than a health bar and a half — this is the interrupt of the dungeon."
---

Eleven units at 7 forces each, and the biggest single reason a Murder Row pull runs long.

**Health Funnel** is a thirty-second channel restoring 10% of the target's maximum health
every 2 seconds. Fifteen ticks, on a Defiled Golem with 8.4 million health, is an enormous
amount of work erased — and it is interruptible from the first second.

The channel costs the Invoker 5% of its own health per tick, which is the consolation: it is
killing itself slowly while it does this. Not fast enough to wait for.
