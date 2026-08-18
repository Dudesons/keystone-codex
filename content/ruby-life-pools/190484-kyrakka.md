---
npcId: 190484
name: "Kyrakka"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: caster

spells:
  - id: 381525
    name: "Roaring Firebreath"   # auto
    # 4 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "Frontal cone, 291k every second for 4 sec. Four seconds of cast to leave the cone — nobody should be caught by this twice."
  - id: 381526
    name: "Roaring Firebreath"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1312684
    name: "Roaring Firebreath"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 381602
    name: "Inferno Spit"   # auto
    # 2 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "44k per second for 6 sec, and when it comes off it explodes for 44k within 8 yd and leaves Flaming Embers. Where it expires is a positional call."
  - id: 381605
    name: "Inferno Spit"   # auto
    # 2 sec cast · 100 yd range
    tag: dodge
  - id: 381862
    name: "Inferno Spit"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 381864
    name: "Inferno Spit"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 384773
    name: "Flaming Embers"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 2
    note: "97k per second on the ground. Erkhart's Winds of Change pushes these around — the safe floor moves during the fight."
  - id: 1312669
    name: "Flaming Embers"   # auto
    # Instant · Unlimited range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Inferno Spit leaves embers where it expires, and Erkhart then blows them across the room. Take it to the edge, not to the middle."
---

Half of a two-boss encounter, fought alongside
[Erkhart Stormvein](#/d/ruby-life-pools/map/mob/190485). Read the two together: Kyrakka lays fire
on the floor and Erkhart moves it.

**Inferno Spit** is the coupling point. It ticks for six seconds, then explodes and leaves
**Flaming Embers** burning at 97k a second — so the carrier chooses where the hazard lands.
Then **Winds of Change** pushes those embers around, which means the ground that was clear
when the group settled will not stay that way.

**Roaring Firebreath** is the only pure damage check here: a four-second frontal that costs
1.2 million to anyone who stands in it.
