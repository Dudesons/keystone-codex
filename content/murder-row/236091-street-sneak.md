---
npcId: 236091
name: "Street Sneak"   # auto
count: 3   # auto — forces per unit

threat: medium
role: patrol

spells:
  - id: 1216590
    name: "Heartstop Poison"   # auto
    # dispel: poison · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "Every strike poisons for 194k over 8 sec and takes 5% of maximum health, stacking. A poison — dispel it before the stacks matter."
  - id: 1216589
    name: "Heartstop Poison"   # auto
    # 1.5 sec cast
    tag: dispel
  - id: 1216284
    name: "Stealth"   # auto
    # Instant
    tag: ignore
    note: "It opens from stealth. Worth knowing when planning a pull, not something to react to."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Heartstop Poison takes maximum health, not current. The healer's bars look fine while the ceiling drops 5% a stack."
---

Six units at 3 forces each, and they open from **Stealth** — so they are easy to pull by
accident and easy to leave behind.

**Heartstop Poison** coats its weapons for eight seconds, and every strike in that window
applies 194k of poison damage *and removes 5% of maximum health*, stacking. The maximum-health
component is the dangerous half, because nothing on screen indicates it beyond the debuff
itself.

[Zaen Bladesorrow](#/d/murder-row/mob/234649) uses the same poison, at 30% per application.
