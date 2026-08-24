---
npcId: 236902
name: "Massive Felwyrm"   # auto
count: 12   # auto — forces per unit

threat: medium
role: caster
rank: miniboss

spells:
  - id: 1256300
    name: "Massive Fel Detonation"   # auto
    # dispel: magic · 5 sec cast
    tag: dispel
    prio: 1
    note: "291k within 10 yards on death. Dispellable as magic — strip it before killing, or clear the area first."
  - id: 1256299
    name: "Over-infused"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "Triggers Burning Fel every 3 sec and arms the death explosion. This is the buff behind both problems."
  - id: 1297667
    name: "Burning Fel"   # auto
    # Instant · 50 yd range
    tag: dodge
    prio: 2
    note: "39k to everyone within 50 yd, every 3 sec. Constant, unavoidable pressure."
  - id: 1217633
    name: "Corroding Spittle"   # auto
    # dispel: magic · 2 sec cast · 100 yd range
    tag: dispel
    prio: 1
    note: "82k up front then 87k every 3 sec for 15 sec, stacking. Magic — the stacks are what get out of hand."
  - id: 1258537
    name: "Summon Wyrms"   # auto
    # Channeled (1 sec cast)
    tag: dodge
    prio: 2
    note: "A Tiny Felwyrm every 0.3 sec — and each of those explodes for 194k on death too."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It explodes for 291k in ten yards, and it spawns Tiny Felwyrms that explode for 194k in four. Everything about this mob detonates — plan where."
---

One unit worth 12 forces, and the centre of a chain of explosions.

**Massive Fel Detonation** is 291k in a 10-yard radius on death, and MDT flags it **magic
dispellable** — the same trick as the small [Felwyrm](#/d/murder-row/codex/mob/236085), scaled up.

**Summon Wyrms** makes the problem multiply: a [Tiny Felwyrm](#/d/murder-row/codex/mob/253324) every
0.3 seconds, each carrying its own 194k death explosion. Killing the adds carelessly is as
expensive as killing the parent carelessly.

**Corroding Spittle** stacks a 15-second burn that also dispels as magic, so a group with
magic dispels has a lot to do here and a lot to gain from doing it.
