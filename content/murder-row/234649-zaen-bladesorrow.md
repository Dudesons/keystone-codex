---
npcId: 234649
name: "Zaen Bladesorrow"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 734276
    name: "Murder in a Row"   # auto
    # Instant
    tag: kick
    prio: 1
    note: "He shoots every player in his line of sight for 388k plus 873k more. Break line of sight — the freight crates are the cover the fight provides."
  - id: 1218347
    name: "Murder in a Row"   # auto
    # Channeled (5.5 sec cast)
    tag: kick
    prio: 1
    note: "The aiming window — five and a half seconds to get behind something."
  - id: 474545
    name: "Murder in a Row"   # auto
    # Instant · Unlimited range
    tag: kick
  - id: 474740
    name: "Murder in a Row"   # auto
    # dispel: bleed · Instant · 100 yd range
    tag: dispel
    note: "The bleed left on anyone he hit."
  - id: 474763
    name: "Murder in a Row"   # auto
    tag: kick
  - id: 1222598
    name: "Murder in a Row"   # auto
    # Instant · Unlimited range
    tag: kick
  - id: 1222795
    name: "Envenom"   # auto
    # 3 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "436k on the tank and it applies Heartstop Poison."
  - id: 1223939
    name: "Envenom"   # auto
    # dispel: poison · Instant · 100 yd range
    tag: dispel
  - id: 474515
    name: "Heartstop Poison"   # auto
    # dispel: poison · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "-30% maximum health and 873k over 15 sec. A poison — this one has to be dispelled, not healed."
  - id: 1214352
    name: "Fire Bomb"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "Six seconds, then 175k within 6 yd — and it destroys any Forbidden Freight caught in the blast. The cover is destructible."
  - id: 1214355
    name: "Fire Bomb"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 1214357
    name: "Fire Bomb"   # auto
    # Instant
    tag: dodge
  - id: 1217123
    name: "Fire Bomb"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 474478
    name: "Killing Spree"   # auto
    # Channeled (3 sec cast)
    tag: dodge
    prio: 2
    note: "39k every half-second to everyone for 3 sec, ignoring armour."
  - id: 474483
    name: "Killing Spree"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Murder in a Row hits everyone he can see. The Forbidden Freight is the cover — and his own Fire Bombs destroy it, so the safe spots shrink as the fight runs."
---

A line-of-sight fight, and the only one in the pool where the terrain is both the answer and a
casualty.

**Murder in a Row** takes five and a half seconds to aim and then shoots **every player in
line of sight** for 388k plus a further 873k. It is not dodged and it is not healed — the
group hides behind the [Forbidden Freight](#/d/murder-row/mob/234852) crates.

**Fire Bomb** is what makes that hard. It explodes after six seconds for 175k *and destroys any
Forbidden Freight caught in the blast*, so every bomb the group ignores costs them a piece of
cover later. And the freight itself explodes when destroyed, for 291k with a knockback.

**Heartstop Poison** — from Envenom — takes **30% of maximum health** and must be dispelled as
a poison.
