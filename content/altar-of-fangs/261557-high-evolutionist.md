---
npcId: 261557
name: "High Evolutionist"   # auto
count: 7   # auto — forces per unit

threat: high
role: caster

spells:
  - id: 1306385
    name: "Evolve"   # auto
    # Channeled (6 sec cast)
    tag: dodge
    prio: 1
    note: "Stop it with crowd control. Six seconds of channel healing it 5% per second, then a 250k absorb shield if it completes."

  - id: 1307602
    name: "Evolved"   # auto
    # Instant
    tag: ignore
    note: "The result of a completed Evolve, not a separate cast."

  - id: 1307567
    name: "Mass Envenom"   # auto
    # 2.5 sec cast
    tag: kick
    prio: 2

  - id: 1289416
    name: "Envenom"   # auto
    # 2.5 sec cast · dispel: poison
    tag: kick
    prio: 3
    note: "58k Nature then 24k every second for 8 sec. Dispellable as poison if it lands."

  - id: 1307571
    name: "Envenom"   # auto
    # Instant · dispel: poison
    tag: dispel

  - id: 1292904
    name: "Incubate"   # auto
    # Channeled (7 days cast)
    tag: ignore
    note: "A permanent channel on the eggs, flavour rather than a mechanic."

  - id: 1287544
    name: "Stunned"   # auto
    # Instant
    tag: ignore
    note: "The mob being stunned, not something it does to you."

  - id: 1221063
    name: "Xal'atath's Gift"   # auto
    # Instant
    tag: ignore
    note: "Sub-12 affix, rotated weekly. Not a trait of this mob."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Stop Evolve with crowd control, not with an interrupt. Left to finish, it has healed itself 30% and walks away with a 250k shield — the pull simply stops dying."
---

The mob that punishes a group with no crowd control ready.

**Evolve** is a six-second channel, and the fix is a stun or an incapacitate rather than a
kick. Its two Envenom casts are interruptible and matter less: they hurt, but they do not
undo the damage already done.

Note the asymmetry — the ability that costs you the pull is the one your interrupt does not
answer.
