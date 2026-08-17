---
npcId: 246367
name: "Spirit Bear"   # auto
count: 0   # auto — forces per unit

# One of the spirits Lightwarden Ruia calls, and worth no forces.
threat:
role: add

spells:
  - id: 1240210
    name: "Pulverizing Strikes"   # auto
    # 2.5 sec cast
    tag: dodge
    prio: 1
    note: "Ruia's frontal, cast by the spirit instead: 165k a wave, applying Pulverized."
  - id: 1240257
    name: "Pulverizing Strikes"   # auto
    # 1.9 sec cast · 100 yd range
    tag: dodge
  - id: 1257094
    name: "Pulverized"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "+100% damage from Pulverizing Strikes for 6 sec — and it does not care which source applied it."
  - id: 1241058
    name: "Grievous Thrash"   # auto
    # dispel: bleed · 2 sec cast · 100 yd range
    tag: dispel
    prio: 1
    note: "19k every second for 40 sec or until fully healed, stacking. A bleed, not magic."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "The spirit's Pulverizing Strikes stacks Pulverized with Ruia's own. Two sources, one multiplier — this is what makes Spirits of the Vale dangerous."
---

Called by [Lightwarden Ruia](#/d/the-blinding-vale/mob/245912)'s **Spirits of the Vale**, and
carrying his bear-form abilities.

It matters for one reason: **Pulverized** does not distinguish between the boss's frontal and
the spirit's. Two sources casting the same ability means the 100% multiplier lands more often,
and it is that overlap — not the spirit's own damage — that ends pulls.
