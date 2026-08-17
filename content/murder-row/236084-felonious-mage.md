---
npcId: 236084
name: "Felonious Mage"   # auto
count: 7   # auto — forces per unit

threat: low
role: caster

spells:
  - id: 1216571
    name: "Fel Missiles"   # auto
    # Channeled (5 sec cast) · 100 yd range
    tag: kick
    prio: 1
    note: "Five seconds of missiles on one player. Interruptible, and its only real cast. The tooltip carries no damage figure."
  - id: 1216570
    name: "Fel Missiles"   # auto
    # Instant · 100 yd range
    tag: kick
  - id: 1229433
    name: "Fel Crazed"   # auto
    # dispel: magic · Instant
    tag: dispel
    prio: 2
    note: "+5% haste. Small enough to leave alone unless a dispel is going spare."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

Nine units at 7 forces each. **Fel Missiles** is a five-second channel and the only thing here
worth an interrupt — MDT's tooltip gives no damage number for it, so the reason to kick is the
duration rather than a figure this card can quote.

**Fel Crazed** is a 5% haste buff. It is dispellable as magic, and it is small enough that
spending the global elsewhere is usually right.
