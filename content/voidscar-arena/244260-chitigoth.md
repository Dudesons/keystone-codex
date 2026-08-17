---
npcId: 244260
name: "Chitigoth"   # auto
count: 25   # auto — forces per unit

threat: high
role: miniboss

spells:
  - id: 1234855
    name: "Insidious Aura"   # auto
    # Channeled (10 sec cast) · 60 yd range
    tag: dodge
    prio: 1
    note: "87k every 2 sec to everyone within 100 yards, for ten seconds. There is no getting away from it — this is pure healer pressure."
  - id: 1250695
    name: "Insidious Aura"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1234833
    name: "Ravenous Swarm"   # auto
    # Instant · 60 yd range
    tag: dodge
    prio: 1
    note: "97k every second in an area at the target's location. Entirely avoidable — walk out."
  - id: 1250079
    name: "Ravenous Swarm"   # auto
    # Instant · 60 yd range
    tag: dodge
  - id: 1249661
    name: "Feral Rage"   # auto
    # dispel: enrage · 1 sec cast · 30 yd range
    tag: dispel
    prio: 2
    note: "+20% melee haste to every ally within 30 yd."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Insidious Aura reaches 100 yards for ten seconds. Nothing about it can be dodged — the group has to have healing banked before it starts."
---

A single unit worth 25 forces, and Method marks it Tough.

**Insidious Aura** is the reason. Ten seconds of 87k every 2 seconds, to everyone within a
hundred yards — which is the whole room. There is no position that helps and no interrupt
listed, so it is planned for rather than reacted to.

**Ravenous Swarm** is the opposite: located, visible, and completely avoidable.
