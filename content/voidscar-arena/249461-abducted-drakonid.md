---
npcId: 249461
name: "Abducted Drakonid"   # auto
count: 5   # auto — forces per unit

threat: low
role: caster

spells:
  - id: 1249238
    name: "Fire Spit"   # auto
    # dispel: magic · Instant · 60 yd range
    tag: dispel
    prio: 1
    note: "242k on impact plus 48k a second for 10 sec, from several fireballs at once. Dispellable as magic — and it is instant, so there is nothing to interrupt."
  - id: 1249236
    name: "Fire Spit"   # auto
    # Instant · 60 yd range
    tag: dispel
  - id: 1249661
    name: "Feral Rage"   # auto
    # dispel: enrage · 1 sec cast · 30 yd range
    tag: dispel
    prio: 2
    note: "+20% melee haste to every ally within 30 yd."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Fire Spit is instant and hits several places at once — nothing to kick and little to dodge. The dispel is the only real answer."
---

One unit at 5 forces, and unusual for this dungeon in having nothing to interrupt.

**Fire Spit** throws multiple fireballs for 242k on impact and a ten-second burn at 48k a
second. It is instant, so the group cannot pre-empt it; the ten-second burn is where the
answer lives, and MDT flags it **magic**.
