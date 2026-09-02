---
npcId: 235267
name: "Wrathguard Flayer"   # auto
count: 5   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 1214922
    name: "Fel Rage"   # auto
    # dispel: enrage · 3.5 sec cast
    tag: kick
    prio: 1
    note: "-60% damage taken and immunity to crowd control, for a full minute. Kickable *and* an enrage — two chances to stop it, and missing both stalls the pull."
  - id: 1295426
    name: "Flay"   # auto
    # Instant · 100 yd range
    tag: dispel
    prio: 2
    note: "Charges a player for 58k plus a 3-second bleed."
  - id: 1295427
    name: "Flay"   # auto
    # Instant · 100 yd range
    tag: dispel

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Fel Rage makes it take 60% less damage and immune to CC for a minute. Kick it, or soothe it — a minute is longer than the pull was meant to last."
---

Eleven units at 5 forces each, and a cast that is worth far more than the mob is.

**Fel Rage** is a defensive dressed as an enrage: 60% damage reduction *and* crowd-control
immunity, for **one minute**. Against a 5-force body that is absurd, and it is why a pull with
several Flayers can grind to a halt.

The good news is that MDT flags it both **interruptible** and **enrage** — so the kick is the
first answer and a soothe is the second. Groups have to miss twice for it to matter.
