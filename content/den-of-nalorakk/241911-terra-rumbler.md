---
npcId: 241911
name: "Terra Rumbler"   # auto
count: 7   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1296518
    name: "Rumbling Ward"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "A shield on itself that also pulses 24k to the whole party every 2 sec for a full minute. Breaking the absorb is what ends the pulses."
  - id: 1296519
    name: "Rumbling Ward"   # auto
    # Instant · 60 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Rumbling Ward runs for a minute unless the shield is broken. Ignoring the elemental to kill something else means paying 24k every two seconds for the privilege."
---

Eleven units at 7 forces each, with one ability that turns a target-priority question into an
arithmetic one.

**Rumbling Ward** is an absorb on the caster *and* a party-wide damage-over-time — 24k every
2 seconds, for up to a minute. The shield is the timer. Focusing the Rumbler down ends the
pulses early; leaving it for later means the healer pays for the whole duration.

On a pull holding several of them, those pulses overlap, which is the case worth planning for.
