---
npcId: 197535
name: "High Channeler Ryvati"   # auto
count: 30   # auto — forces per unit

threat: lethal
role:
rank: miniboss

spells:
  - id: 1310355
    name: "Tempest Stormshield"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "Absorbs 20% of its health while radiating 29k per second to the whole party, and stuns everyone within 60 yd for 4 sec when it expires. Break it, or the group is stunned through whatever comes next."
  - id: 1310361
    name: "Tempest Stormshield"   # auto
    # Instant
    tag: dodge
  - id: 1310363
    name: "Tempest Stormshield"   # auto
    # Instant
    tag: dodge
  - id: 1306366
    name: "Lightning Torrent"   # auto
    # Channeled (7 sec cast) · Unlimited range
    tag: dodge
    note: "65k per second for 7 sec on one player. Not interruptible."
  - id: 1307488
    name: "Lightning Torrent"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 1307511
    name: "Summon Primal Thunderclouds"   # auto
    tag: dodge
    note: "Spawns Primal Thunderclouds, which charge a player and detonate."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Tempest Stormshield stuns the whole party for 4 seconds if it is allowed to expire. Break the absorb instead of waiting it out."
---

Thirty forces on one body, and MDT lists nothing interruptible on it — every answer here is
damage or positioning.

**Tempest Stormshield** is the whole mob. It is a 20% absorb, it ticks 29k a second on the
party for as long as it holds, and if it runs to its end it stuns everyone within 60 yards for
4 seconds. Every reason points the same way: break it early. Waiting it out means paying the
damage *and* losing four seconds of the pull.
