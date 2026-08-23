---
npcId: 249756
name: "Potatoad Matriarch"   # auto
count: 30   # auto — forces per unit

threat: medium
role:
rank: miniboss

spells:
  - id: 1250937
    name: "Toxic Spew"   # auto
    # dispel: poison · 2 sec cast · 60 yd range
    tag: dispel
    prio: 1
    note: "136k to everyone, then 58k every 1.5 sec for 9 sec. A poison — one of the few things in the Vale a standard dispel actually answers."
  - id: 1250100
    name: "Tongue Toss"   # auto
    # 2 sec cast · 40 yd range
    tag: tank
    prio: 1
    note: "291k and it throws the target up and over. The displacement is the problem, not the number."
  - id: 1250199
    name: "Toadspawn"   # auto
    # 3 sec cast
    tag: dodge
    prio: 2
    note: "Lays eggs that hatch into Newborn Potadpoles. Break the eggs before they hatch and the adds never exist."
  - id: 1250200
    name: "Toadspawn"   # auto
    # Instant · 20 yd range
    tag: dodge
  - id: 1250813
    name: "Hatch"   # auto
    # Instant · Unlimited range
    tag: dodge
    note: "The egg becoming a Potadpole. A ten-second window to prevent it."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Kill the eggs, not the tadpoles. Hatch takes ten seconds — that is the whole window, and it is more than enough."
---

A single unit worth 30 forces, and the one mob in the Vale that hands the group a timer it can
actually beat.

**Toadspawn** lays **Potadpole Eggs**, and each egg spends **ten seconds** casting *Hatch*
before it becomes a [Newborn Potadpole](#/d/the-blinding-vale/codex/mob/250202). Ten seconds is a
long time. Cleaving the eggs down costs almost nothing; letting them through means fighting
the adds and their knockbacks on top of everything else.

**Toxic Spew** is a genuine poison dispel — worth noticing in a dungeon where most of the
debuffs are bleeds instead.
