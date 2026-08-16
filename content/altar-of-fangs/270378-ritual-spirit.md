---
npcId: 270378
name: "Ritual Spirit"   # auto
count: 0   # auto — forces per unit

# TO FILL IN: low | medium | high | lethal
threat:
role: caster

spells:
  - id: 1306657
    name: "Blood Sacrifice"   # auto
    # 2 sec cast
    tag: kick
    prio: 1
    note: "87k Physical and absorbs the next 180k of healing — the same cast the Ritual Chieftain uses."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

The spirit [the Ritual Chieftain](#/d/altar-of-fangs/mob/270306) invokes. Worth no forces, but
it carries the healing absorb that makes the chieftain's Dismember lethal, so it is the same
problem arriving on a second body.
