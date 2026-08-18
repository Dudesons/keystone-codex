---
npcId: 261556
name: "Hatchling"   # auto
count: 0   # auto — forces per unit

threat: low
role: add

spells:
  - id: 1306383
    name: "Nascent Hunger"   # auto
    # Channeled
    tag: dodge
    note: "Fixates on a random player. It does not swap, so it has to be killed or outrun."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Worth zero forces: it comes out of [Infused Eggs](#/d/altar-of-fangs/map/mob/264798) rather than
being pulled, so killing it advances nothing but the fixated player's survival.
