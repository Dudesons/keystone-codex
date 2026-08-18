---
npcId: 234660
name: "Nibbles"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 1230304
    name: "Light Infusion"   # auto
    # 2 sec cast · 100 yd range
    tag: soak
    prio: 1
    note: "Drained of fel, she turns on Kystia — and that is what sets up Chaotic Burst. Getting her here is the objective, not a side effect."
  - id: 1230289
    name: "Illicit Infusion"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "Kystia re-infuses her while she is above 20% health. The threshold is the mechanic: push her below it."
  - id: 1217464
    name: "Illicit Infusion"   # auto
    # Channeled · Unlimited range
    tag: dodge
  - id: 1253811
    name: "Fel Spray"   # auto
    # 3.5 sec cast · 300 yd range
    tag: dodge
    prio: 1
    note: "Frontal cone, 194k a second for 5 sec. Nearly a million to anyone who stands in the whole thing."
  - id: 1253813
    name: "Fel Spray"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1228198
    name: "Corroding Spittle"   # auto
    # dispel: magic · Instant · 8 yd range
    tag: dispel
    prio: 1
    note: "58k up front, then 107k every 3 sec for 30 seconds. Magic — and half a minute is long enough that it is still running at the next infusion."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Kystia only re-infuses her above 20% health. Pushing Nibbles below that threshold is what ends the loop and opens the burn window."
---

Kystia's pet, and the switch the fight turns on.

The loop is stated plainly across two tooltips: **Illicit Infusion** turns her hostile *while
she is above 20% health*, and **Light Infusion** — cast once she is drained of fel — is what
stuns [Kystia](#/d/murder-row/map/mob/234648) into **Chaotic Burst** at +115% damage taken.

So damage on Nibbles is not damage wasted on an add. It is the mechanic.

While she is hostile, **Fel Spray** is a 5-second frontal worth close to a million, and
**Corroding Spittle** stacks a thirty-second magic burn.
