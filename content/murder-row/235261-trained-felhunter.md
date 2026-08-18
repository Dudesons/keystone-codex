---
npcId: 235261
name: "Trained Felhunter"   # auto
count: 5   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1217930
    name: "Imprison"   # auto
    # dispel: magic · 2 sec cast · 20 yd range
    tag: dispel
    prio: 1
    note: "MDT's tooltip reads *the caster imprisons the demon* — it is the handler's leash on the felhunter, not an attack on players. Dispellable as magic."
  - id: 1217881
    name: "Shadow Bite"   # auto
    # Instant · 100 yd range
    tag: tank
    note: "39k extra Shadow on each melee swing."
  - id: 1293101
    name: "Shadow Bite"   # auto
    # Instant
    tag: tank

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Fifteen units at 5 forces each, and the least complicated mob in the dungeon: **Shadow Bite**
adds 39k to its swings and that is the whole of its offence.

**Imprison** is worth a note only because it is easy to misread. The tooltip describes the
*demon* being imprisoned — this is the ability that keeps the felhunter leashed, shared with
[Felmaster Lucsei](#/d/murder-row/codex/mob/236905), who is the one doing the imprisoning. It is not
a crowd control aimed at the group.
