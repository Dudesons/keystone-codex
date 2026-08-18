---
npcId: 249608
name: "Raging Raptor"   # auto
count: 5   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1249661
    name: "Feral Rage"   # auto
    # dispel: enrage · 1 sec cast · 30 yd range
    tag: dispel
    prio: 1
    note: "+20% melee haste to every ally within 30 yd. Its only ability — so this mob is a buff on legs."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It does nothing but enrage its neighbours. Soothe it and there is nothing left."
---

One unit at 5 forces with a single ability, and that ability is
[the dungeon's shared enrage](#/d/voidscar-arena/codex/mob/243988).

There is nothing else here: no cast to interrupt, no ground to avoid, no debuff to clear. A
soothe removes its entire contribution to the fight.
