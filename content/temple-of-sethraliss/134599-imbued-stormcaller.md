---
npcId: 134599
name: "Imbued Stormcaller"   # auto
count: 7   # auto — forces per unit

threat: high
role: caster

spells:
  - id: 1296052
    name: "Imbued Conduction"   # auto
    # dispel: magic · Instant · Unlimited range
    tag: dispel
    prio: 1
    note: "43k a second for 20 seconds, and if it expires, Conduct Lightning strikes the victim. Dispelling is not just damage saved — it stops the payload."
  - id: 1296045
    name: "Imbued Conduction"   # auto
    # Instant
    tag: dispel
  - id: 269116
    name: "Draw Power"   # auto
    # 2 sec cast · 100 yd range
    tag: kick
    prio: 1
    note: "+50% damage dealt, drawn from a nearby power source. A two-second cast — the biggest single buff in the trash."
  - id: 1291262
    name: "Lightning Bolt"   # auto
    # 2.5 sec cast · 100 yd range
    tag: kick
    prio: 2
    note: "116k on one player. Third in line behind Draw Power and the dispel."
  - id: 1310739
    name: "Accumulate Charge"   # auto
    # dispel: magic · Instant
    tag: dispel
    prio: 2
    note: "+8% damage per stack, up to three. Magic — the same buff the Agitated Nimbus carries."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Imbued Conduction pays out when it expires, not while it ticks. Dispel it before the twenty seconds are up, or Conduct Lightning lands on whoever carried it."
---

Four units at 7 forces each, and the busiest mob in the dungeon for a healer.

**Imbued Conduction** runs twenty seconds at 43k a second, and the tooltip's last sentence is
the point: *if it expires, Conduct Lightning strikes the victim*. Letting it tick out is
strictly worse than clearing it, and it is a **magic** dispel.

**Draw Power** is +50% damage dealt on a two-second cast, and it is interruptible — a large
buff for a small window of attention.

It also carries **Accumulate Charge**, dispellable, and a plain **Lightning Bolt**. Four
abilities, three of which want a global from someone.
