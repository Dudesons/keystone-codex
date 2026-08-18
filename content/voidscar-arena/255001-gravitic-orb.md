---
npcId: 255001
name: "Gravitic Orb"   # auto
count: 0   # auto — forces per unit

# Summoned by Charonus, one per player, and worth no forces.
threat:
role: add

spells:
  - id: 1263983
    name: "Condensed Mass"   # auto
    # Channeled · Unlimited range
    tag: dodge
    prio: 1
    note: "10k a second and -2% movement speed per application, stacking, for as long as the orb lives. The slow is what eventually kills — it stops people leaving a singularity."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Every stack takes 2% movement speed. Left long enough, the orb slows its target too much to escape the singularity that would have destroyed it."
---

One per player during [Charonus](#/d/voidscar-arena/map/mob/239167), fixating and unkillable by
conventional means.

**Condensed Mass** is a slow disguised as a damage-over-time. Two percent per application
sounds trivial and compounds quickly, and the fight's other mechanics — singularities pulling
inward, cascades knocking outward — all require moving. The longer an orb survives, the harder
it becomes to do the thing that removes it.

The removal is on the boss's card rather than this one: bring the orb within 6 yards of an
**Unstable Singularity** and it is torn apart.
