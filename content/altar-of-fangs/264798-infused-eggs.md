---
npcId: 264798
name: "Infused Eggs"   # auto
count: 0   # auto — forces per unit

threat: low
role: add

spells:
  - id: 1293059
    name: "Hatch"   # auto
    # Instant
    tag: ignore
    note: "Breaks open and releases Hatchlings, which then fixate."
  - id: 1293079
    name: "Hatch"   # auto
    tag: ignore

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Not a mob so much as a spawner, and worth no forces. What comes out is
[Hatchling](#/d/altar-of-fangs/map/mob/261556), which fixates.
