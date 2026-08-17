---
npcId: 262398
name: "Uncoiled Writhe"   # auto
count: 0   # auto — forces per unit

threat: low
role: add

spells:
  - id: 1310666
    name: "Toxic Atrophy"   # auto
    # 4 sec cast
    tag: kick
    prio: 1
    note: "-20% damage done and -20% movement speed on everyone, and it stacks. Four seconds of cast."
  - id: 1300503
    name: "Spiteful Hunt"   # auto
    # Channeled (20 sec)
    tag: dodge
    note: "Each Writhe fixates on someone for the duration."
  - id: 1305368
    name: "Spiteful Venom"   # auto
    # dispel: poison
    tag: dispel
    note: "-5% damage done while it ticks. Dispellable."
  - id: 1305393
    name: "Undermining"   # auto
    tag: dodge
    note: "On its death it destabilises the ground and knocks back anyone above it."
  - id: 1300618
    name: "Assimilation"   # auto
    tag: ignore
    note: "The Writhes converging to reform The Writhing Coil. Not something to react to."
  - id: 1300698
    name: "Assimilation"   # auto
    tag: ignore

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

The snakes [The Writhing Coil](#/d/altar-of-fangs/mob/259446) breaks apart into. Worth no
forces, and they reassemble into the boss through **Assimilation**.

**Toxic Atrophy** is the interrupt that matters: -20% damage and -20% movement on the whole
group, stacking, off a four-second cast — during a phase where the group is already short of
time.
