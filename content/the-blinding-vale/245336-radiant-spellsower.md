---
npcId: 245336
name: "Radiant Spellsower"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1238200
    name: "Frantic Blooming"   # auto
    # Channeled (8 sec cast) · 20 yd range
    tag: kick
    prio: 1
    note: "Eight seconds spent waking every dormant Lasher within 20 yd. Letting it finish adds bodies to a pull that was already sized."
  - id: 1301834
    name: "Light Bolt Volley"   # auto
    # 4 sec cast · 100 yd range
    tag: kick
    prio: 2
    note: "175k Holy to everyone within 100 yd. The damage cast worth the kick — Light Bolt is not."
  - id: 1238063
    name: "Light Bolt"   # auto
    # 2.5 sec cast · 40 yd range
    tag: kick
    prio: 3
    note: "116k on one player. Third in line: only kick this when nothing else is casting."
  - id: 1267029
    name: "Call The Grove"   # auto
    # Channeled
    tag: dodge
    note: "It runs toward the nearest dormant Lashers so it can channel on them. Cutting it off, or moving it, is as good as an interrupt."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Frantic Blooming wakes every dormant Lasher nearby. Kick that one before the damage casts — extra bodies cost more than 175k does."
---

Fifteen units at 7 forces each, and the mob whose interrupts need ranking. It has **three
kickable casts**, and spending the interrupt on the wrong one is the mistake.

**Frantic Blooming** comes first, and it is not a damage cast at all: eight seconds of channel
that wakes every dormant [Lasher](#/d/the-blinding-vale/codex/mob/245410) within 20 yards. The Vale
is full of them — 99 units — so a channel that finishes turns a measured pull into an
unmeasured one.

**Light Bolt Volley** is 175k to the whole group and comes second. **Light Bolt**, at 116k on
one target, is the one to let through.

**Call The Grove** is worth reading too: it is the mob physically running to reach dormant
lashers. Stopping it moving is as good as stopping the channel that follows.
