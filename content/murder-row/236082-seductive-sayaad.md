---
npcId: 236082
name: "Seductive Sayaad"   # auto
count: 6   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1201554
    name: "Seduction"   # auto
    # dispel: magic · 3 sec cast · 60 yd range
    tag: kick
    prio: 1
    note: "Disorients a player for 6 seconds. No damage at all. Kickable, and dispellable as magic — two answers, and it is worth using one."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Six seconds of a player doing nothing, from a cast that deals no damage. It loses the interrupt race to flashier things and costs more than they do."
---

Four units at 6 forces each, with one cast and no damage on it.

**Seduction** takes a player out of the fight for six seconds. Because nothing appears in the
combat log, it consistently loses the interrupt priority contest against casts that visibly
hurt — and six seconds is a very long time in a Murder Row pull.

There are two ways to answer it: the kick, and the **magic** dispel afterwards. A group that
uses neither is fighting with four people.
