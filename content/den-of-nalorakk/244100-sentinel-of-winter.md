---
npcId: 244100
name: "Sentinel of Winter"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: caster

spells:
  - id: 1235783
    name: "Shattering Frostspike"   # auto
    # 3 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "Two icicles splinter for 388k within 4 yd, and each reveals a Fractured Shivercore. Dodging it is only half the job — the adds are the other half."
  - id: 1235795
    name: "Shattering Frostspike"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1235623
    name: "Raging Squall"   # auto
    # 3 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "339k on impact, then the squall wanders the arena for 90 seconds, hitting for 145k and knocking players back. They accumulate."
  - id: 1235635
    name: "Raging Squall"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1235656
    name: "Frozen Tempest"   # auto
    # 4 sec cast
    tag: soak
    prio: 1
    note: "39k a second to everyone and a constant push outward — and 145k a second extra to anyone outside the eye. Fight the push inward; being blown out is the killer."
  - id: 1235658
    name: "Frozen Tempest"   # auto
    # Instant · 100 yd range
    tag: soak
  - id: 1297749
    name: "Frozen Tempest"   # auto
    # Instant · 100 yd range
    tag: soak
  - id: 1235548
    name: "Glacial Torment"   # auto
    # 1 sec cast · 100 yd range
    tag: dispel
    prio: 2
    note: "68k every 2 sec for 16 sec."
  - id: 1235549
    name: "Glacial Torment"   # auto
    # dispel: magic · Instant · 100 yd range
    tag: dispel
    prio: 2
    note: "The dispellable half — magic."
  - id: 1236289
    name: "Blizzard's Wrath"   # auto
    # Instant · 100 yd range
    tag: dodge
    note: "194k to anyone standing in the blizzard around the arena. The edge of the room is not a safe place to be pushed to."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Frozen Tempest pushes outward and punishes being outside the eye for 145k a second — while Raging Squalls are already knocking people back. The pushes stack against you."
---

Every mechanic here moves players, and they move them in the same direction: **out**.

**Frozen Tempest** pushes everyone away from the eye while charging 145k per second to anyone
who ends up outside it. **Raging Squall** knocks players back and then *keeps wandering the
arena for 90 seconds*, so by the third cast there are several of them drifting around adding
knockbacks. And **Blizzard's Wrath** is what waits at the edge — 194k for being there.

**Shattering Frostspike** adds bodies:
[Fractured Shivercores](#/d/den-of-nalorakk/mob/244759) whose Winter's Shroud must be
interrupted and whose Rimeshatter, if unsoaked, roots the whole group.

Worth remembering from the trash: the
[Glacial Revenant's](#/d/den-of-nalorakk/mob/241876) Snowdrift grants **immunity to forced
movement**. In this fight, that is not a small thing.
