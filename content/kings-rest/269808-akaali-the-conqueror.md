---
npcId: 269808
name: "Aka'ali the Conqueror"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 266951
    name: "Barrel Through"   # auto
    # 6 sec cast · 300 yd range
    tag: soak
    prio: 1
    note: "873k split among players within 7 yards, ignoring armour. Alone it kills; shared by five it is 175k each. Stack for it."
  - id: 267494
    name: "Barrel Through"   # auto
    # Instant · 100 yd range
    tag: soak
  - id: 1310761
    name: "Barrel Through"   # auto
    # Instant · Unlimited range
    tag: soak
  - id: 266237
    name: "Debilitating Backhand"   # auto
    # 2 sec cast · Unlimited range
    tag: tank
    prio: 1
    note: "727k, a knockback, and Shattered Defenses on the tank. The knockback is what separates the tank from the group before the next Barrel Through."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Barrel Through is shared damage — the group stacks into it. Debilitating Backhand knocks the tank away, which is exactly what makes the next one land on too few people."
---

One of the three **Council of Tribes**, alongside
[Zanazal the Wise](#/d/kings-rest/mob/269810) and
[Kula the Butcher](#/d/kings-rest/mob/269811). She is the physical one.

**Barrel Through** is a soak, not a dodge: 873k divided among everyone within 7 yards. The
instinct to scatter from a charging boss is exactly wrong here.

Which makes **Debilitating Backhand** more dangerous than its 727k suggests — it knocks the
tank back and applies Shattered Defenses, so it is the ability that breaks the stack the group
needs for the charge.
