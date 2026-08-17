---
npcId: 136160
name: "King Dazar"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 1303267
    name: "Gilded Destruction"   # auto
    # 6 sec cast · 200 yd range
    tag: dodge
    prio: 1
    note: "155k to everyone plus 24k a second for 15 sec, and it empowers him afterwards. Six seconds of cast — the fight's big moment."
  - id: 1303372
    name: "Searing Gold"   # auto
    # Instant
    tag: tank
    prio: 1
    note: "What the empowerment does: his melee swings throw a wave of gold in front of him. The tank is no longer the only one at risk from auto-attacks."
  - id: 1303374
    name: "Searing Gold"   # auto
    # Instant · 25 yd range
    tag: tank
    note: "97k to everything in front of him."
  - id: 268586
    name: "Blade Combo"   # auto
    # 1.5 sec cast
    tag: tank
    prio: 1
    note: "A chain of strikes with increasing damage on the target. It is the ramp that kills tanks, not the opening hit."
  - id: 268587
    name: "Blade Combo"   # auto
    # Instant · Unlimited range
    tag: tank
  - id: 268589
    name: "Blade Combo"   # auto
    # Instant · Unlimited range
    tag: tank
  - id: 268590
    name: "Blade Combo"   # auto
    # Instant · Unlimited range
    tag: tank
  - id: 268591
    name: "Blade Combo"   # auto
    # Instant · Unlimited range
    tag: tank
  - id: 269503
    name: "Blade Combo"   # auto
    # Instant · Unlimited range
    tag: tank
  - id: 1303105
    name: "Aerial Smash"   # auto
    # 4 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "Leaps at players for 175k within 8 yd of impact."
  - id: 1303115
    name: "Aerial Smash"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1303111
    name: "Aerial Smash"   # auto
    tag: dodge
  - id: 1302945
    name: "Impaling Spear"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 2
    note: "Spears from the ceiling: 145k within 7 yd and a 5-second bleed. They keep coming throughout — background hazard, not an event."
  - id: 1303396
    name: "Liquid Gold"   # auto
    # Instant · 100 yd range
    tag: dodge
    note: "Gold dripping from T'zala for 12 sec. The tooltip figure is unscaled and not quoted."
  - id: 1303399
    name: "Liquid Gold"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Gilded Destruction is not just party damage — it empowers his melee into Searing Gold, a frontal wave on every swing. The fight changes shape after it lands."
---

The last fight in King's Rest, fought alongside his mount
[T'zala](#/d/kings-rest/mob/136976), and it has two states.

Before **Gilded Destruction**, the tank handles **Blade Combo** — a chain of strikes with
increasing damage, so the danger is at the end of the sequence rather than the start — while
the group avoids **Aerial Smash** and the **Impaling Spears** falling continuously from the
ceiling.

After it, he is empowered, and **Searing Gold** turns every auto-attack into a frontal wave for
97k. Standing in front of him stops being a tank-only concern.

MDT lists **Taunt** as the only crowd control that applies.
