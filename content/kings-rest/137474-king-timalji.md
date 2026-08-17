---
npcId: 137474
name: "King Timalji"   # auto
count: 25   # auto — forces per unit

threat: lethal
role: miniboss

spells:
  - id: 1297326
    name: "Eternal Bond"   # auto
    # Instant
    tag: ignore
    prio: 1
    note: "He and Queen Wasi share health. Focusing one is pointless — but so is worrying about splitting damage."
  - id: 270927
    name: "Bladestorm"   # auto
    # 2.5 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "165k every half-second to anyone near it, while moving toward a player. Running from it is the whole answer; standing and trading is not."
  - id: 270928
    name: "Bladestorm"   # auto
    # Instant
    tag: dodge
  - id: 1306056
    name: "Erupting Slam"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 2
    note: "175k within 8 yd of the impact."
  - id: 1306049
    name: "Erupting Slam"   # auto
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Bladestorm chases a player rather than spinning in place. Whoever it picked has to keep moving, and everyone else has to give them room."
---

One of the royal pair, worth 25 forces, bonded to
[Queen Wasi](#/d/kings-rest/mob/137478) by **Eternal Bond** — they share a health pool, so
there is no priority target and no split to manage.

He is the melee half. **Bladestorm** is 165k every half-second and it **travels**, so the
group's instinct to sidestep once is not enough. **Erupting Slam** is a straightforward
ground circle.

Wasi handles the casting, which is where the interrupts go.
