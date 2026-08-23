---
npcId: 134686
name: "Krolusk Matriarch"   # auto
count: 16   # auto — forces per unit

threat: medium
role:
rank: miniboss

spells:
  - id: 272654
    name: "Head Butt"   # auto
    # 3 sec cast · Unlimited range
    tag: tank
    prio: 1
    note: "727k on the current target — the hardest single hit in the dungeon's trash."
  - id: 272655
    name: "Scouring Sand"   # auto
    # 4.5 sec cast · 20 yd range
    tag: dodge
    prio: 1
    note: "291k frontal cone and a 4-second disorient. Same cast the Sand-Sworn Rider uses."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "727k on a three-second cast, on a mob with no taunt available. The tank has to mitigate it — nothing else here will."
---

A single unit worth 16 forces, hitting harder than anything else in the trash.

**Head Butt** is 727k on a three-second cast. What makes it awkward is the CC list: MDT gives
this mob **Stun, Fear and Slow — and no Taunt**, which is unusual. A stun is the only way to
stop the cast, and there is no threat tool to move it.

**Scouring Sand** is the Rider's frontal-plus-disorient, so a pull holding both is answering
the same mechanic twice.
