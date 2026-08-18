---
npcId: 237626
name: "Wild Imp"   # auto
count: 0   # auto — forces per unit

# Burst from Fingers of Gul'dan impact sites, and worth no forces.
threat:
role: add

spells:
  - id: 1223204
    name: "Felfire Burst"   # auto
    # 1.5 sec cast · 20 yd range
    tag: kick
    prio: 1
    note: "39k on one player. Interruptible, but there are too many of them for that to be the plan."
  - id: 1226469
    name: "Malefic Empowerment"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "+100% haste from Lithiel's Malefic Wave. Empowered imps cast twice as fast — which is when they stop being background noise."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Malefic Wave doubles their cast speed. The imps are trivial until the wave lands, and then they are not."
---

Spawned from every **Fingers of Gul'dan** impact during
[Lithiel Cinderfury](#/d/murder-row/codex/mob/234763), with 0.4 million health each.

On their own they are the [Unleashed Imp](#/d/murder-row/codex/mob/234849) again: a small
interruptible bolt, too numerous to kick. What changes them is **Malefic Empowerment** —
Lithiel's Malefic Wave grants them **+100% haste**, so the same trivial cast arrives twice as
often from every imp at once.

Which is another reason the group wants to be taking the gateway rather than the wave.
