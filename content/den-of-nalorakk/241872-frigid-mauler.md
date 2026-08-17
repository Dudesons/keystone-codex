---
npcId: 241872
name: "Frigid Mauler"   # auto
count: 9   # auto — forces per unit

threat: high
role: melee

spells:
  - id: 1309919
    name: "Frigid Roar"   # auto
    # 3.5 sec cast
    tag: kick
    prio: 1
    note: "-50% haste and -50% movement speed on the group. No damage at all, which is why it gets ignored — and half the group's throughput is a large price for a free kick."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Frigid Roar costs no health and half the group's haste. Three and a half seconds of cast, one interrupt — there is no excuse for letting it through."
---

Eight units at 9 forces each, with a single cast and no damage to its name.

**Frigid Roar** halves haste and movement speed across the group. Nothing on the health bars
moves, so it competes badly for interrupts against casts that visibly hurt — and that is
precisely the mistake. Half haste means half the healing, half the damage and a slower dodge,
for as long as it lasts.

Method rates it *Important* for the same reason, and notes Blessing of Freedom as an answer to
the movement half.
