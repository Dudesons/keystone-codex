---
npcId: 134388
name: "A Knot of Snakes"   # auto
count: 0   # auto — forces per unit

# Merektha's binding, tracked as a unit because it has to be destroyed. Worth no forces.
threat:
role: add

spells:
  - id: 263958
    name: "A Knot of Snakes"   # auto
    # Channeled (20 sec cast) · 100 yd range
    tag: dodge
    prio: 1
    note: "The victim can take no action at all while suffocating for 29k a second. 0.5M health — destroying or incapacitating the knot is what frees them."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Half a million health against twenty seconds of a player doing nothing. Break it immediately — it does not release on its own."
---

[Merektha](#/d/temple-of-sethraliss/codex/mob/133384)'s binding, tracked by MDT as a unit precisely
because it has a health bar someone has to remove.

Twenty seconds of a player unable to act, in a sealed chamber where Storm Strikes are landing
across the floor, is not something to ride out. The tooltip gives two outs — *destroying or
incapacitating the knot* — and half a million health makes the first one quick.
