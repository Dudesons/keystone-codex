---
npcId: 134158
name: "Shadow-Borne Champion"   # auto
count: 25   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 269976
    name: "Ancestral Fury"   # auto
    # dispel: enrage · 1 sec cast
    tag: dispel
    prio: 1
    note: "+150% damage done — the largest enrage in the dungeon by a wide margin. It is a one-second cast and it soothes off. Do not miss it."
  - id: 269928
    name: "Vigilant Defense"   # auto
    # Channeled (6 sec cast)
    tag: dodge
    prio: 1
    note: "Raises a shield that deflects all ranged attacks and spells, and blocks melee from the front. Six seconds where the only damage that lands comes from behind it."
  - id: 1305945
    name: "Shadow Whirlwind"   # auto
    # 4 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "165k to everyone within 100 yd. Range does not help."
  - id: 1310758
    name: "Necrotic Energy"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 2
    note: "242k within 4 yd of the impact. Small circle, watch the floor."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Ancestral Fury is +150% damage. Everything else on this card is survivable; that one is not — soothe it the moment it lands."
---

Two units at 25 forces each, carrying the dungeon's most dangerous buff and its most awkward
defensive.

**Ancestral Fury** triples its damage output. MDT flags it as an **enrage** with a one-second
cast, so the answer is quick and cheap — and forgetting it is the single most expensive
mistake available in King's Rest trash.

**Vigilant Defense** is the mirror: six seconds during which ranged attacks and spells are
deflected entirely and frontal melee is blocked. The group's damage does not slow down so much
as stop, unless melee gets behind it.

Only **Taunt** applies to this mob.
