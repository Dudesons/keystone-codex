---
npcId: 245146
name: "Grizzled Warbringer"   # auto
count: 25   # auto — forces per unit

threat: high
role:
rank: miniboss

spells:
  - id: 1246957
    name: "Primal Echo"   # auto
    tag: dodge
    prio: 1
    note: "Party-wide damage within 60 yd plus a bleed that stacks and ignores armour. The tooltip's figures are unscaled and not worth quoting; the stacking is the point."
  - id: 1246986
    name: "Poison Spear Volley"   # auto
    tag: dodge
    prio: 1
    note: "Spears rain down, hitting within 4 yd of each impact. Avoidable — watch the ground. The tooltip figure is unscaled."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Primal Echo stacks and ignores armour. It is a ramp, not a hit — the longer the pull runs, the faster the group loses health."
---

Three units at 25 forces each, and one of the mobs Method singles out as *Tough*.

Both of its abilities carry **unscaled tooltip values** in the data — Primal Echo reads as 10
damage, Poison Spear Volley as 35, next to neighbours dealing six figures. Those numbers are
placeholders, not the real thing, so this card quotes none of them.

What can be said is structural, and it is enough: **Primal Echo** is party-wide, it **stacks**,
and it **ignores armour**, so the tank's mitigation does not apply and the damage grows with
the length of the fight. **Poison Spear Volley** is ground damage and entirely avoidable.
