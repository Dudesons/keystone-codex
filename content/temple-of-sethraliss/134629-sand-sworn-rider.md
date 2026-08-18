---
npcId: 134629
name: "Sand-Sworn Rider"   # auto
count: 25   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 272655
    name: "Scouring Sand"   # auto
    # 4.5 sec cast · 20 yd range
    tag: dodge
    prio: 1
    note: "291k in a frontal cone and a 4-second disorient. The disorient is what turns one mistake into three."
  - id: 1292990
    name: "Swarming Krolusks"   # auto
    tag: dodge
    prio: 1
    note: "Summons Krolusk kin. Method rates this the important one — more bodies on a pull that is already 25 forces a head."
  - id: 1291399
    name: "Serrated Charge"   # auto
    # Instant · 60 yd range
    tag: dispel
    prio: 2
    note: "Charges a player for 58k plus 39k a second for 6 sec. Method reads the bleed as Stoneform-clearable."
  - id: 262046
    name: "Melee"   # auto
    # Instant · 8 yd range
    tag: tank
    note: "Its auto-attack, listed by MDT as a spell."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Scouring Sand disorients for four seconds. Disoriented players do not dodge the next one — the cones chain if the group is stacked in front."
---

Four units at 25 forces each. Unlike the Stonefist beside it, this one takes the **full CC
list** — Stun, Silence, Fear, Root, Slow, Disorient — so it can be removed from a pull rather
than fought.

**Scouring Sand** is a 4.5-second frontal for 291k plus a **4-second disorient**, and the
disorient is the dangerous half: a disoriented player cannot walk out of the next one.

**Swarming Krolusks** adds bodies. The [Dutiful Tamer](#/d/temple-of-sethraliss/map/mob/139422)
casts the same summon.
