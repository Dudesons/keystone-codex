---
npcId: 236525
name: "Rowdy Patron"   # auto
count: 0   # auto — forces per unit

# A customer in the Illicit Rain sequence. Worth no forces.
threat:
role: add

spells:
  - id: 1213658
    name: "Unsatisfied Customer"   # auto
    # dispel: enrage · Instant
    tag: dispel
    prio: 1
    note: "Interruptible and flagged as an enrage — unusual for a role-play state. Belath's Bouncer role is the intended answer: punt them toward the exit."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "The Bouncer role is what removes them. MDT also records the state as interruptible and soothable, which is worth knowing if the punting is not working."
---

The troublemaker of the [Illicit Rain](#/d/murder-row/codex/mob/263940) sequence. Belath's
description is clear about the intended handling: *punt rowdy patrons towards the exit to force
them to leave*.

What is odd, and worth recording, is that MDT flags **Unsatisfied Customer** as both
**interruptible** and an **enrage** — mechanical hooks on what reads as pure role-play. Whether
either does anything in game is not something the data establishes.
