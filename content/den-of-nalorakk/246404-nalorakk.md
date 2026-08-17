---
npcId: 246404
name: "Nalorakk"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 1297797
    name: "Forceful Slam"   # auto
    # 5 sec cast · 100 yd range
    tag: soak
    prio: 1
    note: "776k within 6 yd of Zul'jarra — and if nobody is hit, she takes it all and screams. This is a soak, not a dodge. The whole fight turns on understanding that."
  - id: 1243569
    name: "Overwhelming Onslaught"   # auto
    # Instant · 100 yd range
    tag: soak
    prio: 1
    note: "315k a second for 3 sec to everyone, ignoring armour, ending in a knockback. Zul'jarra's Defensive Stance cuts it by 80% for anyone standing behind her."
  - id: 1297792
    name: "Overwhelming Onslaught"   # auto
    # 7 sec cast · 100 yd range
    tag: soak
  - id: 1297793
    name: "Overwhelming Onslaught"   # auto
    # Instant · 100 yd range
    tag: soak
  - id: 1242860
    name: "Echoing Maul"   # auto
    # 4 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "Marks players, then drops an Echo on each marked spot for 194k within 8 yd. Where you stand when the mark lands is where the Echo stays."
  - id: 1242869
    name: "Echoing Maul"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1242887
    name: "Echoing Maul"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1243002
    name: "Fury of the War God"   # auto
    # Channeled (10 sec cast) · 300 yd range
    tag: soak
    prio: 1
    note: "Every Echo charges Zul'jarra. Each one blocked by a player costs 68k; each one that reaches her triggers Demoralizing Scream. Bodies in the way, one per Echo."
  - id: 1243011
    name: "Fury of the War God"   # auto
    # Instant · 100 yd range
    tag: soak
  - id: 1243273
    name: "Fury of the War God"   # auto
    # Channeled (1 sec cast) · 100 yd range
    tag: soak
  - id: 1243408
    name: "Echoing Fury"   # auto
    # Instant · 100 yd range
    tag: soak
    note: "68k to the first player in a charging Echo's path — the price of intercepting one."
  - id: 1261976
    name: "Echoing Fury"   # auto
    # Instant · 100 yd range
    tag: soak
    note: "39k, and the Echo survives one more Fury of the War God before fading."
  - id: 1254622
    name: "Watchful Gaze"   # auto
    # Instant
    tag: ignore
    note: "He waits for the final trial. Scripting, not a mechanic."
  - id: 1297796
    name: "Stunned"   # auto
    tag: ignore
    note: "MDT lists it with no tooltip text."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Nothing here is dodged — it is intercepted. Every Echo that reaches Zul'jarra, and every Forceful Slam that misses the group, lands on her instead and comes back as a stacking party-wide debuff."
---

The dungeon's last fight inverts the usual instinct completely: **the mechanics are aimed at
Zul'jarra, and the group's job is to get in the way.**

**Fury of the War God** sends every [Echo of Nalorakk](#/d/den-of-nalorakk/mob/247301) charging
at her. An Echo stopped by a player costs 68k. An Echo that arrives triggers
**Demoralizing Scream** — 145k to everyone, ignoring armour, plus **+10% damage taken for 30
seconds, stacking**. So the cheap outcome is taking the hit.

**Forceful Slam** works the same way. It is 776k within 6 yards of her, and *if no player is
struck, she bears the whole thing* and screams again. Standing clear of a 776k slam is the
wrong answer.

**Overwhelming Onslaught** is the one place she protects the group instead: her
**Defensive Stance** cuts it by 80% for anyone behind her.

**Echoing Maul** is the only conventional mechanic — marks, then Echoes landing where the
marked players were standing.
