---
npcId: 234984
name: "Silvermoon Patron"   # auto
count: 0   # auto — forces per unit

# A customer in the Illicit Rain sequence. Worth no forces.
threat:
role: add

spells:
  - id: 1214487
    name: "Awaiting Service"   # auto
    # Instant
    tag: ignore
    note: "Waiting for their order. The state that starts the timer."
  - id: 1214260
    name: "Elated!"   # auto
    # Instant
    tag: ignore
    note: "Satisfied with their service. The state to reach."
  - id: 44427
    name: "Enrage"   # auto
    # Instant
    tag: ignore
    note: "Become furious — what happens when the order does not arrive."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Serve them before Awaiting Service turns into Enrage. This is a timer, not a fight."
---

A customer in the [Illicit Rain](#/d/murder-row/mob/263940) sequence, and its three spells are
its three moods: **Awaiting Service** → **Elated!** if served in time, **Enrage** if not.

No damage, no cast to interrupt. The card exists because MDT places the patron on the map, and
because knowing that these are a timer rather than a pull is worth a sentence.
