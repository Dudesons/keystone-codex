---
npcId: 136076
name: "Agitated Nimbus"   # auto
count: 25   # auto — forces per unit

threat: high
role: caster

spells:
  - id: 1293464
    name: "Accumulate Charge"   # auto
    # dispel: magic
    tag: dispel
    prio: 1
    note: "+8% damage per stack, up to three. Dispellable as magic — and stripping the stacks also empties what Release Charge pays out."
  - id: 1310739
    name: "Accumulate Charge"   # auto
    # dispel: magic · Instant
    tag: dispel
  - id: 1293475
    name: "Release Charge"   # auto
    tag: dodge
    prio: 1
    note: "145k to everyone, spending whatever Accumulate Charge built. Dispelling the stacks first is what makes this cheap."
  - id: 1293650
    name: "Call Lightning"   # auto
    tag: dodge
    prio: 1
    note: "291k within 6 yd of the impact. Small circle, big number."
  - id: 1293652
    name: "Call Lightning"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Accumulate Charge is magic-dispellable, and it feeds Release Charge. Strip the stacks and the party-wide hit arrives with nothing behind it."
---

Three units at 25 forces each, and one of the cleanest dispel plays in the pool.

**Accumulate Charge** is a stacking +8% damage buff, capped at three applications, and MDT
flags it **magic dispellable**. **Release Charge** then spends what was accumulated on a 145k
party-wide hit.

So a dispel here is not damage mitigation on one target — it defuses the ability that follows.
Groups that treat the buff as too small to bother with pay for it a cast later.

Only **Taunt** applies.
