---
npcId: 245346
name: "Virid Grovekeeper"   # auto
count: 20   # auto — forces per unit

threat: high
role: melee

spells:
  - id: 1237855
    name: "Earthrupture Strike"   # auto
    # 2.5 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "533k Physical on the tank, and it leaves Ruptured Earth underneath. The hit is survivable; standing in what it creates is what is not."
  - id: 1237858
    name: "Ruptured Earth"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "48k every second and a 40% slow, on the ground where the tank was standing. Move the mob after every buster."
  - id: 1255205
    name: "Uproot"   # auto
    # 3 sec cast · 50 yd range
    tag: dodge
    prio: 2
    note: "116k and a knockback, at each player's own location. Nowhere to run to — it is the knockback that matters, so watch what is behind you."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Every tank buster leaves a slowing pool where the tank stood. Walk it forward each time, or the tank ends up fighting inside a stack of them."
---

Six units at 20 forces each. Its abilities compound rather than spike, which is what catches
groups that read the tooltips one at a time.

**Earthrupture Strike** is a 533k tank hit that also paves the ground with **Ruptured Earth** —
48k a second and a 40% slow. Take three of them without moving and the tank is standing in
three overlapping pools, slowed, when **Uproot** knocks everyone back.

The whole answer is footwork: the tank drags the mob a few yards after each buster, and the
group keeps an eye on where a knockback would send them.
