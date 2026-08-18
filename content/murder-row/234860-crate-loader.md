---
npcId: 234860
name: "Crate Loader"   # auto
count: 0   # auto — forces per unit

# Zaen's warehouse hands above the arena. Worth no forces.
threat:
role: add

spells:
  - id: 474766
    name: "Same-Day Delivery"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "Freight thrown down from above: 388k on impact and a knockback. It also restocks the cover the group needs."
  - id: 474768
    name: "Delivery!"   # auto
    # Instant · Unlimited range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "The crates that hurt on the way down are the same crates that block Murder in a Row. Dodge the delivery, then use what it left."
---

The workers [Zaen](#/d/murder-row/codex/mob/234649) calls on to throw
[Forbidden Freight](#/d/murder-row/codex/mob/234852) into the arena.

The delivery is 388k and a knockback where it lands, so it is dodged — but it is also how the
fight replenishes its cover after Fire Bombs have destroyed some. Read as damage it is a
nuisance; read as terrain it is the thing keeping the fight survivable.
