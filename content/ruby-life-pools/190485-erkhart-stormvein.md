---
npcId: 190485
name: "Erkhart Stormvein"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 381515
    name: "Stormslam"   # auto
    # dispel: magic · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "388k Physical and 194k Nature, and it doubles the target's Nature damage taken for 30 sec — stacking. Dispel it, or the next Stormslam lands on a tank taking double."
  - id: 381512
    name: "Stormslam"   # auto
    # 2.5 sec cast · 100 yd range
    tag: tank
    prio: 1
  - id: 381513
    name: "Stormslam"   # auto
    # Instant · 100 yd range
    tag: tank
  - id: 381514
    name: "Stormslam"   # auto
    # Instant · 100 yd range
    tag: tank
  - id: 381516
    name: "Interrupting Cloudburst"   # auto
    # 5 sec cast
    tag: dodge
    prio: 1
    note: "97k to everyone and every cast in the group interrupted for 2 sec. Bank the healing before it goes off, not after."
  - id: 381517
    name: "Winds of Change"   # auto
    # 1.5 sec cast · Unlimited range
    tag: dodge
    prio: 2
    note: "10k per second for 8 sec, and it pushes players — and Kyrakka's Flaming Embers — across the room."
  - id: 381518
    name: "Winds of Change"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 181089
    name: "Encounter Event"   # auto
    # Instant
    tag: ignore
    note: "Scripting, not an ability."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Stormslam stacks +100% Nature damage taken on the tank. Dispelling it is what keeps the second one survivable."
---

The other half of the fight with [Kyrakka](#/d/ruby-life-pools/map/mob/190484), and the half that
punishes reacting late.

**Stormslam** is a tank buster with a multiplier attached: +100% Nature damage taken for 30
seconds, stacking, in a fight where most of the incoming damage *is* Nature. MDT flags it as a
magic dispel, which is the intended answer — untouched, the debuff makes the next cast of the
same ability far worse than the first.

**Interrupting Cloudburst** locks the group out of casting for two seconds on a five-second
warning. Nothing is dodged here; the play is to be topped up before it resolves rather than
trying to heal through the lockout.

**Winds of Change** is what makes Kyrakka's embers a moving problem rather than a static one.
