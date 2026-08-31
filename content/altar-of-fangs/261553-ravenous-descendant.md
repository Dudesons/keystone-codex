---
npcId: 261553
name: "Ravenous Descendant"   # auto
count: 5   # auto — forces per unit

threat: medium
role: melee

spells:

  - id: 1306308
    name: "Ravenous"   # auto
    # dispel: enrage
    tag: dispel
    prio: 1
    note: "Dispel the enrage or the tank is at real risk of dying."

  - id: 1306333
    name: "Ravenous Claws"   # auto
    # Instant
    tag: tank
    note: "Each melee swing raises its attack speed by 10% for 2 sec, stacking. Kite it and the stacks fall off on their own."

  - id: 1306338
    name: "Ravenous Claws"   # auto
    # Instant · Unlimited range
    tag: tank

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Dispel the enrage, and kite to drop the Ravenous Claws stacks. Left to melee freely with the enrage up, it kills the tank — a mob worth 5 forces."
---

Nineteen units spread over nine packs — the most ubiquitous mob in the dungeon, and the one
whose damage is easiest to underestimate. Individually it is worth 5 forces; collectively it
is what kills tanks.

The two abilities tell one story. **Ravenous Claws** adds 10% attack speed per swing and
lasts only 2 seconds, so it ramps while the mob is in contact and decays the moment it is
not. **Ravenous** enrages it on top. Neither is dangerous alone; together, on a pack holding
five of them, the tank's damage taken climbs faster than the healer expects.

Hence the two answers, and they are different in kind: **dispel** removes the enrage,
**kiting** removes the stacks. Doing only the first still leaves a mob swinging at full ramp.

The enrage is declared dispellable by MDT, so the `D` badge shows without anything being
written here — but a badge is not a priority. That is what the note is for.
