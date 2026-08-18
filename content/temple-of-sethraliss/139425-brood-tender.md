---
npcId: 139425
name: "Brood Tender"   # auto
count: 7   # auto — forces per unit

threat: low
role: caster

spells:
  - id: 1310683
    name: "Venom Bolt"   # auto
    # 2.5 sec cast · Unlimited range
    tag: kick
    prio: 1
    note: "116k on one player. Its only cast, and it takes the full CC list besides."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Three units at 7 forces each, with a single interruptible bolt. Functionally the
[Storm Adept](#/d/temple-of-sethraliss/map/mob/134990) with a different damage school.

Stun, Incapacitate, Silence, Fear, Root, Slow and Disorient all apply, so an interrupt is only
one of several ways to handle it.
