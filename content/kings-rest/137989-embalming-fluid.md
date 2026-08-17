---
npcId: 137989
name: "Embalming Fluid"   # auto
count: 1   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 271563
    name: "Embalming Fluid"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "97k a second and a 30% slow, and both stack. Seventeen of these on the map means the stacks are the mechanic."
  - id: 1298104
    name: "Putrid Seekers"   # auto
    # dispel: poison · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "39k a second for 12 sec within 4 yd, plus a 20% slow. A poison, so it can be cleared."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "The slow stacks. Enough of these on one player and they stop being able to walk out of anything else in the wing."
---

Seventeen units at **one force each** — cheap bodies whose danger is entirely cumulative.

**Embalming Fluid** does 97k a second and slows by 30%, and the tooltip is explicit that *these
effects stack*. Two or three applications and a player is barely moving, in a section of the
dungeon full of Purifying Flame zones and Interment Construct crypts.

**Putrid Seekers** adds a second slow on top, dispellable as a **poison**.

MDT lists Stun, Silence, Root, Slow and Disorient as applicable, so they can be held rather
than fought.
