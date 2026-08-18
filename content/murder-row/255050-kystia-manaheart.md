---
npcId: 255050
name: "Kystia Manaheart"   # auto
count: 0   # auto — forces per unit

# The mirror image, created by Kystia's Mirror Images. Worth no forces.
threat:
role: add

spells:
  - id: 1264106
    name: "Felstorm"   # auto
    # Channeled (3 min cast)
    tag: kick
    prio: 1
    note: "10k a second to everyone, channelled for as long as the image stands. Interruptible — and every image is channelling it at once."
  - id: 1264110
    name: "Felstorm"   # auto
    tag: kick

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Each mirror image channels its own Felstorm, and each channel is interruptible. Spread the kicks across them rather than piling onto one."
---

The copies [Kystia](#/d/murder-row/codex/mob/234648) creates with **Mirror Images**, tracked by MDT
as their own NPC with 5.4 million health.

**Felstorm** is only 10k a second per image — modest until several are channelling together,
which is the intended effect. It is **interruptible**, so the group's answer is to distribute
kicks across the copies rather than focus one down.
