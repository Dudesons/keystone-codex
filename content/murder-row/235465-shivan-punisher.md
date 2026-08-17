---
npcId: 235465
name: "Shivan Punisher"   # auto
count: 25   # auto — forces per unit

threat: high
role: melee

spells:
  - id: 1297676
    name: "Punishing Might"   # auto
    # Instant
    tag: tank
    prio: 1
    note: "+30% Physical damage every time a melee swing misses or is dodged, stacking until one lands. Avoidance makes this mob stronger — the tank should not be dodging it."
  - id: 1297691
    name: "Whirlwind"   # auto
    # 4 sec cast · 12 yd range
    tag: dodge
    prio: 1
    note: "291k within 12 yd. Four seconds of cast to leave the circle."
  - id: 1294770
    name: "Demonic Frenzy"   # auto
    # 1 sec cast
    tag: dodge
    prio: 1
    note: "+20% haste and 29k a second to everyone, for as long as it holds. MDT records no dispel type — this is not a soothe."
  - id: 1294774
    name: "Demonic Frenzy"   # auto
    # Instant · 60 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Punishing Might rewards it for missing. A dodge-stacked tank feeds it +30% per miss until a swing finally lands — and that swing is the one that hurts."
---

Seven units at 25 forces each, and the one mob in the pool that **punishes avoidance**.

**Punishing Might** is worth reading twice: every melee attack that misses or is dodged gives
it +30% Physical damage, *stacking, until it lands one*. Dodge and parry do not reduce the
damage taken here — they defer and multiply it. That inverts the usual tanking instinct.

**Demonic Frenzy** is party-wide chip damage plus haste, and MDT gives it **no dispel type**,
so it cannot be soothed off despite reading like an enrage. Method files it as *Important*
for the same reason.
