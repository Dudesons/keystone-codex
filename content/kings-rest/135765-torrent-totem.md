---
npcId: 135765
name: "Torrent Totem"   # auto
count: 0   # auto — forces per unit

# One of Zanazal's three totems, and worth no forces.
threat:
role: add

spells:
  - id: 267105
    name: "Torrent"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "158k within 3 yards and a knockback. A small radius — this is the one that can simply be stood away from."
  - id: 1309499
    name: "Reinforced"   # auto
    tag: ignore
    note: "MDT carries no tooltip text for it. All three of Zanazal's totems have it."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

The least urgent of [Zanazal](#/d/kings-rest/codex/mob/269810)'s three totems: a 3-yard radius means
avoiding it costs a step, not a cooldown.

The knockback is the part worth remembering rather than the 158k — in a fight where
[Aka'ali](#/d/kings-rest/codex/mob/269808)'s charge has to be soaked as a group, anything that
scatters people has a cost beyond its damage.

Kill order among the three: Explosive first, Disruption second, this one last.
