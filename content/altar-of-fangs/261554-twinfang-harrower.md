---
npcId: 261554
name: "Twinfang Harrower"   # auto
count: 25   # auto — forces per unit

threat: medium
role: miniboss

spells:
  - id: 1294572
    name: "Duostrike"   # auto
    # Instant · Melee Range
    tag: tank
    prio: 1
    note: "Melee attacks strike twice. This is the tank buster of the pull."

  - id: 1294569
    name: "Paralyzing Shots"   # auto
    # dispel: magic · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "135k on impact, then 48k every second for 20 sec, and each tick takes another 10% movement speed. Dispellable as magic."

  - id: 1294567
    name: "Paralyzing Shots"   # auto
    # 3 sec cast · 100 yd range
    tag: dispel

  - id: 1294568
    name: "Paralyzing Shots"   # auto
    # Instant · 100 yd range
    tag: dispel

  - id: 1294570
    name: "Paralyzing Shots"   # auto
    # Instant · 100 yd range
    tag: dispel

  - id: 1307269
    name: "Paralyzing Shots"   # auto
    # Instant · 100 yd range
    tag: dispel

  - id: 1306668
    name: "Toxic Breath"   # auto
    tag: dodge
    note: "Frontal, 68k Nature every half second to anyone standing in it."

  - id: 1306669
    name: "Toxic Breath"   # auto
    # Instant · Unlimited range
    tag: dodge


# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Duostrike is a genuine tank buster on a mob that reads as trash. Treat it as a miniboss: the tank needs a cooldown, not a shrug."
---

Twenty-five forces per unit for four units — it is priced like a miniboss and it hits like
one, which is why it is filed as one rather than as trash.

**Paralyzing Shots** runs for twenty seconds and takes 10% movement speed with every tick, so
it is worth clearing before **Toxic Breath** goes out: a slowed player in a frontal taking 68k
every half second is how this pull turns bad.
