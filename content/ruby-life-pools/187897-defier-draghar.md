---
npcId: 187897
name: "Defier Draghar"   # auto
count: 30   # auto — forces per unit

threat: high
role: melee
rank: miniboss

spells:
  - id: 372047
    name: "Steel Barrage"   # auto
    # 1 sec cast · Unlimited range
    tag: tank
    prio: 1
    note: "242k on the tank every half-second for 3 sec, and every strike also sends a nova through the party. Tank damage and party damage from one cast."
  - id: 372794
    name: "Steel Barrage"   # auto
    # Instant · Unlimited range
    tag: tank
  - id: 1309705
    name: "Steel Barrage"   # auto
    # Instant
    tag: tank
  - id: 372087
    name: "Blazing Rush"   # auto
    # 4 sec cast · Unlimited range
    tag: dodge
    prio: 1
    note: "Charges a player, 388k to everything in the line, and leaves a 10-second bleed on whoever it clipped. Get out of the path, not out of the landing spot."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Blazing Rush damages the whole line it travels, not just its target — the party clears the path, the target does not run down it."
---

Thirty forces on one 9.7-million-health body, and it detects stealth, so it is a fight rather
than a skip.

**Steel Barrage** is the ability that pays twice: six strikes at 242k on the tank over three
seconds, each one throwing a fire nova at everyone within 60 yards and dropping a Molten Steel
fragment. It is the tank buster and the party damage in one cast, which is why cooldowns line
up on it rather than on the charge.

**Blazing Rush** is a line, not a point. The bleed it leaves behind runs for 10 seconds on
anyone it touched on the way through.
