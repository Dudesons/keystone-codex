---
npcId: 247755
name: "Lightspawn Lasher"   # auto
count: 0   # auto — forces per unit

# Sprouted by Ziekket's Awaken the Lightbloom, and worth no forces.
threat:
role: add

spells:
  - id: 1253320
    name: "Vicious Regrowth"   # auto
    # Instant
    tag: ignore
    prio: 1
    note: "A reawakened lasher gains +30% haste and damage and becomes immune to interrupts and crowd control. There is no answer to it but damage."
  - id: 1247669
    name: "Lightspore Shot"   # auto
    # 2.5 sec cast · 50 yd range
    tag: kick
    prio: 1
    note: "58k Holy. Interruptible only while the lasher is on its first life — Vicious Regrowth takes that away."
  - id: 1246527
    name: "Awaken the Lightbloom"   # auto
    # Instant · Unlimited range
    tag: ignore
    note: "Ziekket's cast that sprouts them and revives the dormant ones."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Kill them before Ziekket reawakens them. A reawakened lasher cannot be kicked or controlled at all — the interrupt only works once."
---

[Ziekket](#/d/the-blinding-vale/map/mob/247676)'s adds, and the reason his cast timer matters.

On their first life they are ordinary: **Lightspore Shot** is a modest cast and it can be
interrupted. **Awaken the Lightbloom** revives the dormant ones with **Vicious Regrowth**, and
that changes them completely — 30% more haste and damage, and immunity to both interrupts and
crowd control.

So the window is narrow and one-way. Either they die before the reawakening, or they are
handled with raw damage for the rest of the fight. Ziekket's **Concentrated Lightbeam** offers
the other route: it liquifies dormant lashers outright, at the cost of leaving Lightsap where
they were.
