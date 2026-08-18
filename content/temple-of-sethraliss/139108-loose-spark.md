---
npcId: 139108
name: "Loose Spark"   # auto
count: 0   # auto — forces per unit

# Produced around the Spark Channelers. Worth no forces.
threat:
role: add

spells:
  - id: 267483
    name: "Loose Sparks"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "291k and a 6-second stun. Worth no forces and carrying the harshest stun in the dungeon."
  - id: 1225638
    name: "Loose Sparks"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 273241
    name: "Wall of Sparks"   # auto
    tag: dodge
    prio: 1
    note: "A wall that moves across the battlefield, damaging anything in its path. Not a circle to step out of — a line to stay ahead of."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Wall of Sparks travels. Standing still and waiting for it to pass is not how it works — move with it."
---

Worth no forces, and carrying two mechanics that are worth real attention.

**Loose Sparks** is 291k and a **six-second stun** — the same ability the
[Spark Channeler](#/d/temple-of-sethraliss/map/mob/139110) uses. **Wall of Sparks** is different in
kind: it *moves across the battlefield*, so it is dodged by travelling rather than by
sidestepping once.
