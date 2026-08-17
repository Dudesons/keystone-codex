---
npcId: 246409
name: "Zul'jarra"   # auto
count: 0   # auto — forces per unit

# Nalorakk's target throughout his encounter, and worth no forces.
threat:
role: add

spells:
  - id: 1262253
    name: "Demoralizing Scream"   # auto
    # Instant · 300 yd range
    tag: soak
    prio: 1
    note: "What every undefended hit costs: 145k to everyone, ignoring armour, plus 10% damage taken for 30 sec, stacking. The stacks are the enrage timer of the fight."
  - id: 1261776
    name: "Defensive Stance"   # auto
    # Channeled (10.1 sec cast)
    tag: soak
    prio: 1
    note: "During Overwhelming Onslaught she raises a barrier: 80% less damage for anyone standing behind her. Get behind her."
  - id: 1243856
    name: "Defensive Stance"   # auto
    # Channeled
    tag: soak
  - id: 1270826
    name: "Defensive Stance"   # auto
    tag: soak
  - id: 1243018
    name: "Concussive Shock"   # auto
    # Instant · 100 yd range
    tag: soak
    note: "Nalorakk knocks her down, leaving her defenceless against the Echoes. This is what starts each Fury of the War God."
  - id: 1243078
    name: "Burden of War"   # auto
    # Instant
    tag: ignore
    note: "The Mantle increases her damage taken. Scripting for the encounter."
  - id: 1249186
    name: "Charge"   # auto
    # Instant · 100 yd range
    tag: ignore
    note: "She charges Nalorakk."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "She is not an enemy — she is the fight's health bar. Every Echo and every slam that gets through her costs the group a stacking 10% damage taken."
---

Not a mob to kill: Zul'jarra is who [Nalorakk](#/d/den-of-nalorakk/mob/246404) is attacking,
and protecting her is the encounter.

Two directions of dependence. **Demoralizing Scream** is her taking a hit the group failed to
intercept — 145k to everyone and a stacking +10% damage taken for 30 seconds, which is what
turns a long fight into a lost one. **Defensive Stance** is the reverse: during Overwhelming
Onslaught she shields anyone standing behind her for 80%.

So she is both the thing to defend and the cover to use, in alternation.
