---
npcId: 135231
name: "Ghostly Brute"   # auto
count: 25   # auto — forces per unit

threat: high
role: melee

spells:
  - id: 1302028
    name: "Soul Crush"   # auto
    # 2.5 sec cast · 60 yd range
    tag: tank
    prio: 1
    note: "727k, plus +30% Physical damage taken for 15 sec. The biggest single hit in King's Rest trash, and it makes the next one worse."
  - id: 270514
    name: "Seismic Upheaval"   # auto
    # 5 sec cast
    tag: dodge
    prio: 1
    note: "388k to everyone nearby and a knock high into the air. Five seconds of cast — there is no excuse for being in it."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Soul Crush is 727k and leaves +30% Physical damage taken for fifteen seconds. Two in a row on the same tank is the sequence to plan against."
---

One unit at 25 forces, hitting harder than anything else in the trash.

**Soul Crush** does two things at once, and the second is what kills: 727k up front, then a
15-second window in which the target takes 30% more Physical damage. Its cooldown and that
window overlap, so a tank who eats two without mitigating is taking roughly 950k on the second.

**Seismic Upheaval** is a five-second cast for 388k and a knock-up — long enough that anyone
caught by it was not watching.

Only **Taunt** applies.
