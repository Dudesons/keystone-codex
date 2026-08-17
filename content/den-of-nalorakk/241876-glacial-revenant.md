---
npcId: 241876
name: "Glacial Revenant"   # auto
count: 7   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1239860
    name: "Cryo Surge"   # auto
    # dispel: magic
    tag: dispel
    prio: 1
    note: "48k to everyone within 4 yd of the target. Dispellable as magic, or simply spread out — 4 yards is a small circle."
  - id: 1239871
    name: "Cryo Surge"   # auto
    # Instant · 100 yd range
    tag: dispel
  - id: 1266178
    name: "Snowdrift"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 2
    note: "On death it leaves deep snow: -40% movement speed, and immunity to forced movement for anyone standing in it. Both halves are worth knowing."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "The snow it leaves on death slows you by 40% — but it also makes you immune to knockbacks. In a wing full of squalls and tempests, that is not purely a downside."
---

Eight units at 7 forces each. **Cryo Surge** is a small hit with a 4-yard radius, so spreading
handles it without spending a dispel.

**Snowdrift** is the interesting one, and it is worth reading twice. It leaves a patch on
death that slows by 40% *and grants immunity to forced movement effects*. The Sentinel of
Winter's wing is full of knockbacks — Raging Squall, Frozen Tempest, Rimeshatter — and this is
a patch of ground that ignores them. Whether that is ever worth the slow is a judgement, but
the tooltip is explicit about the trade.
