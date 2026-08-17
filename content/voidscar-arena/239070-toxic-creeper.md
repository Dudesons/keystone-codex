---
npcId: 239070
name: "Toxic Creeper"   # auto
count: 0   # auto — forces per unit

# Drawn out of Atroxus's poison pools, and worth no forces.
threat:
role: add

spells:
  - id: 1282892
    name: "Sickening Bite"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "+50% Nature damage taken for five minutes, stacking — in a fight where everything is Nature. Five minutes is the rest of the encounter."
  - id: 1222692
    name: "Toxic Aura"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "22k every half-second to everyone within 100 yards — around 44k a second, room-wide, for as long as it lives."
  - id: 1222693
    name: "Toxic Aura"   # auto
    # Instant
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Sickening Bite lasts five minutes and stacks. Two bites and the whole fight hits for double — this add is the reason Atroxus goes wrong, not Atroxus."
---

Worth no forces and 0.9 million health, and the most dangerous thing in the
[Atroxus](#/d/voidscar-arena/mob/239008) encounter.

**Sickening Bite** raises Nature damage taken by 50% for **five minutes**, and it stacks.
Everything Atroxus does is Nature. A five-minute debuff in a fight that will not last five
minutes is a permanent one, so each bite that lands makes the remainder of the fight
proportionally harder — with no way to undo it.

**Toxic Aura** adds around 44k a second across the entire room while it is alive.

Both facts point the same way: these die first, and ideally they are never allowed to spawn,
by keeping the pools off the floor.
