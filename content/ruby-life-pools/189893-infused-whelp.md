---
npcId: 189893
name: "Infused Whelp"   # auto
count: 0   # auto — forces per unit

# The encounter variant, immune to every CC MDT lists. Worth no forces.
threat:
role: add

spells:
  - id: 1305234
    name: "Cold Claws"   # auto
    # dispel: magic · Instant · Unlimited range
    tag: dispel
    prio: 1
    note: "Every melee swing adds an application, and at 20 the target is Frozen Solid."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Same counter as the other whelp, but this one takes no crowd control at all — the dispel is the only lever."
---

The second MDT entry for the Infused Whelp, distinguished from
[the first](#/d/ruby-life-pools/codex/mob/187894) by being immune to every crowd control listed.

Same ability, same counter to twenty, one fewer way of dealing with it.
