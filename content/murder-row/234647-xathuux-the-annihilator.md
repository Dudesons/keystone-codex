---
npcId: 234647
name: "Xathuux the Annihilator"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 473898
    name: "Legion Strike"   # auto
    # 3 sec cast · 30 yd range
    tag: tank
    prio: 1
    note: "533k and -80% healing received for 8 seconds. The healing cut is what kills the tank, not the hit."
  - id: 474197
    name: "Demonic Rage"   # auto
    # 4 sec cast · 100 yd range
    tag: soak
    prio: 1
    note: "145k to everyone, then +75% attack speed — and he takes 30% more damage while it lasts. It is his burn window as much as his enrage."
  - id: 1214641
    name: "Axe Toss"   # auto
    # 3 sec cast · 200 yd range
    tag: dodge
    prio: 1
    note: "388k and it interrupts everyone within 10 yards of the impact. Being caught by it costs a cast as well as health."
  - id: 1214637
    name: "Axe Toss"   # auto
    # Instant
    tag: dodge
    note: "The other form: 175k within 60 yd, and the axe stays on the ground afterwards."
  - id: 1214647
    name: "Axe Toss"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 1214663
    name: "Axe Toss"   # auto
    # Instant · 60 yd range
    tag: dodge
  - id: 1295453
    name: "Infernal Crush"   # auto
    # 3 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "97k under each targeted player plus a burn. Move off the marker."
  - id: 1295455
    name: "Infernal Crush"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 474231
    name: "Burning Steps"   # auto
    # Instant
    tag: dodge
    prio: 2
    note: "107k a second on the ground he walks over. Where he is tanked shapes the rest of the fight."
  - id: 474234
    name: "Burning Steps"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Legion Strike cuts healing by 80% for eight seconds. Anything landing inside that window lands on a tank who cannot be healed — that is the sequence to plan for."
---

A fight whose danger is in its overlaps rather than in any single number.

**Legion Strike** is 533k and **-80% healing received for eight seconds**. On its own the tank
survives it comfortably; what matters is what else arrives during those eight seconds, because
none of it can be healed through.

**Demonic Rage** cuts both ways and is worth reading carefully: he gains 75% attack speed, and
he **takes 30% more damage** while it is up. It is an enrage the group should want.

**Axe Toss** leaves his axe on the ground — tracked separately as
[Legion Axe](#/d/murder-row/map/mob/235520) — and its 200-yard variant interrupts everyone near the
impact. **Burning Steps** means where he is tanked is a running decision.
