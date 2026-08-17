---
npcId: 241874
name: "Frostfang"   # auto
count: 5   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1241226
    name: "Bloodrush"   # auto
    # Instant
    tag: tank
    prio: 1
    note: "+60% movement and attack speed for 10 sec. MDT does not flag it as an enrage, so a soothe is not guaranteed to work — plan on kiting or mitigating instead."
  - id: 1265400
    name: "Frostbite"   # auto
    # Instant · Melee Range
    tag: tank
    note: "68k on the current target. Small on its own; it is the attack speed that multiplies it."
  - id: 1265402
    name: "Frostbite"   # auto
    # Instant
    tag: tank

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Bloodrush is a 60% attack speed buff that MDT does not list as an enrage — do not count on soothing it away."
---

Eighteen units at 5 forces each: the wolves. Individually forgettable, and dangerous in the
way packs usually are.

**Frostbite** is 68k a bite. **Bloodrush** makes them bite 60% faster for 10 seconds, and move
60% faster too, which also makes them harder to kite away from.

Worth flagging honestly: Method files Bloodrush as a buff, and MDT records **no dispel type**
for it. Neither source calls it an enrage, so a soothe may simply not apply. Treat the ten
seconds as something to mitigate rather than remove.
