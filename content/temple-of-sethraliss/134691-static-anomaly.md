---
npcId: 134691
name: "Static Anomaly"   # auto
count: 5   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 264763
    name: "Spark Step"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "Zaps to a player's location, hitting everyone within 5 yd for 78k. It teleports — the tank cannot hold it in place."
  - id: 1310693
    name: "Static Shocks"   # auto
    # Instant · Unlimited range
    tag: tank
    note: "Extra Nature damage on its melee swings."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Spark Step teleports it onto a player. It does not stay tanked — spread so its arrival only catches one person."
---

Six units at 5 forces each. **Spark Step** is the whole card: it teleports to a chosen player
and hits everything within 5 yards for 78k.

Because it relocates itself, tanking it does not keep it away from the group — spreading does.
Only **Taunt** applies, so there is no controlling it either.
