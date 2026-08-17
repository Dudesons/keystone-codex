---
npcId: 253324
name: "Tiny Felwyrm"   # auto
count: 0   # auto — forces per unit

# Summoned by the Massive Felwyrm, and worth no forces.
threat:
role: add

spells:
  - id: 1216538
    name: "Fel Detonation"   # auto
    # dispel: magic · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "194k within 4 yd on death, dispellable as magic. Worth no forces, and it still costs that much to kill badly."
  - id: 1214966
    name: "Fel Infused"   # auto
    # Instant
    tag: dodge
    note: "The buff arming the detonation."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Zero forces, 194k on death. Killing them in melee range is pure loss."
---

Spawned by the [Massive Felwyrm](#/d/murder-row/mob/236902) at a rate of one every 0.3 seconds,
worth nothing, and each carrying the full 194k death explosion.

That combination — no reward for killing them, real cost for killing them badly — makes them
the clearest case in Murder Row for choosing *where* things die rather than *how fast*.
