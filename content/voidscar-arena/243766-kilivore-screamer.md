---
npcId: 243766
name: "Kilivore Screamer"   # auto
count: 7   # auto — forces per unit

threat: lethal
role: caster

spells:
  - id: 1233398
    name: "Mad Shriek"   # auto
    # 3.5 sec cast · 60 yd range
    tag: kick
    prio: 1
    note: "Fears everyone within 60 yd for 6 sec. No damage — six seconds of the group running in random directions, mid-pull, is the cost."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "A fear is not a damage cast, which is why it gets left. Six seconds of everyone running loose, in a pull holding fifteen of these, is how runs end."
---

Fifteen units at 7 forces each, with one cast and no damage on it whatsoever.

**Mad Shriek** fears the group for 6 seconds at 60 yards. It competes badly for interrupts
because nothing in the combat log looks urgent — and yet a feared group is not dodging a
Whirling Gust, not soaking a Sky Strike, and not holding a tank position.

With fifteen of them in the dungeon, this is less an interrupt to remember than an interrupt
rotation to plan.
