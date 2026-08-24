---
npcId: 268184
name: "Devouring Brutalizer"   # auto
count: 30   # auto — forces per unit

threat: high
role: melee
rank: miniboss

spells:
  - id: 1300243
    name: "Brutalize"   # auto
    # 2 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "679k every 1.5 sec for 6 sec — around 2.7 million on one target across the cast. Cooldown or die."
  - id: 1300244
    name: "Brutalize"   # auto
    # Instant · 100 yd range
    tag: tank
  - id: 1310324
    name: "Mending Void"   # auto
    # Channeled (20 sec cast) · 100 yd range
    tag: kick
    prio: 1
    note: "3% of maximum health every 2 sec for twenty seconds — 30% of a health bar if it runs. Interruptible."
  - id: 1300249
    name: "Devour"   # auto
    # 9 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "Nine seconds of cast, and it heals itself for half its health. MDT does not flag it interruptible — the answer has to be killing it or the target first."
  - id: 1300248
    name: "Devour"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1300250
    name: "Devouring Might"   # auto
    # Instant
    tag: dodge
    note: "+20% damage done, off the back of a Devour."
  - id: 1252406
    name: "Dreadbellow"   # auto
    # 4.5 sec cast · 50 yd range
    tag: dodge
    prio: 2
    note: "Knocks everyone back and leaves 29k a second for 12 sec on the whole group."
  - id: 1282959
    name: "Gatekeeper"   # auto
    # Instant
    tag: ignore
    note: "It blocks the way to Charonus. Not a mechanic — a reason it cannot be skipped."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Two ways to lose the fight to healing: Mending Void, which is interruptible, and Devour, which is not. Kick the first; race the second."
---

Three units at 30 forces each, and **Gatekeeper** says the quiet part out loud — they stand
between the group and Charonus, so there is no route around them.

The tank damage is extreme: **Brutalize** lands 679k every 1.5 seconds for six seconds, roughly
2.7 million on one target from a single cast. Nothing else in Voidscar Arena asks that much of
a cooldown.

And it heals itself two different ways. **Mending Void** is a twenty-second channel worth 30%
of a health bar, and it *is* interruptible. **Devour** is a nine-second cast that restores half
its health, and MDT does **not** list it as interruptible — so that one has to be beaten with
damage rather than a kick, and it leaves **Devouring Might** behind if it lands.
