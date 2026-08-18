---
npcId: 270417
name: "Uncoiled Writhe"   # auto
count: 0   # auto — forces per unit

threat: low
role: add

spells:
  - id: 1305393
    name: "Undermining"   # auto
    # Instant
    tag: dodge
    note: "On its death it destabilises the ground and knocks back anyone above it."
  - id: 1300618
    name: "Assimilation"   # auto
    tag: ignore
  - id: 1300698
    name: "Assimilation"   # auto
    tag: ignore

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

A second, stripped-down Uncoiled Writhe: it reassembles and knocks back on death, but carries
neither Toxic Atrophy nor the fixate. The one that matters is
[npc 262398](#/d/altar-of-fangs/codex/mob/262398).
