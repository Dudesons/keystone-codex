---
npcId: 245752
name: "Keen-Eyed Striker"   # auto
count: 7   # auto — forces per unit

threat: low
role: patrol

spells:
  - id: 1239394
    name: "Scavenge"   # auto
    # 3 sec cast
    tag: kick
    prio: 1
    note: "It flies off to steal a berry bush. Interrupting it keeps the bird in the fight rather than wandering — Method rates this the ability to stop."
  - id: 110960
    name: "Greater Invisibility"   # auto
    tag: ignore
    note: "Invisible and untargetable for 20 sec, threat wiped. Any action it takes cancels it."
  - id: 1238439
    name: "Razor Dive"   # auto
    # dispel: bleed · Instant · 50 yd range
    tag: dispel
    note: "34k a second for 10 sec, stacking. A bleed."
  - id: 1238440
    name: "Razor Dive"   # auto
    # Instant · 50 yd range
    tag: dispel

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Two units, distinguished from the
[common Keen-Eyed Striker](#/d/den-of-nalorakk/codex/mob/241816) by two abilities the others do not
have: **Greater Invisibility** and **Scavenge**.

Neither is dangerous. Together they describe a bird that disappears, reappears and flies off
after food — which makes it a nuisance for pull planning rather than a threat to survive.
Interrupting Scavenge keeps it where the group put it.
