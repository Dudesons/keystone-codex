---
npcId: 236893
name: "Warehouse Worker"   # auto
count: 2   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1217992
    name: "Workplace Accident"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "Throws a shipment for 242k within 5 yd and a 3-second stun. The stun is what makes a 2-force mob worth watching."
  - id: 1216970
    name: "Back to Work!"   # auto
    # dispel: enrage · 3 sec cast
    tag: dispel
    prio: 1
    note: "+200% attack speed to every Worker within 40 yd for 20 sec. They cast it themselves, not only the Taskmaster."
  - id: 1311136
    name: "Sharp Nail"   # auto
    # Instant · 50 yd range
    tag: tank
    note: "39k plus 19k a second for 3 sec."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Workplace Accident stuns for three seconds. Stunned inside a pack running at triple attack speed is how a 2-force mob kills someone."
---

Six units at 2 forces each — nearly worthless for the count, and carrying two things that
matter.

**Back to Work!** is the same +200% attack speed enrage the
[Keen Taskmaster](#/d/murder-row/codex/mob/236897) casts, and the Workers cast it on each other. So
one soothe does not necessarily settle it.

**Workplace Accident** is 242k and a **3-second stun**, at unlimited range. Being stunned in
front of a tripled-attack-speed pack is the failure sequence, and both halves of it come from
this mob.
