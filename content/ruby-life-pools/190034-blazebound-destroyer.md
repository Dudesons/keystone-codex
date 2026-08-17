---
npcId: 190034
name: "Blazebound Destroyer"   # auto
count: 25   # auto — forces per unit

threat: lethal
role: melee

spells:
  - id: 1305955
    name: "Fiery Blast"   # auto
    # 4 sec cast · 60 yd range
    tag: kick
    prio: 1
    note: "359k Fire on the current target, and the only cast it makes that can be stopped. Immune to every CC but Taunt, so the interrupt is the whole answer."
  - id: 373692
    name: "Inferno"   # auto
    # 3.5 sec cast
    tag: dodge
    note: "97k to everyone within 60 yd, then 39k per second for 5 sec. Not interruptible — healer damage, planned for rather than reacted to."
  - id: 373614
    name: "Burnout"   # auto
    # 5 sec cast
    tag: dodge
    note: "485k within 20 yd when it dies. Melee has to walk out on the kill, not after it."
  - id: 384139
    name: "Summon Scorchlings"   # auto
    # 1.5 sec cast
    tag: dodge
    note: "Spawns Scorchlings, which leave a fire pool where they die."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It explodes for 485k in 20 yards when it dies — move out as the health bar empties, not once it has."
---

Four units at 25 forces each: **18% of the dungeon on one mob**, more than any other in Ruby
Life Pools. Whatever the route, it gets pulled.

It answers to Taunt and to nothing else — no stun, no root, no slow. So the two ways of
handling a caster do not apply here, and **Fiery Blast** has to be interrupted on cadence
rather than CC'd away.

The death explosion is what actually kills people. **Burnout** is a 5-second cast that lands
485k inside 20 yards, and a melee group that keeps swinging to squeeze the last few percent
takes it in full.
