---
npcId: 239008
name: "Atroxus"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 1226031
    name: "Poison Splash"   # auto
    # dispel: poison · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "44k a second to everyone around it, and each glob lands for 194k plus a 5-second burn and leaves a pool. A poison — dispels earn their keep here."
  - id: 1226120
    name: "Poison Splash"   # auto
    # Channeled (3 sec cast) · 100 yd range
    tag: dispel
  - id: 1247395
    name: "Poison Splash"   # auto
    # Instant · 60 yd range
    tag: dispel
  - id: 1300351
    name: "Poison Splash"   # auto
    # Instant · 100 yd range
    tag: dispel
  - id: 1222484
    name: "Poison Pool"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "78k a second on the floor, and it applies Mind-Numbing Poison. The pools are also what the Toxic Creepers come out of."
  - id: 1263971
    name: "Mind-Numbing Poison"   # auto
    # dispel: poison · Instant · 100 yd range
    tag: dispel
    prio: 2
    note: "-30% Haste for 5 sec. Short, but it lands every time someone clips a pool."
  - id: 1222721
    name: "Noxious Breath"   # auto
    # 4 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "388k frontal. Four seconds of cast — nobody in front."
  - id: 1222724
    name: "Noxious Breath"   # auto
    # Instant · 60 yd range
    tag: dodge
  - id: 1222642
    name: "Hulking Claw"   # auto
    # 2 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "242k plus 53k a second for 10 sec on the tank."
  - id: 1262497
    name: "Monstrous Roar"   # auto
    # 3 sec cast
    tag: dodge
    prio: 1
    note: "126k to everyone, ignoring armour, and it wakes a Toxic Creeper. Damage and an add from one cast."
  - id: 1222519
    name: "Provoke Creeper"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 2
    note: "The other way a Toxic Creeper appears: it agitates a pool."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "The pools are not just damage — they are where the Toxic Creepers come from. Leaving the floor covered means the adds keep coming."
---

Everything in this fight runs through the **poison pools on the floor**, which is what makes
them worth more attention than their damage suggests.

They tick for 78k a second and apply **Mind-Numbing Poison**. But their real function is as
spawn points: both **Monstrous Roar** and **Provoke Creeper** pull a
[Toxic Creeper](#/d/voidscar-arena/map/mob/239070) out of an existing pool. A room with fewer pools
produces fewer creepers.

And the creepers are the escalation: their **Sickening Bite** stacks **+50% Nature damage taken
for five minutes** — effectively for the rest of the fight — on a boss whose damage is entirely
Nature.

**Noxious Breath** at 388k and **Hulking Claw** on the tank are the conventional half.
