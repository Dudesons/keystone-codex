---
npcId: 255604
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
    note: "Disorients a player for 6 sec. Kickable, and dispellable as magic."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Same six-second disorient as the other Sayaad, on a single unit that is easy to lose track of."
---

The second MDT entry for the Seductive Sayaad — one placement rather than four, and otherwise
identical to [the first](#/d/murder-row/mob/236082).

Same cast, same two answers: interrupt it, or dispel the disorient as magic.
