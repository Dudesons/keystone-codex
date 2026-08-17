---
npcId: 190207
name: "Primalist Cinderweaver"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 384194
    name: "Cinderbolt"   # auto
    # 2.5 sec cast · 60 yd range
    tag: kick
    prio: 1
    note: "116k Fire on one player. Its only cast — kick it, or stun the mob and skip the rotation entirely."
  - id: 373693
    name: "Living Bomb"   # auto
    # Instant · 60 yd range
    tag: dodge
    note: "58k per second for 6 sec on a player, then 78k to everyone within 6 yd and a knock-up. Spread before it expires."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Living Bomb explodes on whoever is standing next to its carrier, and throws them in the air — walk out before the six seconds are up."
---

Nine units at 7 forces each, and the softest target in the dungeon: it takes the full CC list,
stuns included. On a big pull it is the mob to lock down rather than the mob to kick.

**Living Bomb** is the part that catches groups out, because the damage does not land on the
carrier — it lands on whoever is standing beside them six seconds later, with a knock-up on
top. The knock-up is what turns a survivable hit into lost uptime.
