---
npcId: 234849
name: "Unleashed Imp"   # auto
count: 2   # auto — forces per unit

threat: low
role: caster

spells:
  - id: 1223204
    name: "Felfire Burst"   # auto
    # 1.5 sec cast · 20 yd range
    tag: kick
    prio: 1
    note: "39k on one player. Trivial alone — but with fifty-eight of these on the map, the casts never stop."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Fifty-eight imps, each casting a 39k bolt. No single one is worth an interrupt, which is exactly why the damage adds up unnoticed."
---

Fifty-eight units at 2 forces each — the largest headcount in the pool, and 17% of Murder Row's
required count.

**Felfire Burst** is 39k on a 1.5-second cast. Individually it is beneath notice; that is the
point. There are not enough interrupts in a group to answer a pack of imps, so the damage is
healed rather than prevented, and the correct response is to kill them quickly (0.6 million
health each) rather than to try to control them.
