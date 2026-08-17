---
npcId: 268364
name: "Lifeforce"   # auto
count: 0   # auto — forces per unit

# The orbs of the Avatar of Sethraliss encounter. Worth no forces.
threat:
role: add

spells:
  - id: 1312214
    name: "Corruption"   # auto
    # Instant · Unlimited range
    tag: soak
    prio: 1
    note: "29k a second, -33% healing done and +300% Physical damage taken for 15 sec, stacking. This is what cleansing an orb costs the person who does it."
  - id: 1300871
    name: "Corrupted Lifeforce"   # auto
    # Instant
    tag: soak
    prio: 1
    note: "Touching it cleanses it and takes the Corruption. Left alone it bursts — and a cleansed orb can be consumed by the Avatar to heal her. Neither outcome is free."
  - id: 1302826
    name: "Corruption Burst"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "194k to everyone if the orb expires uncleansed, and +100% damage taken from this ability for 3 sec — so consecutive bursts escalate fast."
  - id: 1302897
    name: "Consume Lifeforce"   # auto
    # Instant · Unlimited range
    tag: soak
    prio: 1
    note: "The Avatar eating a cleansed orb: 2% of her health back plus a stacking regeneration. The reason cleansed orbs still have to be handled."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Both options cost something. Ignore the orb and it bursts for 194k with a stacking vulnerability; cleanse it and you carry +300% Physical damage taken for fifteen seconds."
---

The orbs of the [Avatar of Sethraliss](#/d/temple-of-sethraliss/mob/133392) fight, and the
clearest three-way trade in the pool.

**Leave it**: **Corruption Burst** hits everyone for 194k *and* raises damage taken from that
same ability by 100% for three seconds — so a second burst arriving inside that window is
double.

**Touch it**: it is cleansed, and the toucher takes **Corruption** — 33% less healing done and
**+300% Physical damage taken** for fifteen seconds, stacking. That is not a debuff a tank can
carry.

**Then**: a cleansed orb can be **consumed** by the Avatar, healing her 2% and starting a
stacking regeneration. So cleansing alone does not finish the job either.

Whoever takes the Corruption, and what they are expected to survive for the next fifteen
seconds, is the decision this fight is built around.
