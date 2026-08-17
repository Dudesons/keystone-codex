---
npcId: 190205
name: "Scorchling"   # auto
count: 0   # auto — forces per unit

# Summoned by the Blazebound Destroyer, and worth no forces.
threat:
role: add

spells:
  - id: 1307372
    name: "Fiery Demise"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "It becomes a fire pool where it dies, ticking 97k per second. Where it dies is the only thing worth controlling."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Killing it costs floor space. Pull them out of the group before finishing them."
---

The Blazebound Destroyer's spawn, worth no forces and holding 0.6 million health — it dies to
incidental cleave.

That is exactly the problem: it dies wherever it happens to be standing, and leaves a
97k-per-second pool there. On a fight already fought around Burnout and Scorched Earth, the
floor runs out faster than the health bars do.
