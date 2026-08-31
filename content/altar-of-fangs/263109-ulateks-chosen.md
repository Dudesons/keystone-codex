---
npcId: 263109
name: "Ula'tek's Chosen"   # auto
count: 25   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1307567
    name: "Mass Envenom"   # auto
    # 3.5 sec cast · 60 yd range
    tag: kick
    prio: 1
    note: "The cast that makes this mob matter. 58k Nature on impact, then 24k every second for 8 sec."

  - id: 1289416
    name: "Envenom"   # auto
    # 3 sec cast · 60 yd range · dispel: poison
    tag: kick
    prio: 2
    note: "Same damage as Mass Envenom on a single target, and dispellable if it lands."

  - id: 1306852
    name: "Toxic Surge"   # auto
    # 2 sec cast · Unlimited range
    tag: frontal
    note: "Frontal. Triggers Toxic Beam, which hits anyone caught for 339k Nature."

  - id: 1306853
    name: "Toxic Surge"   # auto
    # Instant · Unlimited range
    tag: dodge

  - id: 1306856
    name: "Toxic Beam"   # auto
    # Instant · Unlimited range
    tag: dodge
    note: "The damage Toxic Surge delivers, not a separate cast to watch for."

  - id: 1307571
    name: "Envenom"   # auto
    # Instant · 60 yd range · dispel: poison
    tag: dispel

  - id: 1292892
    name: "Control Venom"   # auto
    # Channeled (7 days cast)
    tag: ignore
    note: "A permanent channel, flavour rather than a mechanic."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It almost never comes alone: three of its four packs bring Living Venoms with it. Kick Mass Envenom while the adds are still up, or the poison stacks on a group that is already spread out."
---

The caster that decides how a pull goes, at 25 forces per unit for only four units in the
whole dungeon.

**Mass Envenom** is the reason. It is the cast worth a kick over anything else here, and it
comes while [Living Venom](#/d/altar-of-fangs/codex/mob/263112) adds are alive — packs 34, 38 and
39 all pair the two. Pack 43 is the exception: there it stands with the Ritual Chieftain and
Blades of the Altar instead, which changes what your interrupts are competing for.

**Toxic Surge** is a frontal, and the 339k of Toxic Beam is by far the largest single number
in Altar of Fangs. Avoidable, but unforgiving of anyone who does not move.
