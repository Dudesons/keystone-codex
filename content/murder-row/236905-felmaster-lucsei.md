---
npcId: 236905
name: "Felmaster Lucsei"   # auto
count: 30   # auto — forces per unit

threat: medium
role:
rank: miniboss

spells:
  - id: 1302007
    name: "Blade Dance"   # auto
    # Channeled (1.2 sec cast)
    tag: dodge
    prio: 1
    note: "Strikes all players every 0.4 sec for 1.2 sec at 48k a hit. Short, unavoidable, and Method rates it the important one."
  - id: 1302010
    name: "Blade Dance"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1216954
    name: "Eye Beam"   # auto
    # 2.5 sec cast · Unlimited range
    tag: dodge
    prio: 1
    note: "A frontal at unlimited range. Distance is no protection — the arc is."
  - id: 1216955
    name: "Eye Beam"   # auto
    # Instant
    tag: dodge
  - id: 1217930
    name: "Imprison"   # auto
    # dispel: magic · 2 sec cast · 20 yd range
    tag: dispel
    note: "His leash on the felhunters — the tooltip describes imprisoning *the demon*, not a player."
  - id: 1217937
    name: "Release Demon"   # auto
    tag: dodge
    prio: 2
    note: "MDT carries no tooltip text. The name suggests it lets a Trained Felhunter loose; that is inference, not data."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Eye Beam is a frontal with unlimited range. Backing off does nothing — get out of the cone."
---

A single unit worth 30 forces, and Method marks him Tough.

**Eye Beam** is the ability to respect, and the reason is in its range: unlimited, in a cone.
Ranged players who assume distance keeps them safe are exactly the ones it hits.

**Blade Dance** is three strikes across 1.2 seconds hitting everyone — brief enough that it is
healed rather than avoided.

Two of his spells are about the [Trained Felhunters](#/d/murder-row/codex/mob/235261) rather than the
group: **Imprison** keeps them leashed, and **Release Demon** carries no tooltip text at all,
so what it does is not established here.
