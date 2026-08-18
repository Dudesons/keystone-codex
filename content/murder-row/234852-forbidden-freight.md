---
npcId: 234852
name: "Forbidden Freight"   # auto
count: 0   # auto — forces per unit

# The crates of the Zaen encounter — cover and hazard at once. Worth no forces.
threat:
role: add

spells:
  - id: 1266241
    name: "Freight Explosion"   # auto
    # 5 sec cast
    tag: dodge
    prio: 1
    note: "Hit by a Fire Bomb or Murder in a Row, it detonates after 5 sec for 291k with a knockback. Five seconds of warning, and one fewer piece of cover afterwards."
  - id: 1217099
    name: "Fel-Infused Freight"   # auto
    # Instant
    tag: kick
    prio: 1
    note: "58k to everyone every 3 sec while it stands. MDT flags it interruptible — the cover is not free."
  - id: 1219631
    name: "Fel-Infused Freight"   # auto
    # Instant · 100 yd range
    tag: kick
  - id: 1222598
    name: "Murder in a Row"   # auto
    # Instant · Unlimited range
    tag: dodge
    note: "Zaen's shot, listed here because the crates are what it is aimed through."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It is the cover for Murder in a Row and it explodes for 291k when destroyed. Stand behind it, not beside it, and watch what Zaen aims at."
---

The crates in the [Zaen Bladesorrow](#/d/murder-row/codex/mob/234649) fight, and they are three
things at once.

**Cover**: they block line of sight for **Murder in a Row**, which is the only defence against
it.

**A cost**: **Fel-Infused Freight** ticks 58k on the whole group every 3 seconds while the
crate stands. So hiding behind them is not free, and MDT flags the pulse as interruptible.

**A hazard**: a crate struck by a Fire Bomb or by Murder in a Row starts a five-second fuse and
then goes off for 291k with a knockback — removing itself as cover in the process.

The fight is therefore a slowly shrinking set of safe places, and the group chooses how fast it
shrinks.
