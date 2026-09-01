---
npcId: 235265
name: "Corrupted Warlock"   # auto
count: 25   # auto — forces per unit

threat: high
role: caster

spells:
  - id: 1217973
    name: "Curse of Doom"   # auto
    # dispel: curse · 1.5 sec cast · 100 yd range
    tag: dispel
    prio: 1
    note: "582k after 10 seconds, split among players within 4 yards of the target. Either dispel it as a curse, or stack on the carrier — alone, it kills."
  - id: 1294789
    name: "Curse of Doom"   # auto
    # Instant · 100 yd range
    tag: dispel
  - id: 1297684
    name: "Dark Pact"   # auto
    # 1.5 sec cast
    tag: dodge
    prio: 1
    note: "Sacrifices 10% of its health to shield itself for 30% — a net gain of 20%. Not interruptible in MDT, so it simply has to be out-damaged."
  - id: 1297686
    name: "Dark Pact"   # auto
    # Instant
    tag: dodge
  - id: 1297682
    name: "Drain Life"   # auto
    # 2 sec cast · 100 yd range
    tag: dodge
    prio: 2
    note: "Drains a player every second and heals itself with it."
  - id: 1297683
    name: "Drain Life"   # auto
    # Instant · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Curse of Doom is 582k in ten seconds, split among whoever is within 4 yards. Dispel it — or make sure the carrier is not standing alone when it lands."
---

Four units at 25 forces each, and the mob whose mechanics have two correct answers each.

**Curse of Doom** gives the group ten seconds to decide. It is dispellable as a **curse**,
which most groups will not have; failing that, the 582k is *split among players within 4
yards*, so stacking on the carrier turns a lethal hit into a survivable one. Doing neither
kills whoever it landed on.

**Dark Pact** and **Drain Life** are both self-sustain, and neither is flagged interruptible —
so this mob undoes damage and there is no cast to stop. It just has to die faster than it
heals.
