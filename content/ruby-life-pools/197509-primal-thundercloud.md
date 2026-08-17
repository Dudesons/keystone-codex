---
npcId: 197509
name: "Primal Thundercloud"   # auto
count: 0   # auto — forces per unit

# Summoned by the Tempest Channeler and by High Channeler Ryvati, and worth no forces.
threat:
role: add

spells:
  - id: 391031
    name: "Stormcloud Barrier"   # auto
    # dispel: magic · Instant
    tag: dispel
    prio: 1
    note: "An absorb worth 85% of its health. Dispelling it kills the cloud outright — the fastest way to clear a wave of them."
  - id: 392399
    name: "Stormcloud Detonation"   # auto
    # Instant · 100 yd range
    tag: dodge
    note: "It charges the nearest player and dies for 39k within 4 yd. Small hit, but it lands wherever the group is standing."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Do not damage the barrier down — dispel it. 85% of its health disappears with one global."
---

Worth no forces, so killing them is pure overhead: the point is to spend as little as possible
doing it.

**Stormcloud Barrier** is why. It absorbs 85% of the cloud's health, and it carries a magic
dispel type — one dispel removes the shield and the cloud with it. A group that hits them
instead is chewing through five times the health for the same result.
