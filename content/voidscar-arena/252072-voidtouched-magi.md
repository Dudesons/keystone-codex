---
npcId: 252072
name: "Voidtouched Magi"   # auto
count: 25   # auto — forces per unit

threat: low
role: caster

spells:
  - id: 1299938
    name: "Shadowbolt Volley"   # auto
    # 4 sec cast · 100 yd range
    tag: kick
    prio: 1
    note: "194k to everyone within 60 yd. Four seconds of cast and the only interruptible thing it does."
  - id: 1299913
    name: "Null Eruption"   # auto
    # 4 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "145k within 10 yd of the impact, then 39k a second for 5 sec. Not interruptible — this one is dodged."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Two four-second casts that look identical on the cast bar. One is kicked, one is dodged — read the name, not the timer."
---

Three units at 25 forces each, and a clean split of responsibility.

**Shadowbolt Volley** is party-wide, 194k, and interruptible. **Null Eruption** is ground
damage, similar size, and not interruptible at all.

Both take four seconds, which is the practical difficulty: a group watching cast bars rather
than names will spend interrupts on the wrong one and then stand in the other.
