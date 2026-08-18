---
npcId: 134991
name: "Sandfury Stonefist"   # auto
count: 25   # auto — forces per unit

threat: high
role: melee

spells:
  - id: 1291468
    name: "Sunder Slam"   # auto
    # 3 sec cast · Unlimited range
    tag: tank
    prio: 1
    note: "388k and +50% Physical damage taken for 10 sec, stacking. Two applications and the tank is taking double from everything in the pull."
  - id: 265966
    name: "Ground Pound"   # auto
    # 4 sec cast
    tag: dodge
    prio: 1
    note: "157k and a knockback to everyone within 60 yd. Unavoidable by range — but four seconds of warning to be somewhere the knockback is survivable."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Sunder Slam stacks +50% Physical damage taken. It is the multiplier that kills the tank, not the 388k."
---

Four units at 25 forces each, tied with the [Sand-Sworn Rider](#/d/temple-of-sethraliss/codex/mob/134629)
for the heaviest mob in the dungeon.

**Sunder Slam** is the ability to plan around. Fifty percent extra Physical damage taken, for
ten seconds, **stacking** — and Temple of Sethraliss trash deals mostly Physical damage. At two
stacks the tank is taking double from the Krolusks and Riders pulled alongside it.

**Ground Pound** reaches 60 yards, so nobody is out of it; the four-second cast is for choosing
where the knockback sends people.

Only **Taunt** applies.
