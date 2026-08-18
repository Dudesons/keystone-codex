---
npcId: 135322
name: "The Golden Serpent"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 265991
    name: "Luster"   # auto
    # Instant · Unlimited range
    tag: soak
    prio: 1
    note: "Each Animated Gold that reaches her shields her for 10% of her health and raises her damage 25%, stacking. This is the fight's enrage timer."
  - id: 265923
    name: "Lucre's Call"   # auto
    # 2 sec cast
    tag: dodge
    prio: 1
    note: "Turns every pool of Molten Gold into an Animated Gold. The fewer pools on the floor, the fewer adds — that is the whole loop."
  - id: 265773
    name: "Spit Gold"   # auto
    # 2 sec cast · 300 yd range
    tag: dodge
    prio: 1
    note: "87k within 5 yd plus a 6-second burn, and it leaves a pool of Molten Gold. Where these land decides how bad Lucre's Call is."
  - id: 1306736
    name: "Spit Gold"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1312104
    name: "Spit Gold"   # auto
    # Instant · 60 yd range
    tag: dodge
  - id: 265910
    name: "Tail Thrash"   # auto
    # 1.5 sec cast · Unlimited range
    tag: tank
    prio: 1
    note: "630k on the current target. The hardest hit in the fight."
  - id: 265781
    name: "Serpentine Gust"   # auto
    # 4 sec cast · 100 yd range
    tag: dodge
    prio: 2
    note: "145k to everyone."
  - id: 1311987
    name: "Serpentine Gust"   # auto
    # 2 sec cast · 100 yd range
    tag: dodge
    note: "The other form: 58k a second for 5 sec while pushing everyone back."
  - id: 1311988
    name: "Serpentine Gust"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Every Spit Gold pool becomes an add on the next Lucre's Call, and every add that reaches her is +25% damage forever. Control where the gold lands."
---

A fight that punishes untidiness three casts later.

The loop runs: **Spit Gold** leaves pools → **Lucre's Call** animates all of them at once →
each [Animated Gold](#/d/kings-rest/codex/mob/135406) that reaches her grants **Luster**, a 10%
shield *and a stacking +25% damage*. Nothing removes those stacks.

So the group is not really fighting the serpent's damage; it is managing how much of it there
will be. Spreading the Spit Gold pools out, and killing the adds before they arrive, is the
difference between a clean kill and an unrecoverable one.

**Tail Thrash** at 630k is the tank's problem and the only conventional part of the fight.
