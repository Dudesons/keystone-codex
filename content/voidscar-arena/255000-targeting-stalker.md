---
npcId: 255000
name: "Targeting Stalker"   # auto
count: 0   # auto — forces per unit

# A scripting unit for Charonus's singularities. Worth no forces.
threat:
role: add

spells:
  - id: 1263984
    name: "Unstable Singularity"   # auto
    # Instant · 100 yd range
    tag: dodge
    note: "The singularity itself, anchored here rather than on the boss: 7k a second and a pull toward the centre."
  - id: 1264188
    name: "Unstable Singularity"   # auto
    # Instant · Unlimited range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

A stalker — one of the invisible units encounter scripting attaches effects to. It is where
[Charonus](#/d/voidscar-arena/mob/239167)'s singularities are anchored, not something anyone
fights.

It has a card because MDT places it on the map. The mechanic it carries is described on the
boss's entry, and on the [Gravitic Orb](#/d/voidscar-arena/mob/255001)'s.
