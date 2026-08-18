---
npcId: 263658
name: "Galvazzt"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: caster

spells:
  - id: 1290531
    name: "Induction"   # auto
    # 3 sec cast · Unlimited range
    tag: dodge
    prio: 1
    note: "145k to everyone and it leaves an Induction Field behind. The pulse is the warning; the field is the lasting cost."
  - id: 1291815
    name: "Induction Field"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "97k every second to anyone standing in it. These accumulate with every Induction."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Every Induction leaves a field on the floor. The damage is not the problem — the shrinking room is."
---

MDT holds only two spells for Galvazzt, and they are the same mechanic twice: **Induction**
pulses 145k across the group and creates an **Induction Field**, which then burns 97k a second
for anyone inside it.

Nothing removes the fields, so the arena fills up as the fight runs and the group's footing
gets progressively worse.

Method's tracker names two abilities MDT does not carry — **Lightning Spire** and
**Consume Charge**. Both are recorded here rather than written into the spell list, and MDT
does place a [Lightning Spire](#/d/temple-of-sethraliss/map/mob/135445) unit with 21.6 million
health in the dungeon, which suggests the mechanic exists and its spell simply was not
extracted.
