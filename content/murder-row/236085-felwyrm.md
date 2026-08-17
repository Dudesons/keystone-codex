---
npcId: 236085
name: "Felwyrm"   # auto
count: 1   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1216538
    name: "Fel Detonation"   # auto
    # dispel: magic · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "194k within 4 yards when it dies. MDT flags it magic-dispellable — strip it before the kill and the explosion never happens."
  - id: 1214966
    name: "Fel Infused"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "The buff that arms the detonation. Method reads it as the thing to avoid."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "One force, and 194k to everyone within 4 yards when it dies. Eighteen of them on the map — do not kill them stacked in melee."
---

Eighteen units at **one force each**, and each explodes for 194k in a 4-yard radius on death.

The arithmetic is the whole entry: a mob worth one point costs more to kill badly than it is
worth. Melee killing several at once, standing together, take that damage several times over.

The unusual part is that MDT flags **Fel Detonation** with a **magic** dispel type. Stripping
it before the wyrm dies is the clean answer, and it is not an option most groups think to look
for on a one-force mob.
