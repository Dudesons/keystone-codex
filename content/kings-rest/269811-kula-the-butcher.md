---
npcId: 269811
name: "Kula the Butcher"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 266206
    name: "Whirling Axes"   # auto
    # 2.75 sec cast · Unlimited range
    tag: dodge
    prio: 1
    note: "339k within 10 yd and a knockback, then two axes left spinning around the arena at 97k every 2 sec. The leftovers outlast the cast."
  - id: 266191
    name: "Whirling Axe"   # auto
    # dispel: bleed · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "The bleed half — clearable, and it is a bleed rather than magic."
  - id: 266231
    name: "Severing Axe"   # auto
    # dispel: bleed · 1.5 sec cast · Unlimited range
    tag: dispel
    prio: 1
    note: "155k on a random player plus 68k every 2 sec for 8 sec. Also a bleed."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Whirling Axes knocks the group back — into a fight where Aka'ali's charge has to be soaked together. The two bosses' mechanics pull in opposite directions."
---

The third of the **Council of Tribes**, and the one whose damage lingers.

**Whirling Axes** is a knockback and 339k up front, but the axes it leaves behind keep
circling the arena at 97k every 2 seconds — hazards that persist while the other two Council
members are casting.

Both her abilities apply **bleeds**, which is worth noting because King's Rest hands out
bleeds constantly and a group without an answer to them will feel this fight most.

The knockback deserves particular attention: [Aka'ali](#/d/kings-rest/map/mob/269808)'s
**Barrel Through** wants the group stacked, and Kula spends the fight pushing them apart.
