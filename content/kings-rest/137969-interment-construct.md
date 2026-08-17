---
npcId: 137969
name: "Interment Construct"   # auto
count: 15   # auto — forces per unit

threat: high
role: melee

spells:
  - id: 271555
    name: "Entomb"   # auto
    # 3 sec cast · Unlimited range
    tag: dodge
    prio: 1
    note: "Locks a player inside a crypt. They are out of the fight until someone opens it — and the Construct starts wailing while they are in there."
  - id: 271561
    name: "Wail of Mourning"   # auto
    # Channeled (30 sec cast)
    tag: dodge
    prio: 1
    note: "78k to everyone every 2 sec, growing with time, for up to 30 sec. It stops the moment the entombed player is released. Free them, do not out-heal it."
  - id: 271562
    name: "Wail of Mourning"   # auto
    # Instant
    tag: dodge
  - id: 1312569
    name: "Embalm"   # auto
    # 1 sec cast · 100 yd range
    tag: dodge
    prio: 2
    note: "97k a second for 6 sec on one player."
  - id: 1310755
    name: "Heavy Slams"   # auto
    # Instant · 100 yd range
    tag: dodge
    note: "24k to everyone on each melee swing."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Wail of Mourning ramps for thirty seconds and ends the instant the entombed player is released. Open the crypt — healing through it is the losing option."
---

Two units at 15 forces each, and a mechanic with an explicit off switch.

**Entomb** takes a player out of the fight; **Wail of Mourning** then charges the remaining
four 78k every 2 seconds, *increasing with time*, for up to thirty seconds. Four players
healing through a ramp while one is missing is exactly the wrong shape.

The tooltip says how it ends: *releasing the interred player will stop this ability*. So the
crypt is the priority, ahead of the Construct itself.
