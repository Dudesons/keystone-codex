---
npcId: 197697
name: "Flamegullet"   # auto
count: 40   # auto — forces per unit

threat: high
role:
rank: miniboss

spells:
  - id: 392394
    name: "Fire Maw"   # auto
    # 2.5 sec cast · Unlimited range
    tag: tank
    prio: 1
    note: "582k Physical plus 97k Fire, then 78k per second for 6 sec. The bleed is what stacks up, not the hit."
  - id: 395292
    name: "Fire Maw"   # auto
    # Instant · 100 yd range
    tag: tank
  - id: 391723
    name: "Flame Breath"   # auto
    # 4 sec cast · 45 yd range
    tag: dodge
    prio: 1
    note: "Frontal cone, 97k every half-second for 3 sec. Four seconds of cast time — nobody needs to be in it."
  - id: 392569
    name: "Molten Blood"   # auto
    # Instant
    tag: dodge
    prio: 2
    note: "Below 50% health only: 48k to everyone within 60 yd every 3 sec, growing 15% per cast up to ten stacks. A soft enrage — the second half of its health bar is the expensive one."
  - id: 392570
    name: "Molten Blood"   # auto
    # Instant
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Below half health it starts bleeding fire on the whole party, harder with every cast. Save cooldowns for the second half, not the pull."
---

Forty forces on one body with 9.7 million health, and it sees through stealth — it cannot be
walked past.

The fight has two phases and the second is the expensive one. Above 50% it is a frontal and a
tank buster, both readable. Below 50%, **Molten Blood** starts ticking on the whole party
every 3 seconds and grows 15% per cast, up to ten applications. Damage taken rises the longer
the mob lives, which inverts the usual advice: burn the back half, do not pace it.
