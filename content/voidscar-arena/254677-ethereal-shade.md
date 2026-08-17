---
npcId: 254677
name: "Ethereal Shade"   # auto
count: 0   # auto — forces per unit

# Summoned by Taz'Rah's Ethereal Shades, and worth no forces.
threat:
role: add

spells:
  - id: 1296963
    name: "Umbral Rupture"   # auto
    # 4 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "291k within 10 yd. Each Shade opens its own rift, so the number of circles to avoid is the number of Shades alive."
  - id: 1222100
    name: "Nether Dash"   # auto
    # 7 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "Dashes through its target for 116k plus 29k a second for 15 seconds. Method reads it as a frontal — clear the line."
  - id: 1222103
    name: "Nether Dash"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 1222105
    name: "Nether Dash"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Every Shade left alive is another Umbral Rupture opening at the same time. They are a count, not a distraction."
---

[Taz'Rah](#/d/voidscar-arena/mob/238887)'s adds, with 0.8 million health each.

They matter because they **share the boss's cast**: Umbral Rupture is on Taz'Rah's card and on
this one, so every Shade standing means another 291k circle opening simultaneously. Killing
them is not optional tidying — it is what keeps the number of things to dodge at a manageable
level.

**Nether Dash** adds a 15-second burn to anyone caught in the line on the way through.
