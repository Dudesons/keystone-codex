---
npcId: 245950
name: "Watchful Harrower"   # auto
count: 65   # auto — forces per unit

threat: medium
role: melee
rank: miniboss

spells:
  - id: 1239855
    name: "Sky Strike"   # auto
    # dispel: magic · Instant · 100 yd range
    tag: soak
    prio: 1
    note: "873k shared among everyone within 10 yards. Alone it is fatal; split five ways it is 175k each. Stack for this one — do not scatter."
  - id: 1239856
    name: "Sky Strike"   # auto
    # 5 sec cast · 100 yd range
    tag: soak
    prio: 1
  - id: 1300116
    name: "Whirling Gust"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "388k within 10 yd of the impact, and this one is not shared. The opposite instruction to Sky Strike."
  - id: 1300138
    name: "Void Beam"   # auto
    # 2 sec cast · 100 yd range
    tag: dodge
    prio: 2
    note: "44k every half-second for 4 sec within 8 yd of where it lands. Ground damage — move."
  - id: 1300156
    name: "Void Beam"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Sky Strike splits 873k among everyone it hits — stack it. Whirling Gust does not split — spread for that one. Getting the two the wrong way round kills someone either way."
---

**Sixty-five forces per unit**, four of them, 35% of the dungeon on one mob. Nothing else in
Voidscar Arena comes close, and no route skips it.

Its two big abilities want **opposite positioning**, which is the entire difficulty.

**Sky Strike** deals 873k *shared among all enemies within 10 yards*. Taken alone that kills;
taken by five it is 175k each. The correct response to the biggest number on the card is to
walk toward it.

**Whirling Gust** is 388k within 10 yards with no sharing clause at all. Same radius, opposite
answer.

MDT also flags Sky Strike with a **magic** dispel type, so the knock-up it applies can be
cleared.
