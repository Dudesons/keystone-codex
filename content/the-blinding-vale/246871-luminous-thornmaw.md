---
npcId: 246871
name: "Luminous Thornmaw"   # auto
count: 22   # auto — forces per unit

threat: high
role:
rank: miniboss

spells:
  - id: 1242135
    name: "Grievous Gash"   # auto
    # 2.5 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "388k, then 48k every second until the target is healed to full — and it stacks. A tank left at 90% keeps bleeding for the rest of the pull."
  - id: 1242138
    name: "Solar Breath"   # auto
    # 3 sec cast · 500 yd range
    tag: dodge
    prio: 1
    note: "388k in a frontal cone. Three seconds of cast, and the range is effectively unlimited — being far away is not being safe."
  - id: 1242200
    name: "Lightwarden's Blight"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 2
    note: "291k to everyone nearby on death, plus Blight Resin on the floor."
  - id: 1242180
    name: "Lightwarden's Blight"   # auto
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Grievous Gash only ends when its target is at full health. Topping the tank to 95% is not topping them — the bleed keeps running and the next cast stacks on it."
---

Four units at 22 forces each, and the trash mob that behaves most like a boss.

**Grievous Gash** is worth reading carefully, because its stopping condition is unusual: the
bleed runs for 16 seconds *or until the target is fully healed*. Healing to nearly full does
nothing. And it stacks, so a tank carrying one application into the next cast is carrying two.
This is the ability that decides whether the pull is smooth or grim.

**Solar Breath** is a 388k frontal with a listed range of 500 yards — distance offers no
protection, only the arc does.
