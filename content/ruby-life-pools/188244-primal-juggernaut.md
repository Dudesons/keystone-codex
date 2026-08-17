---
npcId: 188244
name: "Primal Juggernaut"   # auto
count: 25   # auto — forces per unit

threat: high
role: melee

spells:
  - id: 372730
    name: "Crushing Smash"   # auto
    # 2.5 sec cast · Unlimited range
    tag: tank
    prio: 1
    note: "533k Physical plus 145k Nature on the current target. Immune to everything but Taunt, so this one is taken, not avoided."
  - id: 1305213
    name: "Crushing Smash"   # auto
    # Instant · Unlimited range
    tag: tank
  - id: 1305201
    name: "Excavating Blast"   # auto
    # 3.5 sec cast
    tag: dodge
    prio: 1
    note: "107k to everyone within 60 yd, then 34k per second for 8 sec, and it brings the ceiling down."
  - id: 1310489
    name: "Blast Chunks"   # auto
    # Instant · Unlimited range
    tag: dodge
    note: "The debris from Excavating Blast: 291k within 6 yd of each impact. This is the part that is actually dodgeable."
  - id: 372793
    name: "Excavate"   # auto
    # Channeled (6 sec cast) · 40 yd range
    tag: ignore
    note: "Flavour channel on the tunnel, not aimed at the party."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Excavating Blast is unavoidable, but the rubble that follows is not — watch the ground after every cast."
---

Two units at 25 forces each, 9% of the dungeon between them, and immune to everything except
a taunt. There is no trick to take it off the tank.

**Excavating Blast** is worth reading in two halves. The blast itself is party-wide and cannot
be dodged — 107k up front and a 34k-per-second bleed for 8 seconds. What follows is
**Blast Chunks**, debris falling for 291k inside 6 yards of each impact, and that half is
entirely avoidable. Groups that treat the whole cast as unavoidable eat the second half for no
reason.
