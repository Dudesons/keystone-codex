---
npcId: 247676
name: "Ziekket"   # auto
isBoss: true   # auto
count: 30   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: caster

spells:
  - id: 1246858
    name: "Lightbloom's Essence"   # auto
    # 2 sec cast
    tag: soak
    prio: 1
    note: "Orbs drift toward him. Touched by a player they burst and grant Lightbloom's Might; allowed to reach him they trigger Fluorescent Outburst. Intercept every one."
  - id: 1247039
    name: "Fluorescent Outburst"   # auto
    # Instant · 300 yd range
    tag: soak
    prio: 1
    note: "What an orb that got through costs: 97k to everyone, and a Fluorescent Shield for him."
  - id: 1247050
    name: "Fluorescent Shield"   # auto
    # Instant
    tag: soak
    prio: 1
    note: "100k absorb and +10% damage done, stacking. Every missed orb makes the rest of the fight longer and harder."
  - id: 1247685
    name: "Thornspike"   # auto
    # 3 sec cast · Unlimited range
    tag: tank
    prio: 1
    note: "194k and a knockback, then 58k every second for 10 sec."
  - id: 1247746
    name: "Thornspike"   # auto
    # dispel: bleed · Instant · Unlimited range
    tag: dispel
    prio: 1
    note: "The bleed half — dispellable, but as a bleed rather than magic."
  - id: 1246607
    name: "Concentrated Lightbeam"   # auto
    # 5 sec cast · 300 yd range
    tag: dodge
    prio: 1
    note: "48k every half-second in the beam. It also liquifies any Dormant Lightspawn Lasher it crosses — the beam is a tool as well as a hazard."
  - id: 1246751
    name: "Concentrated Lightbeam"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 1246753
    name: "Lightsap"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 2
    note: "155k every 2 sec and a 40% slow. What a liquified Lasher leaves behind — so where the beam crosses them matters."
  - id: 1246372
    name: "Awaken the Lightbloom"   # auto
    # 3 sec cast
    tag: dodge
    prio: 2
    note: "Sprouts Lightspawn Lashers and revives dormant ones with Vicious Regrowth, which makes them immune to interrupts and CC."
  - id: 1246527
    name: "Awaken the Lightbloom"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 1247377
    name: "Oozing Xylem"   # auto
    # Instant · 300 yd range
    tag: dodge
    note: "58k to everyone every 3 sec, for the whole fight. The baseline the healer plans around."
  - id: 1247644
    name: "Oozing Xylem"   # auto
    # Instant · 150 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Every orb that reaches Ziekket gives him a stacking shield and +10% damage. Intercepting them is not optional extra credit — it is the enrage timer."
---

A fight with an explicit cost for sloppiness, and it is easy to read.

**Lightbloom's Essence** sends orbs drifting toward Ziekket. A player who touches one bursts
it and gains **Lightbloom's Might**. One that arrives gives him **Fluorescent Outburst** — 97k
to the group — and a **Fluorescent Shield**: 100k of absorb and **+10% damage done, stacking**.
Nothing removes those stacks. Miss orbs early and the boss is hitting harder for the rest of
the fight while taking longer to kill.

**Concentrated Lightbeam** is the fight's one piece of nuance in the group's favour: it
liquifies any dormant [Lightspawn Lasher](#/d/the-blinding-vale/mob/247755) it crosses. That
removes an add — but leaves **Lightsap** on the floor at 155k every 2 seconds, so it is a
trade, not a free win.

Note that **Vicious Regrowth** makes reawakened Lashers immune to interrupts *and* crowd
control, so the answer to them is damage, not kicks.
