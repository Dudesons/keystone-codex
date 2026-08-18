---
npcId: 252053
name: "Brutal Overseer"   # auto
count: 25   # auto — forces per unit

threat: high
role: melee

spells:
  - id: 1298900
    name: "Brutal Slams"   # auto
    # 2 sec cast
    tag: dodge
    prio: 1
    note: "Shields itself, then slams every 1.5 sec for 30 seconds, each slam 10% harder than the last. Break the shield — that is what ends it."
  - id: 1298901
    name: "Brutal Slams"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1228126
    name: "Macestorm"   # auto
    # Instant
    tag: dodge
    prio: 2
    note: "Charges a random player and spins for 78k a second inside 8 yd for 6 sec. It picks its target, so anyone can be the one to walk it away."
  - id: 1228127
    name: "Macestorm"   # auto
    # Instant
    tag: dodge
  - id: 1261645
    name: "Macestorm"   # auto
    # Instant · 60 yd range
    tag: dodge
  - id: 1310309
    name: "Macestorm"   # auto
    # Channeled (6 sec cast) · 100 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Brutal Slams ramps 10% per slam for thirty seconds. Left to run its course, the last slams hurt several times more than the first — the shield is the off switch."
---

Eight units at 25 forces each: 27% of the dungeon, tied with the
[Agitated Voidscythe](#/d/voidscar-arena/map/mob/263228) for second heaviest.

**Brutal Slams** is a ramp with a visible brake. Twenty slams over thirty seconds, each 10%
stronger, starting at 48k party-wide — the arithmetic gets ugly quickly. The shield it puts on
itself is the timer, so breaking the absorb is the answer rather than out-healing the ramp.

**Macestorm** charges a **random** player rather than the tank, so the whole group needs to be
ready to move rather than just watching the tank.
