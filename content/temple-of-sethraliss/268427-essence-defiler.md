---
npcId: 268427
name: "Essence Defiler"   # auto
count: 0   # auto — forces per unit

# Part of the Avatar of Sethraliss encounter. Worth no forces.
threat:
role: add

spells:
  - id: 1301199
    name: "Defiling Taint"   # auto
    # Channeled · Unlimited range
    tag: dodge
    prio: 1
    note: "Prevents all external healing on the Avatar. Not a threat to the group — it is why the boss cannot be damaged down conventionally. 4.3M health each."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It channels into the Avatar, not at the group. Nothing it does hurts anyone — killing it is about the boss's health bar, not the party's."
---

Two units of 4.3 million health each, and neither deals any damage.

**Defiling Taint** channels dark energy into the
[Avatar](#/d/temple-of-sethraliss/codex/mob/133392), *preventing all external healing* on her. In an
encounter where the Avatar heals herself by consuming
[Lifeforce](#/d/temple-of-sethraliss/codex/mob/268364), that is a mechanic pointed at the fight's own
internal economy rather than at the players.

It has no offensive ability at all, which is unusual enough to be worth stating plainly: the
Defilers are health bars to work through, nothing more.
