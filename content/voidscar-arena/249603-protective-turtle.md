---
npcId: 249603
name: "Protective Turtle"   # auto
count: 5   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1250021
    name: "Shell Guard"   # auto
    # Channeled (20 sec cast)
    tag: kick
    prio: 1
    note: "-75% damage taken for every nearby ally, for twenty seconds. MDT does not flag it interruptible; Method says stop it. Either way, a pull that lets it run takes four times as long."
  - id: 1250023
    name: "Protected"   # auto
    # Instant · Unlimited range
    tag: kick
    prio: 1
    note: "The buff itself, on each protected ally."
  - id: 1310320
    name: "Exhausted"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "When the channel ends it stuns itself for 15 seconds and takes 20% more Physical damage. Wait it out and the turtle hands the window back."
  - id: 1249661
    name: "Feral Rage"   # auto
    # dispel: enrage · 1 sec cast · 30 yd range
    tag: dispel
    prio: 2
    note: "+20% melee haste to every ally within 30 yd."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Shell Guard cuts damage to the whole pack by 75%. It is worth 5 forces and it decides how long the pull takes — kill or stop it first."
---

One unit, worth 5 forces, with the largest damage reduction in the dungeon attached to it.

**Shell Guard** grants **-75% damage taken** to nearby allies for twenty seconds. On a pull
holding a Brutal Overseer and a Watchful Harrower, that is the difference between a pull and a
stalemate.

The consolation is **Exhausted**: when the channel finishes, the turtle stuns *itself* for
fifteen seconds and takes 20% more Physical damage. So the shell is a delay rather than a
saving throw — but fifteen seconds of waiting is exactly what a Mythic+ timer cannot afford.

Honest caveat: MDT does **not** list Shell Guard as interruptible, while Method files it under
*Stop*. If the kick works in game, MDT's data is incomplete here.
