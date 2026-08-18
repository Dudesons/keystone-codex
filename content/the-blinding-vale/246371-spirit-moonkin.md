---
npcId: 246371
name: "Spirit Moonkin"   # auto
count: 0   # auto — forces per unit

# One of the spirits Lightwarden Ruia calls, and worth no forces.
threat:
role: add

spells:
  - id: 1239824
    name: "Lightfire"   # auto
    # 2 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "53k per second for 6 sec, and Lightfire Beams sprout where the target stands when it expires."
  - id: 1239825
    name: "Lightfire"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1240100
    name: "Lightfall"   # auto
    # 2 sec cast
    tag: dodge
    prio: 1
    note: "291k within 4 yd of each impact. Small radius, so it is watchable."
  - id: 1240152
    name: "Lightfall"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "A second source of Lightfire means a second set of silencing beams on the floor. Take them somewhere the group is not going to need."
---

Called by [Lightwarden Ruia](#/d/the-blinding-vale/map/mob/245912)'s **Spirits of the Vale**, and
carrying his moonkin-form abilities.

The cost is cumulative rather than immediate: every **Lightfire** leaves beams where its target
was standing, and those beams silence for 6 seconds. With Ruia casting it as well, the arena
fills up with silence zones faster than the group expects — which is why the carrier's choice
of where to stand matters more here than the damage does.
