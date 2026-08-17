---
npcId: 245484
name: "Lightfeather Petalwing"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1238294
    name: "Disorienting Screech"   # auto
    # 4 sec cast · 100 yd range
    tag: kick
    prio: 1
    note: "Disorients the whole group for 3 sec. No damage at all — what it costs is three seconds of everyone's cooldowns, mid-pull."
  - id: 1242200
    name: "Lightwarden's Blight"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 2
    note: "291k to everyone nearby on death, plus Blight Resin on the floor."
  - id: 1242180
    name: "Lightwarden's Blight"   # auto
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Disorienting Screech deals no damage, which is exactly why it gets ignored — and a disoriented group is a group not dodging anything else."
---

Sixteen units at 7 forces each. Its cast does nothing measurable, and that is the trap.

**Disorienting Screech** takes four seconds and disorients the party for three. No health bar
moves, so it slips down the interrupt priority behind casts that visibly hurt — but a group
that loses three seconds in the middle of a Sporeblight Belcher's spores or a Hydra's Bullet
Seeds pays for it with someone else's ability.

It also carries **Lightwarden's Blight**, so it explodes for 291k when it dies, like most of
the Vale's trash.
