---
npcId: 243983
name: "Sycophantic Tarasek"   # auto
count: 4   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1250043
    name: "Melt Armor"   # auto
    # dispel: magic · Instant · 60 yd range
    tag: dispel
    prio: 1
    note: "+10% Fire damage taken for 10 sec, plus a small pulse. Dispellable as magic. Its damage figures are unscaled and not quoted here."
  - id: 1249661
    name: "Feral Rage"   # auto
    # dispel: enrage · 1 sec cast · 30 yd range
    tag: dispel
    prio: 1
    note: "+20% melee haste to every ally within 30 yd. The dungeon's shared enrage."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Two different dispels on one mob — Melt Armor is magic, Feral Rage is an enrage. Knowing which is which is the whole card."
---

Eight units at 4 forces each, and a neat illustration of why Voidscar Arena asks so much of
dispels.

**Melt Armor** is a **magic** debuff raising Fire damage taken. **Feral Rage** is an **enrage**
buffing every ally nearby. Same mob, two entirely different removals, neither substituting for
the other.

The damage values on Melt Armor are **unscaled** in the data — it reads as 10 Fire in a 0-yard
radius — so only the +10% Fire taken is quoted here, which is the part that behaves.
