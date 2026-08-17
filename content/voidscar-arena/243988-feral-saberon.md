---
npcId: 243988
name: "Feral Saberon"   # auto
count: 4   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1249661
    name: "Feral Rage"   # auto
    # dispel: enrage · 1 sec cast · 30 yd range
    tag: dispel
    prio: 1
    note: "+20% melee haste to every ally within 30 yd. The dungeon's shared enrage — eight different mobs cast it, and it stacks up across a pack."
  - id: 1267754
    name: "Savage Leap"   # auto
    # Instant · 100 yd range
    tag: dispel
    prio: 2
    note: "78k on the leap plus a 5-second bleed at 39k a second. A bleed, so the magic dispel does not apply."
  - id: 1267894
    name: "Savage Leap"   # auto
    # Instant · 100 yd range
    tag: dispel

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Feral Rage buffs the whole pack, not just the caster. In a dungeon where eight mobs cast it, one soothe rarely covers a pull."
---

Thirteen units at 4 forces each, and the most common carrier of the dungeon's signature
ability.

**Feral Rage** is a 30-yard, +20% melee haste enrage on **every ally nearby**, and it belongs
to eight different mobs in Voidscar Arena: the Saberon, the
[Longtooth Tuskarr](#/d/voidscar-arena/mob/243985),
[Sycophantic Tarasek](#/d/voidscar-arena/mob/243983),
[Chitigoth](#/d/voidscar-arena/mob/244260), [Brutok](#/d/voidscar-arena/mob/244309),
[Raging Raptor](#/d/voidscar-arena/mob/249608),
[Protective Turtle](#/d/voidscar-arena/mob/249603) and
[Abducted Drakonid](#/d/voidscar-arena/mob/249461).

That is the fact worth carrying into every pull here: soothes are not a reaction in this
dungeon, they are a rotation.
