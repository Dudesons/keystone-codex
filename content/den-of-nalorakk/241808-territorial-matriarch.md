---
npcId: 241808
name: "Territorial Matriarch"   # auto
count: 8   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1238053
    name: "Mother's Wrath"   # auto
    # dispel: enrage · Instant · 40 yd range
    tag: dispel
    prio: 1
    note: "+50% damage and +50% movement speed to every bear within 40 yd, for a full minute, stacking. Dispel it — it is an enrage, and letting two land is how tanks die here."
  - id: 1241219
    name: "Matriarch's Vigil"   # auto
    tag: ignore
    note: "MDT lists it with no tooltip text. Nothing can be said about it from the data."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Mother's Wrath lasts a minute and stacks, and the cubs cast it too. One dispel is not enough — every cry has to be answered."
---

Sixteen units at 8 forces each, and the mob that sets the pace of every bear pull.

**Mother's Wrath** is a 40-yard, one-minute, stacking enrage on every bear nearby. The
duration is the problem: a minute is longer than most pulls, so an application that goes
unanswered is effectively permanent, and the next one lands on top of it.

It is declared an **enrage** by MDT, which means the answer is a soothe rather than a magic
dispel. And the same ability belongs to the
[Curious Yearling](#/d/den-of-nalorakk/map/mob/241809) — worth no forces, nineteen of them on the
map, and casting the identical buff.
