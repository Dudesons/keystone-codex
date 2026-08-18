---
npcId: 248666
name: "Magma Totem"   # auto
count: 0   # auto — forces per unit

# Planted by the Enthralled Shaman, and worth no forces.
threat:
role: add

spells:
  - id: 1246821
    name: "Searing Magma"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "36k Fire to all players every 0.3 sec — around 120k a second, party-wide, until it dies. Nothing repays a global faster."
  - id: 1246825
    name: "Searing Magma"   # auto
    # Instant · 50 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Range does not help and position does not help. The only answer is killing it."
---

The [Enthralled Shaman](#/d/voidscar-arena/map/mob/241496)'s totem, and the same object that
appears in Den of Nal'orakk — MDT gives both dungeons the identical NPC.

**Searing Magma** pulses to every player every 0.3 seconds with no range or position clause,
so there is nothing to dodge and nowhere to go. It is a small health pool doing large,
unavoidable damage: kill it on sight.
