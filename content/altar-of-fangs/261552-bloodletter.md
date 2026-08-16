---
npcId: 261552
name: "Bloodletter"   # auto
count: 5   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1307526
    name: "Bloodletting"   # auto
    # Instant
    tag: dodge
    note: "Its melee swings leave pools on the ground. Nothing to react to, just do not stand in them."

  - id: 1221063
    name: "Xal'atath's Gift"   # auto
    # Instant
    tag: ignore
    note: "Sub-12 affix, rotated weekly. Not a trait of this mob."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Sixteen units at 5 forces each, with one ability and no surprises. It drops pools where it
stands, so the pull wants to move off them rather than tank in place.

No trap: nothing here catches out someone seeing the dungeon for the first time.
