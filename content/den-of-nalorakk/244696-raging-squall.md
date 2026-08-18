---
npcId: 244696
name: "Raging Squall"   # auto
count: 0   # auto — forces per unit

# Created by the Sentinel of Winter, and worth no forces.
threat:
role: add

spells:
  - id: 1235638
    name: "Raging Squall"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "339k where it forms, then it wanders for 90 seconds, hitting for 145k and knocking players back. It is terrain, not a target."
  - id: 1235641
    name: "Raging Squall"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "They do not expire quickly and they do not stay still. By the third cast the arena has several drifting through it — track them, or get knocked into the blizzard."
---

The [Sentinel of Winter](#/d/den-of-nalorakk/codex/mob/244100)'s wandering hazard, and the reason her
fight gets harder rather than staying level.

Ninety seconds is longer than her cast cycle, so they accumulate. Each one hits for 145k and
knocks players back — into Blizzard's Wrath at the edge, or out of the eye of a Frozen Tempest,
both of which cost more than the squall itself.

There is nothing to do about them except know where they are.
