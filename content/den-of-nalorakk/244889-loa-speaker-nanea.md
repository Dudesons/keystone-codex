---
npcId: 244889
name: "Loa Speaker Nanea"   # auto
count: 35   # auto — forces per unit

threat: low
role: miniboss

spells:
  - id: 1309924
    name: "Volatile Totem"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "Plants several totems that radiate Volatile Flames. Killing the totems is the job — she keeps making more while they stand."
  - id: 1309925
    name: "Volatile Totem"   # auto
    tag: dodge
  - id: 1296722
    name: "Earthquake"   # auto
    # 4 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "Breaks the ground under players and keeps ticking there for 30 sec. Four seconds of cast to be somewhere else. Tooltip figures are unscaled."
  - id: 1247366
    name: "Earthquake"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1247367
    name: "Earthquake"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1290205
    name: "Lightning Bolt"   # auto
    # 2.5 sec cast · 45 yd range
    tag: kick
    prio: 1
    note: "Her only interruptible cast. The tooltip damage is unscaled, so the reason to kick it is that it is free, not that the number is known."
  - id: 1264753
    name: "Heal"   # auto
    tag: kick
    note: "MDT lists it with no tooltip text at all. Treat a cast by that name as worth interrupting until someone confirms otherwise."
  - id: 1251027
    name: "Gravely Wounded"   # auto
    # Instant
    tag: ignore
    note: "Applied to her after the fight. Scripting, not a mechanic."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Earthquake stays on the ground for thirty seconds. Two or three casts and the fight has nowhere left to stand — move early, not when it hurts."
---

Thirty-five forces on one body with 7.8 million health: a miniboss in everything but the
label, and Method marks her Tough.

**Earthquake** is the ability that shapes the fight. The patches last **30 seconds**, which is
long enough that they accumulate rather than rotate, so the arena shrinks as the fight runs.
**Volatile Totem** adds objects to kill on top of that.

A caveat on the numbers: most of her tooltips carry **unscaled values** in the data — Lightning
Bolt reads as 12 damage — so this card describes durations and behaviour, which are reliable,
and quotes no damage figures, which are not.
