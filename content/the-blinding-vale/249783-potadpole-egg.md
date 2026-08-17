---
npcId: 249783
name: "Potadpole Egg"   # auto
count: 0   # auto — forces per unit

# Laid by the Potatoad Matriarch's Toadspawn, and worth no forces.
threat:
role: add

spells:
  - id: 1250203
    name: "Hatch"   # auto
    # 10 sec cast
    tag: dodge
    prio: 1
    note: "Ten seconds before it becomes a Newborn Potadpole. That is the entire window, and it is generous."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Ten seconds of cast, and the add never exists. Break the eggs."
---

The cheapest problem in the Vale to solve, and the easiest to walk past.

**Hatch** takes ten seconds. An egg broken inside that window costs the group a few globals of
incidental cleave; an egg left alone becomes a
[Newborn Potadpole](#/d/the-blinding-vale/mob/250202) with a knockback. There is no mechanic
here beyond noticing.
