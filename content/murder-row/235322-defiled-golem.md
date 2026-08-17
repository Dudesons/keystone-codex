---
npcId: 235322
name: "Defiled Golem"   # auto
count: 35   # auto — forces per unit

threat: high
role: miniboss

spells:
  - id: 1294824
    name: "Defiled Slam"   # auto
    # 2 sec cast
    tag: dodge
    prio: 1
    note: "145k to everyone and it seeds Defiled Detonations around the room. The party damage is the warning, the detonations are the damage."
  - id: 1294827
    name: "Defiled Slam"   # auto
    # Instant · 60 yd range
    tag: dodge
  - id: 1294836
    name: "Defiled Detonation"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "194k within 5 yd. Several at once, at nearby locations — this is what the slam is really for."
  - id: 1215961
    name: "Fel Beam"   # auto
    # 2 sec cast
    tag: dodge
    prio: 1
    note: "97k every second to anything the beams touch. They sweep — do not stand still in one."
  - id: 1215872
    name: "Fel Beam"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1215985
    name: "Fel Beam"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1218187
    name: "Fel Beam"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1294870
    name: "Fel-Scarred Earth"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 2
    note: "145k a second on the ground it leaves behind."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Thirty-five forces a body and seven of them — a third of the dungeon on one mob. Defiled Slam is the cast to move for, not the beams."
---

**The heaviest mob in Murder Row by a distance**: 35 forces each, seven placements, roughly a
third of the count a group needs. Every route goes through them.

**Defiled Slam** is the cast that matters, and reading it correctly is the whole card. The
145k party-wide portion is survivable; what follows is **Defiled Detonation**, several 194k
circles opening at nearby locations. Groups that treat the slam as unavoidable damage and stay
put take the second half for free.

**Fel Beam** sweeps continuously at 97k a second, and **Fel-Scarred Earth** keeps whatever
ground it has touched hostile.
