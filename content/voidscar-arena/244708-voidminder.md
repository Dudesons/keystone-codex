---
npcId: 244708
name: "Voidminder"   # auto
count: 7   # auto — forces per unit

threat: low
role: caster

spells:
  - id: 1310324
    name: "Mending Void"   # auto
    # Channeled (20 sec cast) · 100 yd range
    tag: kick
    prio: 1
    note: "3% of maximum health every 2 sec for twenty seconds — 30% of a health bar. Kick it, or the pull takes a third longer than it should."
  - id: 1227020
    name: "Dimensional Shred"   # auto
    # Instant · 60 yd range
    tag: dodge
    note: "Teleports behind its target for 68k. Instant, so nothing to react to."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Mending Void runs twenty seconds and heals whatever it is pointed at. On a pack with a Devouring Brutalizer, that is the pull's whole timer."
---

Six units at 7 forces each, and the dungeon's healer.

**Mending Void** is a twenty-second channel restoring 3% of maximum health every 2 seconds —
30% of a full bar if it runs to the end. The
[Devouring Brutalizer](#/d/voidscar-arena/mob/268184) casts the identical spell, so a pack
holding both can undo a great deal of the group's damage between them.

**Dimensional Shred** is a small instant and needs no plan.
