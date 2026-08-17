---
npcId: 135562
name: "Poisonous Viper"   # auto
count: 7   # auto — forces per unit

threat: low
role: caster

spells:
  - id: 1308148
    name: "Cytotoxin"   # auto
    # dispel: poison · Instant · Unlimited range
    tag: dispel
    prio: 1
    note: "73k plus 39k a second for 10 sec. MDT flags it both interruptible and a poison — though it is listed as instant, so the dispel is the reliable answer."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Six units at 7 forces each, with one ability.

**Cytotoxin** is a ten-second poison worth about 460k on its target. The data is slightly at
odds with itself here — MDT records the spell as **interruptible** *and* instant-cast, which
leaves nothing to interrupt. The **poison dispel** is what will actually work.

The viper takes Stun, Fear, Root, Slow, Disorient and Sap, so controlling it is the other
option.
