---
npcId: 134602
name: "Shrouded Fang"   # auto
count: 7   # auto — forces per unit

threat: medium
role: patrol

spells:
  - id: 1308100
    name: "Poisoned Cheap Shot"   # auto
    # dispel: poison · 2.5 sec cast · Unlimited range
    tag: kick
    prio: 1
    note: "Stuns a player and deals 97k a second for 5 sec. Requires stealth to cast — so it is the opener. Kickable, and dispellable as a poison."
  - id: 1295610
    name: "Slither Strike"   # auto
    # Instant · Unlimited range
    tag: dodge
    note: "Teleports to a player and hits for 68k. It picks its own target."
  - id: 1295635
    name: "Slither Strike"   # auto
    # Instant · 30 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Poisoned Cheap Shot opens from stealth with a stun. Whoever it lands on is out of the fight for five seconds at the worst possible moment — the start of the pull."
---

Seven units at 7 forces each, and they open from stealth.

**Poisoned Cheap Shot** requires stealth to cast, which makes it the *first* thing that
happens in a pull rather than something that arrives mid-fight — a stun plus five seconds of
97k ticks, landing before the group has settled.

Both answers work: it is **interruptible**, and the poison is dispellable. And the Fang takes
Stun, Fear, Root, Slow, Polymorph and Sap, so it can be handled before it opens at all if the
pull is planned.
