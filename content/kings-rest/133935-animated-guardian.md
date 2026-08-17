---
npcId: 133935
name: "Animated Guardian"   # auto
count: 22   # auto — forces per unit

threat: high
role: melee

spells:
  - id: 270016
    name: "Released Inihibitors"   # auto
    # Instant
    tag: tank
    prio: 1
    note: "+75% attack speed. MDT records no dispel type, so this is not a soothe — it is a cooldown."
  - id: 270003
    name: "Suppression Slam"   # auto
    # 3.5 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "A frontal cone that stuns for 2.5 sec. The tooltip's damage reads as 0 and is unscaled — the stun is the ability."
  - id: 1310755
    name: "Heavy Slams"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 2
    note: "24k to everyone on each melee swing. Steady, unavoidable, and shared with both Constructs."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Suppression Slam stuns for two and a half seconds in a frontal cone. Only Taunt works on this mob, so the stun cannot be pre-empted — stay out of the cone."
---

Four units at 22 forces each, the heaviest trash in King's Rest.

**Suppression Slam** is the one to respect, and not for its damage: the tooltip's figure is
unscaled and reads as zero, while the **2.5-second stun** is real. Getting stunned in front of
a mob with +75% attack speed is the failure case.

That attack speed comes from **Released Inhibitors**, and it is worth being precise about it —
MDT gives it **no dispel type at all**, so a soothe is not the answer. It has to be tanked
through.

MDT lists **Taunt** as the only crowd control this mob answers to.
