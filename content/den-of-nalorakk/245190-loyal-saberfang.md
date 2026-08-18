---
npcId: 245190
name: "Loyal Saberfang"   # auto
count: 5   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1246865
    name: "Bestial Wrath"   # auto
    # dispel: enrage · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "+25% damage for 10 sec, shared with its Beasttamer. One soothe covers both."
  - id: 1246882
    name: "Fixate"   # auto
    # Channeled (12 sec cast) · Unlimited range
    tag: dodge
    prio: 1
    note: "Twelve seconds fixated on one player. It cannot be taunted off — whoever it picked has to kite it."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Fixate runs twelve seconds and ignores the tank. The target kites; nobody taunts."
---

Four units at 5 forces each, always beside a
[Bonded Beasttamer](#/d/den-of-nalorakk/map/mob/245145).

**Fixate** is the part that changes what the group does: twelve seconds locked onto one player,
with no tank interaction available. The correct answer is the target running, and everyone
else ignoring it.

One discrepancy worth recording: Method lists a **Shred Armor** tank buster on this mob, and
MDT holds no such spell for it. The card follows MDT, which is where the map and the badges
come from — but if Shred Armor shows up in game, MDT is the source that is incomplete.
