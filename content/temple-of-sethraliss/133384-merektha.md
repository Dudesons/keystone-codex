---
npcId: 133384
name: "Merektha"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 1290031
    name: "A Knot of Snakes"   # auto
    # 3 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "Wraps a player, preventing any action and suffocating them for 29k a second. Destroying or incapacitating the knot frees them — it does not time out."
  - id: 1290797
    name: "Lightning Bite"   # auto
    # 3 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "533k plus 58k a second for 7 sec on the tank."
  - id: 1308838
    name: "Lightning Bite"   # auto
    # Instant · Unlimited range
    tag: tank
  - id: 264172
    name: "Burrow"   # auto
    # 3 sec cast · 20 yd range
    tag: dodge
    prio: 1
    note: "291k to anything in her path, knocked up and stunned for 4 sec. A Burrowquake follows."
  - id: 1293048
    name: "Serpentstorm"   # auto
    # 4 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "Knocks everyone back for 116k plus a burn, and Storm Strikes land across the chamber afterwards."
  - id: 1296912
    name: "Storm Strikes"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "291k within 4 yd of each impact, across the whole room. What Serpentstorm knocks people into."
  - id: 1289602
    name: "Thunder Spit"   # auto
    # 3 sec cast
    tag: dodge
    prio: 2
    note: "58k and lightning striking the target's location every second for 4 sec. Keep moving."
  - id: 1291734
    name: "Thunder Spit"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1298329
    name: "Thunder Spit"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1289205
    name: "Hatch"   # auto
    # 3 sec cast
    tag: dodge
    prio: 2
    note: "Snakes emerge from the eggs in her chamber."
  - id: 1296738
    name: "Hatch"   # auto
    # Instant · 200 yd range
    tag: dodge
  - id: 1289589
    name: "Lingering Storm"   # auto
    # Instant · 100 yd range
    tag: dodge
    note: "97k a second on the ground."
  - id: 1297034
    name: "Electrified Ground"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "She blocks the exits with patches at 193k a second. There is no leaving the chamber."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "A Knot of Snakes does not expire — the victim is out of the fight until someone breaks or incapacitates the knot. Free them; do not wait."
---

A fight in a closed room: **Electrified Ground** seals the exits at 193k a second, so
everything here is resolved inside the chamber.

**A Knot of Snakes** is the mechanic that needs the group's attention. It prevents *any* action
and suffocates the victim, and the tooltip names the two ways out — *destroying or
incapacitating the knot*. Neither happens on its own.

The rest is displacement into damage. **Serpentstorm** knocks everyone back and then
**Storm Strikes** land across the chamber; **Burrow** knocks up and stuns for four seconds
anything in her path. Both are worse for where they put people than for what they deal.
