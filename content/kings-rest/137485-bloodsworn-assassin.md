---
npcId: 137485
name: "Bloodsworn Assassin"   # auto
count: 7   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1297781
    name: "Sudden Rupture"   # auto
    # dispel: bleed · Instant · 30 yd range
    tag: dispel
    prio: 1
    note: "24k a second for 18 seconds and a 10% slow. Long rather than large — a bleed, so the magic dispel does not touch it."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Four units at 7 forces each, with one instant ability.

**Sudden Rupture** is an eighteen-second bleed at 24k a second — around 435k over its life,
delivered slowly enough that it reads as background damage rather than a mechanic. On a long
pull with several assassins, those overlap.

MDT lists Stun, Slow and Disorient as applicable.
