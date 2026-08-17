---
npcId: 190206
name: "Ashseer Flamelasher"   # auto
count: 7   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 385536
    name: "Flaming Barrage"   # auto
    # Channeled (10 sec cast) · Unlimited range
    tag: tank
    prio: 1
    note: "97k Fire plus 242k Physical every second for 10 sec on its target. MDT declares it uninterruptible, but the mob takes every CC listed — a stun ends the channel."
  - id: 385567
    name: "Flaming Barrage"   # auto
    # Instant · 300 yd range
    tag: tank
  - id: 1305865
    name: "Flaming Barrage"   # auto
    # Instant · 300 yd range
    tag: tank
  - id: 373972
    name: "Blaze of Glory"   # auto
    # dispel: magic · Channeled (15 sec cast)
    tag: dispel
    prio: 1
    note: "On death it turns into a whirlwind of flame for 15 sec, throwing embers at 291k every 3 sec. Dispelling it ends that."
  - id: 373973
    name: "Blaze of Glory"   # auto
    # Instant
    tag: dispel
  - id: 373977
    name: "Blaze of Glory"   # auto
    # Instant · 300 yd range
    tag: dispel

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Killing it is not the end of it — Blaze of Glory runs for 15 seconds after death unless someone dispels it."
---

Nine units at 7 forces each. Both of its abilities are unusual in the same way: **neither
stops on its own, and neither is interrupted.**

**Flaming Barrage** is a ten-second channel worth roughly 3.4 million on one target. MDT does
not flag it interruptible, but the Flamelasher takes stuns, roots and every other CC in the
list — so the answer is CC, not a kick. Method flags the same ability as one to *stop*, which
is the same conclusion by another route.

**Blaze of Glory** is a posthumous ability: the corpse becomes a burning whirlwind for 15
seconds, throwing 291k embers every 3. It carries a magic dispel type, and that is what turns
a 15-second hazard into nothing.
