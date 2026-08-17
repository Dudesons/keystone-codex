---
npcId: 248666
name: "Magma Totem"   # auto
count: 0   # auto — forces per unit

# Planted by the Ruthless Totemcaller, and worth no forces.
threat:
role: add

spells:
  - id: 1246821
    name: "Searing Magma"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "36k Fire to all players every 0.3 sec — around 120k a second, party-wide, until the totem dies. It has 0.7M health. Kill it."
  - id: 1246825
    name: "Searing Magma"   # auto
    # Instant · 50 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "0.7 million health, and about 120k a second to the whole group while it stands. Nothing in the dungeon repays a global faster."
---

The [Ruthless Totemcaller](#/d/den-of-nalorakk/mob/245143)'s totem, and the clearest
cost-benefit calculation in Den of Nal'orakk.

**Searing Magma** pulses every 0.3 seconds to every player, regardless of range or position.
Against 0.7 million health, the totem is a few seconds of cleave. Left standing through a
pull, it is more damage than the pack it came with.
