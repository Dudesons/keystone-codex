---
npcId: 245567
name: "Starvation Effigy"   # auto
count: 0   # auto — forces per unit

# Planted by the Spirit of Hunger, and worth no forces.
threat:
role: add

spells:
  - id: 1238801
    name: "Insatiable Hunger"   # auto
    # dispel: curse · 6 sec cast · 100 yd range
    tag: dispel
    prio: 1
    note: "-15% maximum health for 25 sec, stacking. A curse — the dispel most groups forget they are carrying. Six seconds of cast is plenty of warning."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It takes maximum health, not current. Nobody's health bar drops — the ceiling does, and the healer notices too late."
---

The totem the [Spirit of Hunger](#/d/den-of-nalorakk/codex/mob/245855) plants, with 0.6 million
health and one job.

**Insatiable Hunger** removes 15% of everyone's maximum health for 25 seconds, and it stacks.
The reason it is dangerous is that nothing visible happens: no damage is dealt, no health bar
moves, and the group simply becomes progressively easier to kill by everything else in the
pull.

Two answers, both cheap: kill the totem — it has very little health — or dispel it as a
**curse**.
