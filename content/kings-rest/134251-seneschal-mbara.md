---
npcId: 134251
name: "Seneschal M'bara"   # auto
count: 10   # auto — forces per unit

threat: low
role: caster

spells:
  - id: 270901
    name: "Unholy Mending"   # auto
    # dispel: magic · 2.5 sec cast · 100 yd range
    tag: kick
    prio: 1
    note: "7% of health every 2 sec for 10 sec — 35% of a health bar restored. Interruptible, and dispellable as magic if the kick is late."
  - id: 1296671
    name: "Captain's Bulwark"   # auto
    # dispel: magic · 2.5 sec cast · 60 yd range
    tag: dispel
    prio: 2
    note: "-30% damage taken for its allies. Not interruptible — strip it as magic."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Unholy Mending heals 35% of a health bar over ten seconds. Ten forces on a mob that decides how long the whole pack takes to kill."
---

One unit at 10 forces, and one of the biggest gaps in the dungeon between what a mob is worth
and what it costs.

**Unholy Mending** restores 7% of health every 2 seconds for ten seconds. Against a pack
holding an Animated Guardian at 5.5 million, that is a great deal of work undone — and it is
interruptible, so it is entirely preventable.

**Captain's Bulwark** is the same 30% damage reduction three mobs in King's Rest cast, and MDT
does not flag it interruptible. Magic dispel is the only lever on that one.

Only **Taunt** applies.
