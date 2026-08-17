---
npcId: 243029
name: "Kezkitt"   # auto
isBoss: true   # auto
count: 30   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: caster

spells:
  - id: 1235564
    name: "Lightblossom Beam"   # auto
    # 3 sec cast · 100 yd range
    tag: soak
    prio: 1
    note: "Standing in the beam hurts — 78k every 2 sec — but it is also what stops the seed growing. This is a soak, not something to dodge."
  - id: 1235574
    name: "Lightblossom Beam"   # auto
    # Instant · 100 yd range
    tag: soak
  - id: 1235616
    name: "Light Bolt"   # auto
    # 2.5 sec cast · Unlimited range
    tag: kick
    prio: 1
    note: "116k Holy on one player, and the only interruptible cast the Trinity has."
  - id: 1235828
    name: "Light-Scorched Earth"   # auto
    # Instant · 100 yd range
    tag: dodge
    note: "97k per second. What Fertile Loam turns into once a Lightblossom has drained it."
  - id: 1253028
    name: "Thicket's Trinity"   # auto
    # Instant
    tag: ignore
    note: "Meittik, Lekshi and Kezkitt share all damage taken."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Lightblossom Beam is the one place in the fight where standing in the damage is correct — the beam stops the seed blooming."
---

The second of the **Lightblossom Trinity**, and the one that inverts the usual instinct.

**Lightblossom Beam** hits the seeds Lekshi sows, applying Light-Gorged and germinating them
in 8 seconds — after which the blossom casts **Lightbloom Overgrowth** on the whole group. The
tooltip contains the answer in its last sentence: *standing within the beam stifles the seed's
growth*. So the beam is a soak. It costs 78k every 2 seconds to whoever takes it, and it saves
the group the bloom.

**Light Bolt** is the Trinity's only kickable cast, which makes it easy to remember where the
interrupts go.
