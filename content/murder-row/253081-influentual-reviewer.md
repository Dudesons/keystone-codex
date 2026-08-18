---
npcId: 253081
name: "Influentual Reviewer"   # auto
count: 0   # auto — forces per unit

# Part of the Illicit Rain sequence. Worth no forces.
threat:
role: add

spells:
  - id: 1257877
    name: "Scathing Review"   # auto
    # 0.001 sec cast · 300 yd range
    tag: kick
    prio: 1
    note: "Interrupt it and the spell backfires, forcing them to leave. The interrupt is not damage prevention here — it is how the encounter is solved."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Kick the review. The tooltip says outright that an interrupted Scathing Review backfires and forces them out."
---

Part of the [Illicit Rain](#/d/murder-row/codex/mob/263940) sequence, and the only member of it whose
tooltip states its own solution.

**Scathing Review** is an attempt to write badly of the establishment, and *if the caster is
interrupted, the spell backfires and forces them to leave*. So the kick is the whole
interaction.

The listed cast time of 0.001 seconds is a data artefact rather than a real window; MDT flags
the spell interruptible regardless. (MDT's spelling of the name — *Influentual* — is kept here,
because the codex follows the extracted data.)
