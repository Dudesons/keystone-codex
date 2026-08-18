---
npcId: 268358
name: "Ritual Snake"   # auto
count: 0   # auto — forces per unit

# TO FILL IN: low | medium | high | lethal
threat:
role: add

spells:
  - id: 1300885
    name: "Ritual of the Fang"   # auto
    # Channeled
    tag: dodge
    prio: 1
    note: "One of the heads beaming Zul'jan. Every beam that reaches him adds a stack of Fang Empowered."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Not trash: part of the [Zul'jan](#/d/altar-of-fangs/map/mob/259447) encounter. The snake heads
focus beams into him for 8 seconds, and Fang Empowered stacks at 116k Nature per second to
the whole group.
