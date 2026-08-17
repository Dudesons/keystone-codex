---
npcId: 189886
name: "Blazebound Firestorm"   # auto
count: 0   # auto — forces per unit

# Summoned by Kokia Blazehoof's Ritual of Blazebinding, and worth no forces.
threat:
role: add

spells:
  - id: 373017
    name: "Blaze Volley"   # auto
    # 3.5 sec cast · 500 yd range
    tag: kick
    prio: 1
    note: "116k Fire to every player, from anywhere on the map. The one cast in the encounter that has to be interrupted."
  - id: 384823
    name: "Inferno"   # auto
    # 3 sec cast
    tag: dodge
    note: "107k to everyone plus 34k per second for 8 sec, and it stacks with itself."
  - id: 373087
    name: "Burnout"   # auto
    # 5 sec cast
    tag: dodge
    note: "485k within 20 yd on death, and it leaves Scorched Earth behind. Kill it away from where the group needs to stand."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Blaze Volley has unlimited range and hits everyone — distance is no protection, only the interrupt is."
---

Kokia's add, immune to every crowd control MDT lists.

**Blaze Volley** is the reason it cannot be left alive: 500 yard range, every player hit,
116k a time. Running away from the add does nothing. And **Burnout** means where it dies
matters — 485k inside 20 yards plus a patch of Scorched Earth on the floor the group was
probably about to use.
