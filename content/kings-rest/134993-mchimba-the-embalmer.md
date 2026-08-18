---
npcId: 134993
name: "Mchimba the Embalmer"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 267702
    name: "Entomb"   # auto
    # 3 sec cast · Unlimited range
    tag: dodge
    prio: 1
    note: "Locks a player in a crypt. He then opens the crypts one at a time, starting with the empty ones — so the group has to free them another way."
  - id: 271290
    name: "Open Coffin"   # auto
    # 6 sec cast · Unlimited range
    tag: dodge
    prio: 1
    note: "Six seconds per crypt, and each one opened shortens the next. The wait gets less bad as it goes, which is the fight's only mercy."
  - id: 267618
    name: "Drain Fluids"   # auto
    # 2 sec cast · Unlimited range
    tag: dodge
    prio: 1
    note: "116k every 2 sec for 6 sec, triggering Explosive Acids, and it leaves Desiccation on the target when it finishes."
  - id: 267639
    name: "Burn Corruption"   # auto
    # 4 sec cast · 300 yd range
    tag: dodge
    prio: 1
    note: "145k within 10 yd and it leaves Burning Ground. Take it somewhere the group is not going to need."
  - id: 267874
    name: "Burning Ground"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "145k every second. The arena fills up with these over the fight."
  - id: 1312146
    name: "Awakening Slam"   # auto
    # 3 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "194k to everyone, and it opens random crypts — releasing Half-Finished Mummies whose Wretched Discharge has to be kicked."
  - id: 1312848
    name: "Command Constructs"   # auto
    # 1 sec cast · 100 yd range
    tag: dodge
    prio: 2
    note: "78k to everyone, and it sends nearby Interment Constructs to embalm players."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Entomb takes a player out and Mchimba deliberately opens the wrong crypts first. Free them yourselves — waiting for him is waiting for a four-player fight."
---

A fight about a player who is not in it.

**Entomb** puts someone in a crypt, and the tooltip spells out the cruelty: he moves between
the crypts *beginning with the ones that do not contain the player*. **Open Coffin** takes six
seconds each — decreasing as more are opened — so waiting for him to work through them is a
long time at four players.

Meanwhile the floor is filling with **Burning Ground** from Burn Corruption at 145k a second,
**Awakening Slam** is opening crypts to release
[Half-Finished Mummies](#/d/kings-rest/codex/mob/270502) whose party-wide disease must be kicked, and
**Command Constructs** is sending [Interment Constructs](#/d/kings-rest/codex/mob/137969) to embalm
whoever is left.

Every mechanic in the fight subtracts a player or subtracts floor. Neither comes back.
