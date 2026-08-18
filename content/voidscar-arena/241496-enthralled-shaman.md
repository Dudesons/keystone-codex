---
npcId: 241496
name: "Enthralled Shaman"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1246820
    name: "Magma Totem"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "36k Fire to all players every 0.3 sec — roughly 120k a second, party-wide, until the totem dies. Kill the totem before anything else."
  - id: 1228176
    name: "Lava Bolt"   # auto
    # 2.5 sec cast · 40 yd range
    tag: kick
    prio: 2
    note: "116k on one player. Interruptible, and far less urgent than the totem."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "The totem does more damage than the shaman. Kill the object, not the caster."
---

Nine units at 7 forces each, and the same **Magma Totem** that appears in Den of Nal'orakk —
around 120k a second to the entire party, regardless of range or position, for as long as the
[totem](#/d/voidscar-arena/map/mob/248666) stands.

Everything else is secondary. **Lava Bolt** is a normal interruptible cast at 116k on one
target; spending a kick on it while a totem is up is the mistake this card exists to prevent.
