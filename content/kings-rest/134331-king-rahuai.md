---
npcId: 134331
name: "King Rahu'ai"   # auto
count: 25   # auto — forces per unit

threat: medium
role: miniboss

spells:
  - id: 1296671
    name: "Captain's Bulwark"   # auto
    # dispel: magic · 2.5 sec cast · 60 yd range
    tag: dispel
    prio: 1
    note: "-30% damage taken for its allies. MDT does not flag it interruptible, but it *is* dispellable as magic — that is the answer."
  - id: 270889
    name: "Overload"   # auto
    tag: dodge
    prio: 1
    note: "Beams of lightning around it every 0.3 sec for 4 sec. Get out of the circle and stay out for the duration."
  - id: 270891
    name: "Overload"   # auto
    # Instant · Unlimited range
    tag: dodge
    note: "102k within 10 yd, per beam."
  - id: 1296719
    name: "Forked Lightning"   # auto
    # 2.5 sec cast · 100 yd range
    tag: dodge
    prio: 2
    note: "78k on the target, bouncing to two more. Spread and the bounces have fewer places to land."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Captain's Bulwark cuts damage to the pack by 30% and cannot be interrupted. It is a magic dispel — strip it rather than pushing through it."
---

One unit at 25 forces, and the mob that makes the case for reading dispel types.

**Captain's Bulwark** gives allies 30% damage reduction. MDT does **not** list it as
interruptible, so a group waiting for a kick will simply watch it land — but it carries a
**magic** dispel type, which most groups can answer. Three different mobs in King's Rest cast
this same spell: Rahu'ai, [Seneschal M'bara](#/d/kings-rest/mob/134251) and
[Guard Captain Atu](#/d/kings-rest/mob/137473).

**Overload** is four seconds of lightning around itself at 102k a beam — the cast to walk away
from rather than to trade with.
