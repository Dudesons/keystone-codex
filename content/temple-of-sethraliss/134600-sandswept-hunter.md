---
npcId: 134600
name: "Sandswept Hunter"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1308113
    name: "Arrow Barrage"   # auto
    # Channeled (9 sec cast) · 60 yd range
    tag: dodge
    prio: 1
    note: "Nine seconds of arrows on one player at 44k every 0.8 sec — around 490k total. MDT does not flag it interruptible, but the mob takes the full CC list: stun it."
  - id: 1308116
    name: "Arrow Barrage"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 1292585
    name: "Sandburst Arrow"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "An arrow that trembles in the ground before exploding for 291k within 5 yd. The delay is the warning — move off it."
  - id: 1292623
    name: "Sandburst Arrow"   # auto
    # Instant · 50 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Arrow Barrage is nine seconds and about 490k on one player, and it cannot be kicked. It takes every CC in the list — stun it instead."
---

Nine units at 7 forces each, and a good illustration of when *stop* does not mean *interrupt*.

**Arrow Barrage** is a nine-second channel worth roughly 490k on a single target. MDT records
no interruptible flag on it — but the Hunter answers to Stun, Incapacitate, Silence, Fear,
Root, Slow, Disorient, Polymorph, Sap and Imprison. Method files the ability under *Stop*, and
that is the correct reading: any of those ends it.

**Sandburst Arrow** plants in the ground and detonates for 291k, so it announces itself.
