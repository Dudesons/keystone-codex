---
npcId: 135846
name: "Lightning Serpent"   # auto
count: 5   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1310396
    name: "Serpent's Stormcall"   # auto
    # Instant
    tag: tank
    prio: 1
    note: "Extra Nature damage on its swings for 8 sec — and a pool of Lingering Storm forms underneath when it expires. Move it before the timer runs out."
  - id: 1310402
    name: "Serpent's Stormcall"   # auto
    # Instant · Unlimited range
    tag: tank
  - id: 1293133
    name: "Lingering Storm"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "97k every 1.5 sec on the ground. The pool the buff leaves behind."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Serpent's Stormcall drops a pool where the serpent is standing when it ends. Drag it off the group before the eight seconds are up."
---

Six units at 5 forces each, and a buff whose real cost is where it expires.

**Serpent's Stormcall** adds Nature damage to its melee for eight seconds, which is the
forgettable part. The clause that matters is what happens at the end: a pool of
**Lingering Storm** forms underneath it, ticking 97k every 1.5 seconds.

So the tank has eight seconds of notice to decide where that pool goes.
