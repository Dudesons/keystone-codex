---
npcId: 243835
name: "Savage Shredclaw"   # auto
count: 5   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1233535
    name: "Shred Defense"   # auto
    # Instant · 60 yd range
    tag: tank
    prio: 1
    note: "145k, and +20% damage taken for 10 sec. The multiplier is the ability; the hit is incidental."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "+20% damage taken for ten seconds, on a mob pulled alongside 679k hits and 873k charges. It is the amplifier, not the damage."
---

Nineteen units at 5 forces each, and one instant ability with no counterplay of its own.

**Shred Defense** raises the target's damage taken by 20% for 10 seconds. On its own that is
nothing. In a dungeon where the neighbours are hitting for 679k
([Agitated Voidscythe](#/d/voidscar-arena/mob/263228)) and 873k
([Watchful Harrower](#/d/voidscar-arena/mob/245950)), 20% is a large number attached to
someone else's cast.

Which is why it belongs in the pull order rather than in the tank's reaction list.
