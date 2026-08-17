---
npcId: 133943
name: "Minion of Zul"   # auto
count: 0   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 269935
    name: "Bound by Shadow"   # auto
    # dispel: magic · Instant
    tag: dispel
    prio: 1
    note: "A 123k absorb and +20% damage — and removing it kills the target outright. One dispel deletes the mob."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Bound by Shadow kills whatever it is on when it is removed. Dispel it and the minion dies — do not spend damage on these."
---

Thirteen of them on the map, worth **no forces**, with 0.3 million health each — and a
mechanic that most groups will never notice.

**Bound by Shadow** reads like a buff to work around: 123k absorbed, 20% more damage dealt.
The last clause is the point — *kills the target when removed*. A magic dispel does not weaken
the minion, it deletes it.

Proposed `high` not because the mob is dangerous but because the interaction is worth
knowing: thirteen bodies that a healer can remove with one global each, or that a group can
spend real damage on for nothing.
