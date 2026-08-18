---
npcId: 138493
name: "Minion of Zul"   # auto
count: 0   # auto — forces per unit

# The Shadow of Zul's variant, immune to every CC MDT lists. Worth no forces.
threat:
role: add

spells:
  - id: 269935
    name: "Bound by Shadow"   # auto
    # dispel: magic · Instant
    tag: dispel
    prio: 1
    note: "A 123k absorb and +20% damage — and removing it kills the target outright. Same interaction as the trash variant."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Dispelling Bound by Shadow kills it. In an encounter, that is the fastest add clear available."
---

The second MDT entry for the Minion of Zul, distinguished from
[the trash version](#/d/kings-rest/map/mob/133943) by being immune to every crowd control listed,
and by having a single placement rather than thirteen.

Same ability, same trick: **Bound by Shadow** kills the minion when it is dispelled.
