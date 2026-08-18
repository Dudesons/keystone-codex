---
npcId: 245148
name: "Grizzled Warbringer"   # auto
count: 0   # auto — forces per unit

# The zero-force variant, three on the map, carrying only the spear volley.
threat:
role: add

spells:
  - id: 1247030
    name: "Poison Spear Volley"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "Spears land in a pattern, hitting within 4 yd of each impact. Entirely avoidable. The tooltip figure is unscaled."
  - id: 1311572
    name: "Melee"   # auto
    # Instant · 6 yd range
    tag: tank
    note: "Its auto-attack, listed by MDT as a spell."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

The second MDT entry for the Grizzled Warbringer, worth **no forces** and carrying neither
Primal Echo nor the 5.5 million health of
[the trash version](#/d/den-of-nalorakk/codex/mob/245146) — 0.7 million and a spear volley.

Nothing here needs a plan: the volley is ground damage with a visible pattern, and the mob
dies to incidental cleave.
