---
npcId: 250202
name: "Newborn Potadpole"   # auto
count: 0   # auto — forces per unit

# Hatched from a Potadpole Egg during the Potatoad Matriarch, and worth no forces.
threat:
role: add

spells:
  - id: 1250829
    name: "Potad-Toss"   # auto
    # 2 sec cast · 40 yd range
    tag: dodge
    prio: 1
    note: "48k and a knockback. The damage is trivial; being thrown somewhere else during a Toxic Spew is not."
  - id: 1250831
    name: "Potad-Toss"   # auto
    # Instant · 40 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "The knockback is the whole ability. Several of these at once will move the group out of position rather than kill anyone."
---

What a [Potadpole Egg](#/d/the-blinding-vale/codex/mob/249783) becomes when nobody breaks it.

**Potad-Toss** deals 48k, which is nothing, and knocks the target back, which is not. Method
flags it as an ability to stop for that reason. A handful of these leaping at the group during
the Matriarch's **Toxic Spew** turns a dispel check into a scramble.
