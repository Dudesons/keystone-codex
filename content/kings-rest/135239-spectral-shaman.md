---
npcId: 135239
name: "Spectral Shaman"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 270497
    name: "Healing Tide Totem"   # auto
    # Instant · 40 yd range
    tag: dodge
    prio: 1
    note: "10% of maximum health to every nearby ally every 2.5 sec, for 30 seconds. Instant, so there is nothing to kick — kill the totem."
  - id: 270499
    name: "Frost Shock"   # auto
    # dispel: magic · Instant · 40 yd range
    tag: dispel
    prio: 2
    note: "58k and -25% movement speed for 15 sec. Dispellable as magic."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Healing Tide Totem is instant — there is no cast to interrupt. It heals 10% every 2.5 seconds for half a minute unless somebody kills the object."
---

Four units at 7 forces each, and the healing check of the dungeon's trash.

**Healing Tide Totem** is worth doing the arithmetic on: 10% of maximum health, to every ally
in range, every 2.5 seconds, for 30 seconds. That is potentially 120% of a pack's health
restored from one instant cast.

Instant means no interrupt. The [totem](#/d/kings-rest/map/mob/137591) itself has 0.4 million
health and has to be killed — which is why this mob outranks its 7 forces by a distance.

MDT lists Stun, Silence, Slow and Disorient as applicable, so a silence before the totem lands
also works.
