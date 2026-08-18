---
# A written base whose `.fr.md` sibling is deliberately incomplete: it translates the trap and
# one of the two notes, and no prose at all. That is what an in-progress translation looks
# like, and it is the only subject in the repository guaranteed to keep looking like one — the
# real cards under content/<dungeon>/ get finished, and the tests covering the fallback must
# not go red the day they do. The ids and figures are Ula'tek's Chosen's real ones, so an
# annotation here still names a spell MDT attaches to that mob.
npcId: 263109
name: "Ula'tek's Chosen"   # auto
count: 25   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1307567
    name: "Mass Envenom"   # auto
    # 2.5 sec cast · 60 yd range
    tag: kick
    prio: 1
    note: "The cast that makes this mob matter. 58k Nature on impact, then 24k every second for 8 sec."

  - id: 1306852
    name: "Toxic Surge"   # auto
    # 2 sec cast · Unlimited range
    tag: frontal
    note: "Frontal. Triggers Toxic Beam, which hits anyone caught for 339k Nature."

  - id: 1306853
    name: "Toxic Surge"   # auto
    # Instant · Unlimited range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Kick Mass Envenom while the adds are still up, or the poison stacks on a group that is already spread out."
---

The caster that decides how a pull goes, at 25 forces per unit.

**Mass Envenom** is the reason, and **Toxic Surge** is a frontal whose beam carries by far the
largest single number in the dungeon.
