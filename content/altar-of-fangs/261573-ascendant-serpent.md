---
npcId: 261573
name: "Ascendant Serpent"   # auto
count: 30   # auto — forces per unit

# TO FILL IN: low | medium | high | lethal
threat:
role: miniboss

spells:
  - id: 1221063
    name: "Xal'atath's Gift"   # auto
    # Instant
    tag: ignore
    note: "Sub-12 affix, rotated weekly. Not a trait of this mob."
  - id: 1295055
    name: "Virulent Whirl"   # auto
    # 2 sec cast
    tag: dodge
    prio: 1
    note: "291k Nature within 6 yards of each impact, and the toxins then rise into Virulent Twisters."
  - id: 1295073
    name: "Virulent Whirl"   # auto
    tag: dodge
  - id: 1309415
    name: "Virulent Twister"   # auto
    tag: dodge
    note: "34k Nature every 0.3 sec — what Virulent Whirl leaves behind."
  - id: 1309416
    name: "Virulent Twister"   # auto
    tag: dodge
  - id: 1294934
    name: "Noxious Spray"   # auto
    # 3 sec cast
    tag: tank
    note: "Frontal on its target: 68k Nature every second for 5 sec."
  - id: 1294958
    name: "Noxious Spray"   # auto
    tag: tank
  - id: 1308864
    name: "Infest"   # auto
    # 2 sec cast
    tag: dodge
    note: "35k every second for 5 sec, and the infestation bursts when it expires."
  - id: 1308865
    name: "Infest"   # auto
    tag: dodge
  - id: 1309382
    name: "Infest"   # auto
    tag: dodge
  - id: 1309398
    name: "Infest"   # auto
    tag: dodge
  - id: 1293420
    name: "Evolution Ritual"   # auto
    tag: ignore
    note: "Shielded by the ritual: unattackable and immune. Damage spent into it is wasted."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Thirty forces from a single unit, the largest one-body contribution in the dungeon, with a kit
to match: a frontal on the tank, a 291k whirl that leaves twisters behind, and a DoT that
bursts on expiry.

**Evolution Ritual** makes it unattackable and immune for its duration, so damage spent into
it during that window is thrown away.
