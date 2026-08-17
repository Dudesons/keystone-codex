---
npcId: 236073
name: "Row Hooligan"   # auto
count: 3   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1216300
    name: "Cutpurse"   # auto
    # dispel: bleed
    tag: dispel
    prio: 1
    note: "Leaps to a player for 39k, then 155k of bleed over 8 seconds. The bleed is four times the hit — clear it."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Cutpurse looks like a small hit and is mostly a bleed. Twelve hooligans means twelve of them running at once."
---

Twelve units at 3 forces each. **Cutpurse** leaps onto a player, deals 39k, and then bleeds
them for 155k over eight seconds — so the number in the combat log at the moment of impact is
about a fifth of what the ability costs.

It is a **bleed**, which Murder Row hands out from four different mobs, so a group without a
bleed answer will notice.
