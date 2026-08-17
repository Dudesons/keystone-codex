---
npcId: 268344
name: "Corrupted Guardian"   # auto
count: 0   # auto — forces per unit

# Part of the Avatar of Sethraliss encounter. Worth no forces.
threat:
role: add

spells:
  - id: 1302761
    name: "Unstable Corruption"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "485k within 20 yards, and it forms Corrupted Lifeforce. The explosion is also how the orbs get onto the floor."
  - id: 1300803
    name: "Tainted Strike"   # auto
    # 2.5 sec cast · Unlimited range
    tag: tank
    prio: 1
    note: "485k plus 58k a second for 10 sec, stacking. A genuine tank buster on an add."
  - id: 1303446
    name: "Tainted Strike"   # auto
    # Instant · Unlimited range
    tag: tank
  - id: 1302616
    name: "Vile Charge"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 2
    note: "Charges a player for 68k plus 39k a second for 8 sec."
  - id: 1302618
    name: "Vile Charge"   # auto
    # Instant · Unlimited range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Unstable Corruption is 485k in twenty yards and it spawns the Lifeforce orbs. Where it goes off decides where the group has to go next."
---

The [Avatar](#/d/temple-of-sethraliss/mob/133392)'s heavy add, with 1.7 million health and a
tank buster that would not be out of place on a boss.

**Tainted Strike** is 485k with a stacking ten-second burn. **Unstable Corruption** is 485k in
a twenty-yard radius — and it is what creates the
[Corrupted Lifeforce](#/d/temple-of-sethraliss/mob/268364) orbs, so it is simultaneously the
biggest hit in the encounter and the thing that sets up its central decision.
