---
npcId: 239167
name: "Charonus"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: caster

spells:
  - id: 1310025
    name: "Gravitic Orbs"   # auto
    # 4 sec cast
    tag: dodge
    prio: 1
    note: "An orb fixates each player, stacking Condensed Mass. Take it within 6 yards of an Unstable Singularity and it is destroyed — the two mechanics answer each other."
  - id: 1248112
    name: "Unstable Singularity"   # auto
    # 6 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "Singularities pulling everyone inward at 7k a second; anyone dragged to the centre is Atomized. Also the only thing that kills a Gravitic Orb."
  - id: 1248121
    name: "Unstable Singularity"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1311923
    name: "Dark Waves"   # auto
    # 5 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "339k to everyone hit. Method reads it as a frontal tank buster — five seconds of cast to face it away."
  - id: 1222755
    name: "Void Cascade"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "291k and a knockback on contact. In a fight built on singularities pulling inward, being thrown is the dangerous half."
  - id: 1227247
    name: "Void Cascade"   # auto
    # 6 sec cast · 100 yd range
    tag: dodge
  - id: 1227197
    name: "Cosmic Crash"   # auto
    # 4.8 sec cast · 100 yd range
    tag: dodge
    prio: 2
    note: "116k within 8 yd, a knockback, and 15k a second for 20 seconds afterwards. The lingering burn stacks up across casts."
  - id: 1300372
    name: "Cosmic Crash"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "The singularities are not only a hazard — they are the only way to destroy a Gravitic Orb. Take the orb to the thing that is trying to kill you."
---

The last fight in Voidscar Arena, and the one whose mechanics are most explicitly wired
together.

**Gravitic Orbs** fixate each player and stack **Condensed Mass** until destroyed — and the
tooltip names exactly one way to destroy them: *bring the orb within 6 yards of an Unstable
Singularity*. The singularities are simultaneously the thing pulling everyone toward being
**Atomized**. So the fight asks players to walk their orb toward the hazard and pull away at
the right moment.

Everything else pushes and pulls too. **Void Cascade** knocks players away, **Cosmic Crash**
knocks them back and leaves a twenty-second burn, and the singularities drag inward
throughout. Positioning here is never neutral.

**Dark Waves** is the tank's cast: 339k, and read as a frontal.
