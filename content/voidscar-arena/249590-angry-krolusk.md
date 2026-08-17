---
npcId: 249590
name: "Angry Krolusk"   # auto
count: 8   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1249621
    name: "Violent Sand"   # auto
    # 3 sec cast · Melee Range
    tag: kick
    prio: 1
    note: "155k to everyone within 60 yd and -40% movement speed for 12 sec. The slow is what hurts, in a dungeon of charges and frontals to walk out of."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Twelve seconds at 40% slower, in a room full of Smashing Charges and Macestorms. Kick it, or accept being hit by things nobody would normally be hit by."
---

One unit at 8 forces, with a single interruptible cast.

**Violent Sand** deals 155k, which is unremarkable here, and slows the group by 40% for twelve
seconds, which is not. Voidscar Arena asks players to move out of charges, cleaves and typhoons
constantly, and this ability makes every one of those harder for the next twelve seconds.

Method flags Blessing of Freedom as the other answer.
