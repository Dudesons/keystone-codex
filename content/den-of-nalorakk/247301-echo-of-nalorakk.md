---
npcId: 247301
name: "Echo of Nalorakk"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# MDT flags this a boss because the game does. It has 3.4M health against Nalorakk's 21.9M and
# is fought during his encounter, so no group plans a pull around it: `rank` says so, and the
# ring now follows threat rather than being gold regardless. Rating it would be worth doing.
threat:
role: add
rank: miniboss

spells:
  - id: 1255570
    name: "Spectral Slash"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "Knocks nearby players back and leaves 78k every 2 sec for 12 sec, stacking. Standing next to several Echoes is how the stacks pile up."
  - id: 1255577
    name: "Spectral Slash"   # auto
    # Instant · 300 yd range
    tag: dodge
  - id: 1262577
    name: "Spectral Slash"   # auto
    # Instant · 300 yd range
    tag: dodge
  - id: 1242976
    name: "Echoing Maul"   # auto
    tag: dodge
    note: "MDT lists it here with no tooltip text; the boss's own version deals 194k within 8 yd."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Every Echo left standing charges again on the next Fury of the War God. They are not a phase — they are a growing count."
---

Left behind by [Nalorakk](#/d/den-of-nalorakk/codex/mob/246404)'s **Echoing Maul**, and the reason
the fight escalates.

An Echo does not vanish when it has charged. The tooltip is specific: each one *remains for
one additional Fury of the War God, then vanishes* — so the number that has to be intercepted
grows before it shrinks.

**Spectral Slash** is what they contribute in the meantime: a knockback and a stacking 12-second
bleed on anyone nearby. Since intercepting the charges means standing in their path, the group
is choosing to be near them, and the stacks are the cost of doing the fight correctly.
