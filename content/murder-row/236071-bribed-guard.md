---
npcId: 236071
name: "Bribed Guard"   # auto
count: 25   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1216529
    name: "Shield Bash"   # auto
    # 3 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "+20% Physical damage taken for 20 seconds on the target. The tooltip's damage figure is unscaled; the multiplier is the ability."
  - id: 1295035
    name: "Glaive Toss"   # auto
    # 2 sec cast · 60 yd range
    tag: dispel
    prio: 1
    note: "A glaive that bounces between nearby players, leaving a bleed. Tooltip figures unscaled — Method reads it as a bleed to clear."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Shield Bash stacks 20% Physical damage taken for twenty seconds. Paired with a Shivan Punisher's Whirlwind, that multiplier is what kills."
---

Two units at 25 forces each. Both of its abilities carry **unscaled tooltip values** in the
data — Shield Bash reads as 55 damage, Glaive Toss as 9 — so this card describes what they do
and quotes no numbers.

What is reliable: **Shield Bash** applies **+20% Physical damage taken for 20 seconds**, and
**Glaive Toss** bounces between players applying a bleed. The multiplier is the dangerous half,
because Murder Row's heavy hitters are all Physical.

The [Bribed Captain](#/d/murder-row/mob/252529) casts both of these as well, with a pack-wide
buff on top.
