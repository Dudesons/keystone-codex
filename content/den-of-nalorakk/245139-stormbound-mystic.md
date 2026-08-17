---
npcId: 245139
name: "Stormbound Mystic"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1297778
    name: "Arc Lightning"   # auto
    # 4 sec cast · 50 yd range
    tag: kick
    prio: 1
    note: "194k, arcing to three targets. Four seconds of cast and it is the bigger of its two casts — this is where the interrupt goes."
  - id: 1246687
    name: "Lightning Bolt"   # auto
    # 2.5 sec cast · 45 yd range
    tag: kick
    prio: 2
    note: "116k on one player. Second in line."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Both casts are interruptible, so the only mistake available is spending the kick on the smaller one. Arc Lightning first."
---

Five units at 7 forces each — a straightforward caster whose only subtlety is ordering.

**Arc Lightning** takes four seconds, hits for 194k and chains to three players. **Lightning
Bolt** takes two and a half and hits one for 116k. Both are kickable, which means an interrupt
rotation here is about discipline rather than reaction speed.
