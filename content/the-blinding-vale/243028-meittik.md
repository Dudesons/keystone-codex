---
npcId: 243028
name: "Meittik"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 1253028
    name: "Thicket's Trinity"   # auto
    # Instant
    tag: ignore
    prio: 1
    note: "Meittik, Lekshi and Kezkitt share all damage taken. Focus does nothing here — target whichever is convenient."
  - id: 1234753
    name: "Bedrock Slam"   # auto
    # 3 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "194k Nature and 485k Physical on the tank, and the impact breaks the ground into Fertile Loam."
  - id: 1234773
    name: "Bedrock Slam"   # auto
    # Instant · 100 yd range
    tag: tank
  - id: 1234802
    name: "Fertile Loam"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "77k every second and a 50% slow. It is also the soil Lekshi dashes between — where it lands shapes the whole fight."
  - id: 1276586
    name: "Bedrock Surge"   # auto
    # Instant · 100 yd range
    tag: dodge
    note: "The aftershock of every Bedrock Slam: 39k to everyone every second for 8 sec."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "The Fertile Loam that Bedrock Slam creates is not just a puddle — it is the ground Lekshi dashes between. Where the tank takes the buster decides where the dashes go."
---

One third of the **Lightblossom Trinity**, alongside
[Kezkitt](#/d/the-blinding-vale/codex/mob/243029) and [Lekshi](#/d/the-blinding-vale/codex/mob/243030).
**Thicket's Trinity** makes all three share damage taken, so there is no priority target and
no split to manage — whatever is hit, all three take it.

Meittik is the one that shapes the floor. **Bedrock Slam** is a large tank hit, but its lasting
effect is **Fertile Loam**: slowing patches that Lekshi then uses as waypoints for
**Lightsower Dash**. The tank's positioning during the buster is therefore a decision about
where the other two bosses will be operating.
