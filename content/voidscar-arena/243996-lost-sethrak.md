---
npcId: 243996
name: "Lost Sethrak"   # auto
count: 4   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1250640
    name: "Venomous Spit"   # auto
    # Instant · 60 yd range
    tag: dodge
    prio: 1
    note: "A pool at the target's feet doing 97k every second for 20 seconds. The pool outlives the mob — where it lands shapes the rest of the pull."
  - id: 1268707
    name: "Venomous Spit"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Twenty seconds of 97k a second, wherever the target happened to be standing. Fourteen of these mobs means the floor disappears quickly."
---

Fourteen units at 4 forces each, with a single instant ability that leaves a lasting mess.

**Venomous Spit** does no direct damage worth naming — it creates a pool at the target's
location for twenty seconds at 97k a second. Nothing is dodgeable at cast time, because the
cast *is* the placement; the decision is where the group is standing when it goes out.

Twenty seconds is long enough that consecutive casts overlap, so a pull fought in one spot
ends up with nowhere to stand.
