---
npcId: 243736
name: "Blistercreep"   # auto
count: 1   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1233264
    name: "Blisterburst"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "Charges to the target and explodes within 4 yd. The tooltip figure is unscaled, so the number is unknown — but the radius is small and the mob has 0.7M health."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Twelve units at one force each, with 0.7 million health and one suicide charge.

**Blisterburst** carries an **unscaled** tooltip value in the data — it reads as 14 Fire — so
this card does not quote a number for it. What is reliable is the shape: it comes to the
target and detonates in a 4-yard circle, which is small enough to step out of and cheap enough
to pre-empt by killing it first.
