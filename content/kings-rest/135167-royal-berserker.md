---
npcId: 135167
name: "Royal Berserker"   # auto
count: 22   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 270482
    name: "Violent Lunge"   # auto
    # 3 sec cast · 45 yd range
    tag: dodge
    prio: 1
    note: "394k and a knockback, at a player's location rather than the tank's. Three seconds of cast, and it takes the whole group's attention."
  - id: 270485
    name: "Violent Lunge"   # auto
    # Instant
    tag: dodge
  - id: 1301851
    name: "Bloodthirsty Axe"   # auto
    # dispel: bleed · 2 sec cast · 60 yd range
    tag: dispel
    prio: 1
    note: "An axe seeking up to two targets, bleeding 29k a second for 12 sec. A bleed, so Stoneform and its kin clear it — a magic dispel will not."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Violent Lunge jumps to a player, not the tank, and knocks back. Whoever it picks decides where the group ends up standing."
---

Three units at 22 forces each, and unusually cooperative for King's Rest: MDT lists **Stun,
Incapacitate, Silence, Root, Slow, Disorient and Shackle Undead** as applicable, so this is a
mob that can simply be taken out of the fight.

**Violent Lunge** is 394k where it lands, and it lands on a player. **Bloodthirsty Axe** seeks
two targets with a twelve-second bleed.

Both are answers to the same question — this mob does damage at range and picks its own
targets, so controlling it is worth more than reacting to it.
