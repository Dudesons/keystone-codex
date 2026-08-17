---
npcId: 234799
name: "Furious Vilefiend"   # auto
count: 0   # auto — forces per unit

# Summoned by Lithiel's Summon Vilefiend, and worth no forces.
threat:
role: add

spells:
  - id: 1217881
    name: "Shadow Bite"   # auto
    # Instant · 100 yd range
    tag: tank
    prio: 1
    note: "39k extra Shadow on each melee swing. Method reads the Vilefiend as a tank problem — this is why."
  - id: 1293101
    name: "Shadow Bite"   # auto
    # Instant
    tag: tank

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

[Lithiel Cinderfury](#/d/murder-row/mob/234763)'s **Summon Vilefiend** add, with 1.6 million
health and one ability.

**Shadow Bite** adds 39k to its melee swings, which makes it a tank-damage problem rather than
a mechanic. It needs picking up and killing; there is nothing to dodge, interrupt or dispel.
