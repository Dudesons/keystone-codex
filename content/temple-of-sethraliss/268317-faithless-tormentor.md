---
npcId: 268317
name: "Faithless Tormentor"   # auto
count: 5   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1300704
    name: "Fixate"   # auto
    # Channeled · 60 yd range
    tag: dodge
    prio: 1
    note: "It fixates on the healer specifically and takes 5% of their healing done per strike, stacking. Not the tank's problem to solve — the healer has to kite."
  - id: 1300714
    name: "Shadowlash"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "The strike that applies it. Every hit is another 5% off the group's healing."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It goes for the healer by design and eats 5% of their healing per hit, stacking. Kill it early — this is the mob that quietly ends long pulls."
---

Four units at 5 forces each, and the only mob in the pool that **targets the healer on
purpose**.

The tooltip is explicit: it *attempts to fixate upon the closest enemy healer and reduces
their healing done upon striking by 5%*, stacking. Nothing about that is a tank's problem to
absorb, and it is immune to every crowd control MDT lists.

Four of them, unchecked, is a healer at a fraction of their throughput while the rest of the
dungeon is still hitting normally. Worth 5 forces, worth killing first.
