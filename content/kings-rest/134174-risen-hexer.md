---
npcId: 134174
name: "Risen Hexer"   # auto
count: 20   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 269972
    name: "Hex Volley"   # auto
    # dispel: curse · 3.5 sec cast
    tag: kick
    prio: 1
    note: "116k up front and 39k a second for 12 sec — roughly 580k if it runs. A **curse**, the dispel a group is least likely to have. Kick this, not the bolt."
  - id: 1294815
    name: "Shadowfrost Bolt"   # auto
    # dispel: magic · 2.5 sec cast · 100 yd range
    tag: kick
    prio: 2
    note: "116k on one player. Dispellable as magic, so it is the cheaper of the two to let through."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Two kickable casts, and the curse is the one that matters. Hex Volley first — Shadowfrost Bolt is smaller and comes off as magic."
---

One unit at 20 forces, with two interruptible casts and a clear ranking between them.

**Hex Volley** lands 116k up front, then a twelve-second curse at 39k a second — roughly 580k
in total if nobody cleans it. **Shadowfrost Bolt** is 116k. MDT's tooltip names no radius on
either, so treat the volley as the bigger hit rather than as an AoE.

Both carry dispel types — curse for the volley, magic for the bolt — which means the interrupt
should go to the one the group is least likely to be able to clean up afterwards.

Only **Taunt** applies to this mob, so there is no controlling it instead.
