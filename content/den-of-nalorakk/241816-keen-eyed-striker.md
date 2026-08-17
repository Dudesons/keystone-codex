---
npcId: 241816
name: "Keen-Eyed Striker"   # auto
count: 7   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1238439
    name: "Razor Dive"   # auto
    # dispel: bleed · Instant · 50 yd range
    tag: dispel
    prio: 1
    note: "Leaps to a player and bleeds them for 34k a second over 10 sec, stacking. Sixteen of these birds means the stacks are the real damage."
  - id: 1238440
    name: "Razor Dive"   # auto
    # Instant · 50 yd range
    tag: dispel

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Razor Dive stacks and it picks its own target, not the tank. It is a bleed — the healer's magic dispel will not clear it."
---

Sixteen units at 7 forces each, with one ability that only becomes a problem in numbers.

**Razor Dive** is 34k a second for 10 seconds, which is manageable once. It **stacks**, and
the birds pick their own targets rather than the tank's, so a pull holding several of them
concentrates several applications on whoever they happened to choose.

The dispel type is **bleed**, not magic — the distinction that decides whether the group has
an answer at all.
