---
npcId: 187969
name: "Deepstone Earthshaper"   # auto
count: 5   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1305225
    name: "Tectonic Strike"   # auto
    # Instant · Unlimited range
    tag: tank
    prio: 1
    note: "Raises the tank's damage taken by 25% for 8 sec, and it stacks. Three or four applications turn every other hit in the pack into a problem."
  - id: 371471
    name: "Shape Earth"   # auto
    # Channeled · 10 yd range
    tag: ignore
    note: "Out-of-combat flavour channel on an elemental."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Tectonic Strike stacks +25% damage taken on the tank. Pulled with anything that hits hard, that multiplier is what kills, not this mob."
---

Nine units at 5 forces each. Its own damage is unremarkable; what it does is make everything
pulled with it hurt more.

**Tectonic Strike** is an instant, so there is nothing to interrupt. It takes the full CC
list, which is the only real lever — and the reason it matters is arithmetic: at four stacks
the tank is taking twice what the healer planned for, from mobs that were never the concern.
