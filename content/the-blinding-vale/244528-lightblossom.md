---
npcId: 244528
name: "Lightblossom"   # auto
count: 0   # auto — forces per unit

# Sown by Lekshi's Lightsower Dash during the Trinity, and worth no forces.
threat:
role: add

spells:
  - id: 1235752
    name: "Lightbloom Overgrowth"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "What a seed does if it is allowed to bloom: 15k to everyone every second for 8 sec, and it withers the Fertile Loam into Light-Scorched Earth."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It blooms 8 seconds after Kezkitt's beam starts on it. Standing in that beam is what stops it — the bloom is prevented, not survived."
---

The seed [Lekshi](#/d/the-blinding-vale/codex/mob/243030) plants at each end of a Lightsower Dash,
and [Kezkitt](#/d/the-blinding-vale/codex/mob/243029) then germinates with **Lightblossom Beam**.

Eight seconds after the beam starts, it casts **Lightbloom Overgrowth** — 15k a second on the
whole group for 8 seconds — and turns the Fertile Loam around it into Light-Scorched Earth,
which costs 97k a second to stand in. So a bloom does not just deal damage, it removes floor.

The counter is in Kezkitt's tooltip rather than this one: standing inside the beam stifles the
seed's growth.
