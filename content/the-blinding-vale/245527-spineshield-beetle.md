---
npcId: 245527
name: "Spineshield Beetle"   # auto
count: 1   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1238581
    name: "Spiny Shield"   # auto
    # dispel: magic · Instant
    tag: dispel
    prio: 1
    note: "A 500k absorb that also reflects 4.8k onto anyone hitting it. Dispel it — a one-force mob is not worth 500k of anyone's damage."
  - id: 1238588
    name: "Spiny Shield"   # auto
    # Instant · 100 yd range
    tag: dispel
  - id: 1242200
    name: "Lightwarden's Blight"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "291k to everyone nearby on death — on a mob worth one force. Easily the worst trade in the dungeon."
  - id: 1242180
    name: "Lightwarden's Blight"   # auto
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "One force, a 500k shield, and 291k when it dies. Dispel the shield or leave it alone — killing it the hard way costs far more than it is worth."
---

Twenty-two units at **one force each**, carrying a 500k absorb and a 291k death explosion.
The arithmetic is absurd, and that is the entry.

**Spiny Shield** carries a magic dispel type, so removing it is a global. Damaging through it
means spending half a million on a mob worth one force, while it reflects damage back at
whoever is doing the spending.

And the payoff for killing it is **Lightwarden's Blight**: 291k to everyone nearby. Unless the
count is needed, these are better ignored than fought.
