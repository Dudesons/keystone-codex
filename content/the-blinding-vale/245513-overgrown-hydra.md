---
npcId: 245513
name: "Overgrown Hydra"   # auto
count: 25   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1238642
    name: "Bullet Seeds"   # auto
    # 3 sec cast · Unlimited range
    tag: dodge
    prio: 1
    note: "339k Nature to anyone caught in it — the largest avoidable hit in the trash. Method reads it as a frontal, so the answer is to be out of the arc, not out of range."
  - id: 1238638
    name: "Bullet Seeds"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 1238368
    name: "Lightmaw Beams"   # auto
    # 2 sec cast · 100 yd range
    tag: dodge
    prio: 2
    note: "Every head beams a different target: 58k every second for 6 sec within 4 yd of each one. Spread, or one beam covers three players."
  - id: 1238463
    name: "Lightmaw Beams"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Lightmaw Beams targets several players at once and only reaches 4 yards. Stacked, the group takes every beam; spread, it takes one each."
---

Seven units at 25 forces each — 26% of the required count, the third-heaviest mob in the
dungeon behind the Sporeblight Belcher and the Lightgorged Lasher.

**Bullet Seeds** is 339k, the hardest avoidable hit anywhere in the Vale's trash, on a
three-second cast. Nobody should be taking it twice.

**Lightmaw Beams** rewards the opposite instinct to most party damage: each head picks its own
target and the radius is only 4 yards, so the cast is cheap if the group is spread and
expensive if it is stacked. The two abilities therefore want different footing, which is what
makes this mob awkward rather than merely hard.
