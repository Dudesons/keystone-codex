---
npcId: 245145
name: "Bonded Beasttamer"   # auto
count: 6   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1246865
    name: "Bestial Wrath"   # auto
    # dispel: enrage · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "+25% damage for 10 sec, on both the tamer and its pet. An enrage, so it soothes off — and it is worth two mobs' worth of damage."
  - id: 1246860
    name: "Bestial Wrath"   # auto
    tag: dispel
  - id: 1246847
    name: "Shoot"   # auto
    # 2 sec cast · 40 yd range
    tag: kick
    prio: 1
    note: "194k Physical on one target. Interruptible, and worth the interrupt."
  - id: 1266207
    name: "Reposition"   # auto
    # Instant · 41 yd range
    tag: ignore
    note: "It closes the distance. Not an attack — but it does mean it will not stay kited at range."
  - id: 1246877
    name: "Overwhelm Prey"   # auto
    tag: ignore
    note: "MDT lists it with no tooltip text. Nothing can be said about it from the data."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Bestial Wrath buffs the tamer and the saberfang together. One soothe removes it from both — leaving it up doubles the pair's damage for ten seconds."
---

Four units at 6 forces each, and they never come alone: each is paired with a
[Loyal Saberfang](#/d/den-of-nalorakk/map/mob/245190).

**Bestial Wrath** is what makes the pair worth reading as one unit — it is +25% damage on
tamer *and* pet, for 10 seconds, and MDT declares it an **enrage**, so a soothe removes it
from both at once.

**Shoot** is a 194k interruptible cast. **Reposition** is worth noting only because it means
the tamer will not stay where it is put.
