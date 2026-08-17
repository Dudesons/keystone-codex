---
npcId: 241812
name: "The Hoardmonger"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 1235072
    name: "Resourceful Measures"   # auto
    # 1 sec cast
    tag: dodge
    prio: 1
    note: "He walks to a pile and swaps one of his abilities for another — he can only hold one at a time. Which pile he reaches decides the next phase, so watch where he goes."
  - id: 1235075
    name: "Resourceful Measures"   # auto
    # 1 sec cast
    tag: dodge
  - id: 1235076
    name: "Resourceful Measures"   # auto
    # 1 sec cast
    tag: dodge
  - id: 1234021
    name: "Earthshatter Slam"   # auto
    # 4 sec cast · 50 yd range
    tag: dodge
    prio: 1
    note: "485k in a frontal cone. Four seconds of cast — the baseline version, before he picks up bones."
  - id: 1232012
    name: "Serrated Fists"   # auto
    # Instant
    tag: dodge
    note: "The bone pile: it upgrades Earthshatter Slam into Bonespike Slam."
  - id: 1235129
    name: "Bonespike Slam"   # auto
    # 4 sec cast · 50 yd range
    tag: dodge
    prio: 1
    note: "The same 485k frontal, but it leaves bone spikes standing for 45 sec. The floor never recovers during the fight."
  - id: 1235405
    name: "Bonespiked"   # auto
    # Instant · 100 yd range
    tag: dodge
    note: "19k every half-second and -50% movement speed, from touching the spikes."
  - id: 1234681
    name: "Ravenous Bellow"   # auto
    # 3 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "165k to everyone plus 29k a second for 10 sec, ignoring armour. The baseline version."
  - id: 1235079
    name: "Satiated"   # auto
    # Instant
    tag: dodge
    note: "The meat pile: it upgrades Ravenous Bellow into Hearty Bellow."
  - id: 1235125
    name: "Hearty Bellow"   # auto
    # 3 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "The same bellow with a knockback added. Where the group is standing suddenly matters."
  - id: 1234233
    name: "Spoiled Supplies"   # auto
    # Channeled (7 sec cast)
    tag: dodge
    prio: 2
    note: "Seven seconds of rotten food: 97k on the players it hits, or Rotten Mushrooms scattered around the arena."
  - id: 1234734
    name: "Spoiled Supplies"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1235105
    name: "Overflowing Supplies"   # auto
    # Instant
    tag: dodge
    note: "The mushroom pile: it makes Spoiled Supplies throw more mushrooms."
  - id: 1245593
    name: "Putrid Burst"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "A mushroom left alone bursts after 12 sec for 145k and applies Toxic Spores to everyone. Twelve seconds is the window to break them."
  - id: 1234846
    name: "Toxic Spores"   # auto
    # dispel: poison · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "19k every 2 sec for 12 sec, stacking. A poison — this is where the group's poison dispel earns its place."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Resourceful Measures means the fight you get depends on which pile he reaches. He holds one upgrade at a time — read the pile, not the cast bar."
---

A fight the group can partly choose, and the choosing happens before the casts do.

**Resourceful Measures** sends him to a pile of resources, and each pile upgrades a different
ability: **bones** turn Earthshatter Slam into **Bonespike Slam**, which leaves 45 seconds of
spiked ground; **meat** turns Ravenous Bellow into **Hearty Bellow**, adding a knockback;
**mushrooms** make Spoiled Supplies throw more of them. He can only hold **one at a time**, so
the tooltip is telling the group that the fight has three shapes and he picks one.

The mushrooms carry the fight's real dispel check. A **Rotten Mushroom** left alone bursts
after 12 seconds for 145k and puts stacking **Toxic Spores** — a poison — on everyone. Breaking
them inside the window is cheaper than dispelling the aftermath.
