---
npcId: 198047
name: "Tempest Channeler"   # auto
count: 25   # auto — forces per unit

threat: high
role: caster

spells:
  - id: 392576
    name: "Thunder Blast"   # auto
    # 4 sec cast · 30 yd range
    tag: kick
    prio: 1
    note: "388k Nature on its target. Four seconds of cast time is generous — there is no excuse for letting it land."
  - id: 1306366
    name: "Lightning Torrent"   # auto
    # Channeled (7 sec cast) · Unlimited range
    tag: dodge
    note: "65k per second for 7 sec on one player. Not interruptible: it is healed through, or the mob is stunned."
  - id: 1307488
    name: "Lightning Torrent"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 1307502
    name: "Summon Primal Thunderclouds"   # auto
    tag: dodge
    note: "Spawns Primal Thunderclouds, which charge a player and detonate."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Two units, 25 forces each — but only Thunder Blast can be interrupted. The Torrent and the clouds have to be answered another way."
---

Two units at 25 forces each. It only answers to Mind Soothe and Taunt, so the stuns that work
on the Cinderweaver do nothing here.

Its three abilities need three different answers, which is what makes it heavier than its
cast list suggests: **Thunder Blast** is kicked, **Lightning Torrent** is healed or stopped by
other means, and **Summon Primal Thunderclouds** hands the group a second problem to clear.
