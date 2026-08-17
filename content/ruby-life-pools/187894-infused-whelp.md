---
npcId: 187894
name: "Infused Whelp"   # auto
count: 0   # auto — forces per unit

# Called in by Melidrussa's Awaken Whelps, and worth no forces.
threat:
role: add

spells:
  - id: 1305234
    name: "Cold Claws"   # auto
    # dispel: magic · Instant · Unlimited range
    tag: dispel
    prio: 1
    note: "Every melee swing adds an application, and at 20 the target is Frozen Solid. Dispel the stack before it gets there — or keep them off the target entirely."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Cold Claws counts to 20 and then freezes whoever it is on. It is a stack to watch, not a debuff to ignore."
---

Melidrussa's whelps, worth no forces. They do nothing on their own — the danger is entirely in
the counter.

**Cold Claws** adds one application per melee swing and freezes its target solid at twenty.
Several whelps on the same player reach twenty far faster than the number suggests, which is
why the dispel is worth spending early rather than at nineteen.
