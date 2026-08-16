---
npcId: 271453
name: "Blade of the Altar"   # auto
count: 5   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1310015
    name: "Laced Edge"   # auto
    # Instant
    tag: ignore
    note: "Teleports behind a player and slashes. The tooltip's damage figure is unscaled and not worth quoting."

  - id: 1221063
    name: "Xal'atath's Gift"   # auto
    # Instant
    tag: ignore
    note: "Sub-12 affix, rotated weekly. Not a trait of this mob."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Twenty-one units at 5 forces each — the largest headcount in the dungeon and the smallest
threat per body. Filler: it pads pulls and counts toward the total, nothing more.

The teleport behind a player is cosmetic in practice. Worth knowing only so that nobody
wastes a cooldown reacting to it.
