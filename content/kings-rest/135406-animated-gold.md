---
npcId: 135406
name: "Animated Gold"   # auto
count: 0   # auto — forces per unit

# Raised from Molten Gold pools by Lucre's Call, and worth no forces.
threat:
role: add

spells:
  - id: 265991
    name: "Luster"   # auto
    # Instant · Unlimited range
    tag: soak
    prio: 1
    note: "What it gives the Golden Serpent on arrival: a 10% shield and +25% damage done, stacking. Every one that gets through is permanent."
  - id: 1289063
    name: "Rune of Echoes"   # auto
    # Instant · 100 yd range
    tag: ignore
    note: "The tooltip in the data describes a player rune, not a mob ability — it is plainly attached to the wrong spell. Nothing can be said about what this does here."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "0.2 million health each, and each one that reaches the boss makes her permanently 25% stronger. They are the fight."
---

Raised from the Molten Gold that **Spit Gold** leaves behind, when
[the Golden Serpent](#/d/kings-rest/codex/mob/135322) casts **Lucre's Call**.

They have 0.2 million health — trivial individually. The stake is what happens if one arrives:
**Luster** shields her for 10% of her health and adds **25% damage done**, and it stacks with
no expiry. A fight that goes long is a fight where several got through, which makes it go
longer still.

One data caveat: MDT lists `1289063` on this mob under the name *Rune of Echoes*, and the
tooltip text is clearly a player-facing rune description that has nothing to do with King's
Rest. It is recorded here because it is in the data, and deliberately not described.
