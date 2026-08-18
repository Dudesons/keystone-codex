---
npcId: 244759
name: "Fractured Shivercore"   # auto
count: 0   # auto — forces per unit

# Revealed by the Sentinel of Winter's Shattering Frostspike, and worth no forces.
threat:
role: add

spells:
  - id: 1235829
    name: "Winter's Shroud"   # auto
    # 4 sec cast · 100 yd range
    tag: kick
    prio: 1
    note: "97k to everyone and +10% Frost damage taken for 20 sec, stacking — in a fight that is entirely Frost. This is the interrupt of the encounter."
  - id: 1263590
    name: "Rimeshatter"   # auto
    # Instant · 300 yd range
    tag: soak
    prio: 1
    note: "Shards land 6 sec later for 58k within 5 yd. If nobody is struck they detonate instead — so these are soaked, not avoided."
  - id: 1263597
    name: "Rime Detonation"   # auto
    # Instant · 300 yd range
    tag: soak
    prio: 1
    note: "The price of dodging a shard: 155k to everyone and a 4-second root. Far worse than taking it."
  - id: 1234314
    name: "Snowdrift"   # auto
    # Instant · 100 yd range
    tag: dodge
    note: "Deep snow on death: -40% movement speed, and immunity to forced movement for anyone in it."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Rimeshatter shards must be caught, not avoided. An unsoaked shard detonates for 155k and roots the whole group — dodging it is the mistake."
---

Uncovered when the [Sentinel of Winter](#/d/den-of-nalorakk/codex/mob/244100)'s Shattering Frostspike
splinters, and it brings the two mechanics the boss herself does not have.

**Winter's Shroud** stacks +10% Frost damage taken on a fight where every source of damage is
Frost. Left alone it multiplies everything else in the room, which is why it outranks anything
else for the interrupt.

**Rimeshatter** inverts the usual reading. The shards do 58k where they land — but *if no
player is struck*, they fragment into **Rime Detonation**: 155k to everyone plus a four-second
root, in an arena full of wandering squalls. Standing in the shard is by far the cheaper
option.
