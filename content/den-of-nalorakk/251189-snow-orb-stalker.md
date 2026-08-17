---
npcId: 251189
name: "Snow Orb Stalker"   # auto
count: 0   # auto — forces per unit

# A scripting unit, not something to fight. Worth no forces.
threat:
role: add

spells:
  - id: 1253083
    name: "Create Bonfire"   # auto
    tag: ignore
    note: "MDT lists it with no tooltip text. Nothing can be said about it from the data."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

A stalker: one of the invisible units the encounter scripting attaches effects to, rather than
a mob anyone fights. MDT places it, so the codex has a card for it.

Its single spell carries no tooltip text in the data, so there is nothing honest to say about
what it does beyond its name.
