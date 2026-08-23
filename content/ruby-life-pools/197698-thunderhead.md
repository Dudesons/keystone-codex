---
npcId: 197698
name: "Thunderhead"   # auto
count: 48   # auto — forces per unit

threat: high
role:
rank: miniboss

spells:
  - id: 392641
    name: "Rolling Thunder"   # auto
    # dispel: magic · Instant · 300 yd range
    tag: dispel
    prio: 1
    note: "32k per second for 45 sec, stacking. Removing it fires Electrical Discharge into the party, so the dispel is a decision, not a reflex."
  - id: 392640
    name: "Rolling Thunder"   # auto
    tag: dispel
  - id: 1310599
    name: "Electrical Discharge"   # auto
    # Instant · Unlimited range
    tag: dodge
    note: "What Rolling Thunder pays out on removal: 78k plus 15k per second for 10 sec to everyone within 60 yd, stacking."
  - id: 392395
    name: "Thunder Jaw"   # auto
    # 2.5 sec cast · 20 yd range
    tag: tank
    prio: 1
    note: "582k Physical plus 145k Nature and a knockback. The knockback is the dangerous half — it puts the tank out of range."
  - id: 395303
    name: "Thunder Jaw"   # auto
    # Instant · 100 yd range
    tag: tank
  - id: 391726
    name: "Storm Breath"   # auto
    # 4 sec cast · 45 yd range
    tag: dodge
    prio: 2
    note: "Frontal cone at 97k every half-second for 3 sec. Four seconds of cast to step out of it."
  - id: 391727
    name: "Storm Breath"   # auto
    # Instant
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Dispelling Rolling Thunder is not free — it detonates into the party. Clear the stacks when the group is topped, not when someone is already low."
---

Forty-eight forces on a single unit, the largest one-mob share in Ruby Life Pools, with a
frontal and a tank buster on top. It behaves like a miniboss and is worth treating as one.

**Rolling Thunder** is the ability to understand. It runs for 45 seconds, stacks, and pays out
on *removal*: Electrical Discharge hits everyone within 60 yards for 78k plus a 10-second
bleed, and that too stacks. So the dispel is a timing call — take it while the party is
healthy, or let the ticks run and pay later.

One disagreement worth knowing about: MDT declares Rolling Thunder a **magic** dispel, while
Method's tracker suggests Stoneform clears it, which would make it physical in nature. The
data in this repository comes from MDT, so the `D` badge follows MDT. If the two ever have to
be reconciled, it is this ability.
