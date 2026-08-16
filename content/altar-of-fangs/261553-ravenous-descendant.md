---
npcId: 261553
name: "Ravenous Descendant"   # auto
count: 5   # auto — forces per unit

threat: high
role: melee

spells:
  - id: 1221063
    name: "Xal'atath's Gift"   # auto
    # Instant
    tag: ignore
    note: "Sub-12 affix, rotated weekly. Not a trait of this mob."

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
    note: "Melee swings raise its attack speed by 20%, stacking. This is what the enrage feeds."

  - id: 1306338
    name: "Ravenous Claws"   # auto
    # Instant · Unlimited range
    tag: tank

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Dispel the enrage. Left up, it stacks with Ravenous Claws and the tank dies to a mob worth 5 forces."
---

Nineteen units spread over nine packs — the most ubiquitous mob in the dungeon, and the one
whose damage is easiest to underestimate. Individually it is worth 5 forces; collectively it
is what kills tanks.

The three abilities tell one story: **Ravenous Claws** ramps its attack speed on every swing,
**Ravenous** enrages it, and neither is dangerous alone. Together, on a pack holding five of
them, the tank's damage taken climbs faster than the healer expects.

The enrage is declared dispellable by MDT, so the `D` badge shows without anything being
written here — but a badge is not a priority. That is what the note is for.
