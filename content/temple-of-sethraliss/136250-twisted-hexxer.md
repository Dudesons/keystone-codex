---
npcId: 136250
name: "Twisted Hexxer"   # auto
count: 25   # auto — forces per unit

threat: high
role: caster

spells:
  - id: 268013
    name: "Flame Shock"   # auto
    # 4 sec cast · 60 yd range
    tag: kick
    prio: 1
    note: "242k plus 78k a second for 8 sec — around 860k on one player. Four seconds of cast, and the only interruptible thing it does."
  - id: 1311964
    name: "Latent Hex"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "31k a second for 4 sec, then 78k to everyone within 10 yards when it comes off. Walk away from the group before it expires."
  - id: 1311980
    name: "Latent Hex"   # auto
    tag: dodge
  - id: 1311981
    name: "Latent Hex"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 1300684
    name: "Hex Muck"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "Turns players standing in it into a frog — no attacking, no casting — and deals 97k every 2 sec. A patch of floor that removes people from the fight."
  - id: 1300666
    name: "???"   # auto
    tag: ignore
    note: "MDT records this spell with no name and no tooltip text. Nothing can be said about it."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Hex Muck turns anyone standing in it into a frog. It is ground damage that also disables — treat the puddle as lethal, not as a tick."
---

A single unit worth 25 forces, and the mob most able to take players out of a fight.

**Hex Muck** is a patch of ground that **transforms whoever stands in it into a frog**, unable
to attack or cast, while dealing 97k every 2 seconds. There is no dispel listed and no
interrupt — only not being in it.

**Latent Hex** works on a delay: four or five seconds of ticks on one player, then 78k to
everyone within 10 yards *on removal*. The carrier chooses whether that lands on the group.

**Flame Shock** is the interruptible cast, and worth about 860k if it runs.

A version of this mob also appears during the
[Avatar of Sethraliss](#/d/temple-of-sethraliss/map/mob/268491).
