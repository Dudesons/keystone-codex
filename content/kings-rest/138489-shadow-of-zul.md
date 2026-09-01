---
npcId: 138489
name: "Shadow of Zul"   # auto
count: 30   # auto — forces per unit

threat: high
role: melee
rank: miniboss

spells:
  - id: 1298304
    name: "Dark Revelation"   # auto
    # 1.5 sec cast · 60 yd range
    tag: dodge
    prio: 1
    note: "473k within 20 yd, five seconds after it lands. The delay is the whole ability — it is time to walk somewhere nobody else is standing."
  - id: 1309385
    name: "Pool of Darkness"   # auto
    # Channeled (4 sec cast) · 100 yd range
    tag: soak
    prio: 2
    note: "58k every 2 sec to anyone standing in it, for as long as it is channelled."
  - id: 272388
    name: "Shadow Barrage"   # auto
    # 1.5 sec cast · 40 yd range
    tag: kick
    prio: 3
    note: "58k on impact, then 48k every 2 sec for 4 sec, on one player. A short cast, and the only one it has."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Two players get a large area around them and have to split off — from the group **and** from each other. Everything else here waits on that."
---

Thirty forces on one body, the most of any trash mob in King's Rest, and 8.4 million health.
**Taunt** is the only crowd control that applies.

## What it does

The fight has three moving parts, in this order:

1. **Dark Revelation** marks players, each carrying a large area of damage around them. They
   have to split — away from the group and away from each other. Nothing else can be handled
   until they are clear.
2. **Pool of Darkness** follows, and the remaining players pair off to cover the pools.
3. **Shadow Barrage** is the cast to interrupt.

**The order, the count and the soak are observed, not read from a tooltip.** MDT now carries
all three abilities, so the figures above are the game's own; what it does not carry is that two
players are marked and two pools follow, or that the pools are covered rather than avoided.
Those come from playing the fight, and are written here rather than as spell entries for that
reason.

Until MDT 6.2.10 this mob had **no abilities at all** in the extracted data, and the card said
so — the three parts above were prose with no ids to hang them on, and Method's three names were
deliberately left unmatched because matching them would have been a guess. The update supplied
exactly those three, so the guess is no longer one.
