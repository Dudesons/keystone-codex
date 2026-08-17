---
npcId: 135192
name: "Honored Raptor"   # auto
count: 5   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 270502
    name: "Hunting Leap"   # auto
    # Channeled (5 sec cast)
    tag: dodge
    prio: 1
    note: "Leaps to a player then swings cones at 145k each. Method rates it a frontal to stop — and MDT lists Stun and Disorient, so it can be."
  - id: 270500
    name: "Hunting Leap"   # auto
    # Instant · 300 yd range
    tag: dodge
  - id: 270503
    name: "Hunting Leap"   # auto
    # Instant
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It lands on a player and then cones from there. Stun it, or the person it chose walks it away from the group."
---

Four units at 5 forces each. **Hunting Leap** jumps to a chosen player and follows up with
repeated cone attacks at 145k a swing, aimed from wherever it landed.

Two answers, and MDT supports both: **Stun** and **Disorient** are listed as applicable, so the
leap can be stopped outright — otherwise the target simply walks it clear.

Its tooltip text still names *Reban*, the raptor these were modelled on. That is Blizzard's
copy, not an error in the extraction.
