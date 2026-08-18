---
npcId: 135761
name: "Disruption Totem"   # auto
count: 0   # auto — forces per unit

# One of Zanazal's three totems, and worth no forces.
threat:
role: add

spells:
  - id: 267257
    name: "Disruption"   # auto
    # 8 sec cast
    tag: dodge
    prio: 1
    note: "Interrupts every player for 4 seconds. No damage — but a locked-out group cannot kick Poison Nova, which is the Council's only interruptible cast."
  - id: 1309499
    name: "Reinforced"   # auto
    tag: ignore
    note: "MDT carries no tooltip text for it. All three of Zanazal's totems have it."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It deals no damage, so it gets left alive — and then the group is silenced through the one cast in the fight that had to be interrupted."
---

Zero damage, 0.3 million health, and the totem most likely to be ignored.

**Disruption** locks the entire group out of casting for four seconds. Nothing in the combat
log looks urgent, which is why it survives — and its cost is paid indirectly, when
[Zanazal](#/d/kings-rest/map/mob/269810)'s **Poison Nova** goes off unkicked because nobody could
interrupt.

It cannot be crowd controlled.
