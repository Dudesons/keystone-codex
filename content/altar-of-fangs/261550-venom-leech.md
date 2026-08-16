---
npcId: 261550
name: "Venom Leech"   # auto
count: 1   # auto — forces per unit

# TO FILL IN: low | medium | high | lethal
threat:
role: melee

spells:
  - id: 1294432
    name: "Septic Spatter"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "The leech pops for 291k Nature on impact, then 66k every 1.5 sec to anyone left in the splash."
  - id: 1305637
    name: "Septic Spatter"   # auto
    tag: dodge
  - id: 1306232
    name: "Septic Spatter"   # auto
    tag: dodge
  - id: 1306235
    name: "Septic Spatter"   # auto
    tag: dodge
  - id: 1307098
    name: "Gorge"   # auto
    tag: ignore
    note: "Its melee attacks leech. Background damage, nothing to react to."
  - id: 1307144
    name: "Gorge"   # auto
    tag: ignore

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Twenty-eight units at 1 force each — the cheapest body in the dungeon and, on paper, the
hardest hitting. **Septic Spatter** lands 291k on impact when the leech pops, the same order
of magnitude as Ula'tek's Chosen's Toxic Beam.

Worth 1 force apiece, they die incidentally, which means the splash arrives whether or not
anyone was watching for it.
