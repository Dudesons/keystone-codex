---
npcId: 236897
name: "Keen Taskmaster"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1216970
    name: "Back to Work!"   # auto
    # dispel: enrage · 3 sec cast
    tag: dispel
    prio: 1
    note: "+200% attack speed to every Warehouse Worker within 40 yd for 20 seconds. Tripled attack speed on a whole pack — soothe it."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Back to Work! triples the attack speed of every Warehouse Worker nearby for twenty seconds. It is the largest single buff in the dungeon."
---

Two units at 7 forces each, with one cast — and that cast is +200% attack speed on the
[Warehouse Workers](#/d/murder-row/map/mob/236893) around it.

Twenty seconds of a pack swinging three times as fast is more damage than anything the
Taskmaster could do itself. MDT flags it as an **enrage**, so a soothe removes it outright,
and it is a three-second cast, so there is warning.

Worth noticing that the Workers cast the same ability, which means removing it once may not be
enough.
