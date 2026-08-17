---
npcId: 135204
name: "Phantom Hex Priest"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 270492
    name: "Hex"   # auto
    # dispel: curse · 3.5 sec cast · 40 yd range
    tag: kick
    prio: 1
    note: "Turns a player into a dinosaur for 5 sec — no actions at all. A curse, which is the dispel groups most often lack. Kick it first."
  - id: 1295125
    name: "Spectral Bolt"   # auto
    # dispel: magic · 2.5 sec cast · 100 yd range
    tag: kick
    prio: 2
    note: "116k on one player. Second in line."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Hex is a curse, not magic. If the kick is missed, the usual dispel will not clear it — five seconds of a player doing nothing."
---

Three units at 7 forces each, and the mob that finds out whether the group brought a curse
dispel.

**Hex** removes a player from the fight for five seconds. It is interruptible, which is the
first answer, and dispellable as a **curse**, which is the second — and curses are the dispel
type most commonly missing from a five-person group.

**Spectral Bolt** is a plain 116k cast and comes second.

MDT lists Stun, Incapacitate, Silence, Slow, Disorient and Shackle Undead here, so this is also
a mob that can simply be locked down.
