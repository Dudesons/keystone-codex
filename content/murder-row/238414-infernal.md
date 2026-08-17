---
npcId: 238414
name: "Infernal"   # auto
count: 0   # auto — forces per unit

# Summoned by Lithiel's Summon Infernal, and worth no forces.
threat:
role: add

spells:
  - id: 1231256
    name: "Infernal Rage"   # auto
    # 1 sec cast
    tag: dodge
    prio: 1
    note: "Stuns everyone within 15 yards and grants itself an Immolation Aura. A one-second cast, so the only defence is not being within 15 yards."
  - id: 1231262
    name: "Felfire Core"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "58k to nearby players every 2 sec, for as long as it stands."
  - id: 1231353
    name: "Felfire Core"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "202 million health — it is not meant to be killed. Stay out of its 15-yard stun and let it burn."
---

The add from Lithiel's **Summon Infernal**, and its health bar says everything: **202.7 million**
— eight times the boss's own.

It is not a kill target. It is terrain that stuns: **Infernal Rage** locks down everyone within
15 yards on a one-second cast, and **Felfire Core** ticks 58k every 2 seconds on anyone nearby.

Method lists the summon under *Avoid*, which is the right reading. The group's job is to keep
away from it while it exists.
