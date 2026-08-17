---
npcId: 245460
name: "Leafy Grovecrawler"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1238232
    name: "Seed Shot"   # auto
    # 2.5 sec cast · 60 yd range
    tag: kick
    prio: 1
    note: "116k Nature on one player. Its only cast, so the interrupt has nothing to compete with."
  - id: 1242200
    name: "Lightwarden's Blight"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "291k to everyone nearby on death, plus Blight Resin on the floor. More than its cast is worth."
  - id: 1242180
    name: "Lightwarden's Blight"   # auto
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Its death explosion hits harder than anything it casts. Kill it away from the group, not on top of it."
---

Ten units at 7 forces each, and the clearest case of the Vale's recurring shape: **the mob is
worth less alive than dead.**

**Seed Shot** is 116k on one player, easy to kick and rarely fatal. **Lightwarden's Blight**
is 291k to everyone standing near the corpse. The interrupt is the smaller half of the job;
where it dies is the larger one.
