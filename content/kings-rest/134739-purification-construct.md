---
npcId: 134739
name: "Purification Construct"   # auto
count: 25   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 270293
    name: "Purification Strike"   # auto
    # 2 sec cast · Unlimited range
    tag: dodge
    prio: 1
    note: "175k to everyone and it lays down a zone burning for 145k a second. The damage is survivable; the floor it leaves is what accumulates."
  - id: 270292
    name: "Purifying Flame"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "The zone itself: 145k every second to anyone who walks in."
  - id: 1310755
    name: "Heavy Slams"   # auto
    # Instant · 100 yd range
    tag: dodge
    note: "24k to everyone on each melee swing."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Every Purification Strike burns another patch of floor at 145k a second. Fight it where the group can afford to lose the ground."
---

One unit at 25 forces, and a mob that shrinks the room it is fought in.

**Purification Strike** is party-wide damage with a lasting consequence attached: each cast
leaves a **Purifying Flame** zone doing 145k a second. Nothing cleans them up, so the fight
gets more cramped the longer it runs — which makes where the pull happens a decision worth
making before the pull rather than during it.

Only **Taunt** applies.
