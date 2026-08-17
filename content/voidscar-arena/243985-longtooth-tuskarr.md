---
npcId: 243985
name: "Longtooth Tuskarr"   # auto
count: 5   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1310319
    name: "Bolster"   # auto
    # dispel: enrage · Instant
    tag: dispel
    prio: 1
    note: "+50% Physical damage for itself and +20% Physical damage taken for its target. Both halves at once — the worst enrage in the dungeon to leave up."
  - id: 1249661
    name: "Feral Rage"   # auto
    # dispel: enrage · 1 sec cast · 30 yd range
    tag: dispel
    prio: 2
    note: "+20% melee haste to every ally within 30 yd. The dungeon's shared enrage."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Bolster hits from both directions — it deals 50% more and its target takes 20% more. One soothe cancels the whole thing."
---

Seven units at 5 forces each, carrying **two** enrages.

**Bolster** is the one that matters, and it is worth reading carefully because it works on both
ends: the Tuskarr deals 50% more Physical damage, *and* the target takes 20% more. Those
multiply. Twenty seconds of that on a tank already handling the rest of a Voidscar pull is a
lot.

**Feral Rage** is the shared 30-yard haste enrage that eight mobs in this dungeon cast.

Two enrages on one 5-force body is a good argument for having more than one soothe in the
group here.
