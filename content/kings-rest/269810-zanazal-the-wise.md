---
npcId: 269810
name: "Zanazal the Wise"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: caster

spells:
  - id: 267273
    name: "Poison Nova"   # auto
    # dispel: poison · 4 sec cast
    tag: kick
    prio: 1
    note: "116k to everyone every 2 sec for 12 sec. Interruptible and dispellable as a poison — two chances, and the Council's only kickable cast."
  - id: 267060
    name: "Call of the Elements"   # auto
    # 2.5 sec cast
    tag: dodge
    prio: 1
    note: "Summons his three totems. Each does something different and each has to be killed — this cast decides the next twenty seconds."
  - id: 1305810
    name: "Arc Lightning"   # auto
    # 1 sec cast · 50 yd range
    tag: dodge
    prio: 2
    note: "136k arcing between players. Spread reduces the chain."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Call of the Elements brings three totems with three different answers — one silences the group, one explodes, one knocks back. Kill the Explosive Totem first."
---

The caster of the **Council of Tribes**, and the one whose casts the group can actually
interfere with.

**Poison Nova** is the Council's only interruptible ability — 116k every 2 seconds for twelve
seconds on everyone — and it carries a **poison** dispel type on top, so there are two ways to
stop it.

**Call of the Elements** is the fight's real content. It brings three totems, each demanding a
different response:

- [Explosive Totem](#/d/kings-rest/map/mob/135764) — 397k to everyone after a nine-second cast.
  The one that kills.
- [Disruption Totem](#/d/kings-rest/map/mob/135761) — interrupts the whole group for 4 seconds.
- [Torrent Totem](#/d/kings-rest/map/mob/135765) — 158k and a knockback within 3 yards.

All three carry a **Reinforced** buff in the data, and none of them can be crowd controlled.
