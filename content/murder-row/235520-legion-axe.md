---
npcId: 235520
name: "Legion Axe"   # auto
count: 0   # auto — forces per unit

# What Xathuux's Axe Toss leaves on the ground. Worth no forces.
threat:
role: add

spells:
  - id: 1214650
    name: "Fel Lightning"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "5k a second to all players, stacking, at unlimited range, for as long as the axe lies there. Small per tick, unbounded over time."
  - id: 5543
    name: "Fade Out"   # auto
    # Instant
    tag: ignore
    note: "A generic invisibility spell MDT attaches to the object. Not a mechanic."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Fel Lightning stacks and never stops while the axe is on the ground. It is 1 million health of pure profit to clear."
---

The axe [Xathuux](#/d/murder-row/codex/mob/234647) leaves behind after an **Axe Toss**, with 1
million health.

**Fel Lightning** is 5k a second to every player, at any range, **stacking**. Per tick it is
nothing; the stacking clause is what makes it matter, because there is no distance and no
positioning that reduces it and no duration after which it stops.

Every axe left on the floor is a permanent increase to the fight's damage. Clearing them is
not optional tidying.
