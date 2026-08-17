---
npcId: 134157
name: "Umbral Warrior"   # auto
count: 5   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1311942
    name: "Shadow Slash"   # auto
    # Instant · 100 yd range
    tag: tank
    note: "15k on one target — the smallest ability in the dungeon. Method files it as a tank buster, but the number does not support that reading."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Six units at 5 forces each, with one instant ability dealing 15k.

Method classifies **Shadow Slash** as a tank buster. On the numbers in MDT it is nothing of
the sort — 15k next to a dungeon where Ghostly Brute hits for 727k. Either the tooltip is
understated or Method's category is generous; the card follows the data.

MDT lists Stun, Fear, Slow and Disorient as applicable, so it can also simply be controlled.
