---
npcId: 262530
name: "Adderis"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 1289229
    name: "Storm Blessed"   # auto
    # Instant
    tag: soak
    prio: 1
    note: "Immunity to damage, transferred between the pair as they take injury. Damage on the blessed one is wasted — swap targets, do not push through it."
  - id: 1310311
    name: "Storm Blessed"   # auto
    # 2.5 sec cast
    tag: soak
  - id: 1288235
    name: "Thunder and Lightning"   # auto
    # 4 sec cast · 100 yd range
    tag: soak
    prio: 1
    note: "582k divided evenly among players within 8 yards — a soak, not a dodge. Then a peal of thunder follows."
  - id: 1288092
    name: "Thunder and Lightning"   # auto
    # Instant
    tag: soak
  - id: 1288428
    name: "Overload"   # auto
    # 3 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "+100% attack speed for 8 sec, with 25% of each strike as extra Nature damage. The tank's cooldown window."
  - id: 1308738
    name: "Overload"   # auto
    # Instant
    tag: tank
  - id: 1308740
    name: "Overload"   # auto
    # Instant · Unlimited range
    tag: tank
  - id: 263425
    name: "Arc Dash"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "291k to everyone in his path as he charges through the group."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Storm Blessed makes one of the pair immune, and it moves between them. Watch which one has it and put the damage on the other."
---

Half of the **Adderis and Aspix** encounter, alongside
[Aspix](#/d/temple-of-sethraliss/codex/mob/262822).

**Storm Blessed** is the mechanic that defines it: the pair share an immunity to damage and
*transfer it between themselves as they get injured*. So this is a target-swapping fight, and
damage spent on the blessed one is simply lost.

**Thunder and Lightning** is a soak — 582k divided among everyone within 8 yards — so the group
stacks for it rather than scattering.

**Overload** doubles his attack speed for eight seconds and is where the tank's mitigation
goes.
