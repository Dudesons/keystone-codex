---
npcId: 261554
name: "Twinfang Harrower"   # auto
count: 25   # auto — forces per unit

threat: medium
role: miniboss

spells:
  - id: 1294572
    name: "Duostrike"   # auto
    # Instant
    tag: tank
    prio: 1
    note: "Melee attacks strike twice. This is the tank buster of the pull."

  - id: 1294567
    name: "Paralyzing Shots"   # auto
    # 3 sec cast
    tag: dispel
    note: "135k on impact, then 48k every second for 20 sec, and it impairs movement. Dispellable as magic; a Freedom clears it too."

  # MDT attaches Toxic Breath to the mob under two ids, and either can be the one that fires.
  # Both carry the note so the frontal is briefed whichever one the group sees.
  - id: 1306668
    name: "Toxic Breath"   # auto
    tag: frontal
    note: "Frontal, 68k Nature every half second to anyone standing in it."

  - id: 1306669
    name: "Toxic Breath"   # auto
    # Instant
    tag: frontal
    note: "Frontal, 68k Nature every half second to anyone standing in it."

  - id: 1221063
    name: "Xal'atath's Gift"   # auto
    # Instant
    tag: ignore
    note: "Sub-12 affix, rotated weekly. Not a trait of this mob."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Duostrike is a genuine tank buster on a mob that reads as trash. Treat it as a miniboss: the tank needs a cooldown, not a shrug."
---

Twenty-five forces per unit for four units — it is priced like a miniboss and it hits like
one, which is why it is filed as one rather than as trash.

**Paralyzing Shots** runs for twenty seconds and impairs movement, so it is worth clearing
before **Toxic Breath** goes out: a slowed player in a frontal taking 68k every half second
is how this pull turns bad.
