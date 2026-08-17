---
npcId: 240289
name: "Nauseous Patron"   # auto
count: 0   # auto — forces per unit

# A customer in the Illicit Rain sequence. Worth no forces.
threat:
role: add

spells:
  - id: 1216076
    name: "Nauseous"   # auto
    # Instant
    tag: ignore
    note: "\"This patron's stomach is in upheaval.\" The state that produces a mess for the Cleaner role."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Part of the [Illicit Rain](#/d/murder-row/mob/263940) sequence: a patron about to make work for
whoever took the **Cleaner** role.

Nothing hostile, nothing to react to. The resulting mess is
[Selenar Sunshy](#/d/murder-row/mob/235841)'s **Spill Zone**, which does slow anyone standing
in it.
