---
npcId: 252529
name: "Bribed Captain"   # auto
count: 35   # auto — forces per unit

threat: medium
role: miniboss

spells:
  - id: 1256276
    name: "Deep Corruption"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "+25% damage dealt and -25% area damage taken, for every nearby ally. MDT records no dispel type, so it cannot be stripped — kill the Captain to end it."
  - id: 1216529
    name: "Shield Bash"   # auto
    # 3 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "+20% Physical damage taken for 20 sec. The tooltip figure is unscaled."
  - id: 1295035
    name: "Glaive Toss"   # auto
    # 2 sec cast · 60 yd range
    tag: dispel
    prio: 2
    note: "A bouncing glaive leaving a bleed. Tooltip figures unscaled."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Deep Corruption makes the whole pack hit 25% harder and take 25% less area damage — and it cannot be dispelled. Focus the Captain first."
---

A single unit worth 35 forces, and the pack it stands in is measurably harder while it lives.

**Deep Corruption** works in both directions: nearby allies deal 25% more damage *and* take 25%
less area damage. The second half is the one that decides pull length, since Murder Row groups
clear packs with area damage. And MDT gives it **no dispel type**, so there is no shortcut —
the Captain has to die.

Its other two abilities are the [Bribed Guard's](#/d/murder-row/codex/mob/236071), and both carry
unscaled tooltip figures.
