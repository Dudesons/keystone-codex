---
npcId: 268729
name: "Faithless Tormentor"   # auto
count: 0   # auto — forces per unit

# The Avatar of Sethraliss encounter version. Worth no forces.
threat:
role: add

spells:
  - id: 1300704
    name: "Fixate"   # auto
    # Channeled · 60 yd range
    tag: dodge
    prio: 1
    note: "Fixates the healer and takes 5% of their healing done per strike, stacking. Four of them, in the fight where healing is already blocked on the boss."
  - id: 1300714
    name: "Shadowlash"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "They hunt the healer during the Avatar fight, stripping 5% of healing per hit. In an encounter built on surviving Corruption stacks, that is the wrong thing to ignore."
---

Four of the [trash Tormentors](#/d/temple-of-sethraliss/map/mob/268317) inside the
[Avatar](#/d/temple-of-sethraliss/map/mob/133392) encounter, at 0.5 million health each.

They do the same thing — fixate the healer, take 5% of their healing per strike, stacking — and
the timing makes it worse. The Avatar fight asks a player to carry **Corruption** at +300%
Physical damage taken for fifteen seconds. That player needs the healer working.
