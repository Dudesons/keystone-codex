---
npcId: 245912
name: "Lightwarden Ruia"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: caster

spells:
  - id: 1241067
    name: "Spirits of the Vale"   # auto
    # 4 sec cast
    tag: dodge
    prio: 1
    note: "From here on, Lightfire, Lightfall, Pulverizing Strikes and Grievous Thrash all repeat every 8 sec until he dies. The fight stops being a rotation and becomes a race."
  - id: 1241058
    name: "Grievous Thrash"   # auto
    # dispel: bleed · 2 sec cast · 100 yd range
    tag: dispel
    prio: 1
    note: "145k, then 19k every second for 40 sec or until fully healed, stacking. Healing to 95% does not clear it."
  - id: 1240210
    name: "Pulverizing Strikes"   # auto
    # 2.5 sec cast
    tag: dodge
    prio: 1
    note: "Marks several players and sends a frontal at each every 2 sec for 6 sec, 165k a hit. Each hit applies Pulverized."
  - id: 1240257
    name: "Pulverizing Strikes"   # auto
    # 1.9 sec cast · 100 yd range
    tag: dodge
  - id: 1257094
    name: "Pulverized"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "+100% damage from Pulverizing Strikes for 6 sec. Taking one wave makes the next one twice as expensive — this is the stacking failure of the fight."
  - id: 1239824
    name: "Lightfire"   # auto
    # 2 sec cast · 100 yd range
    tag: dodge
    prio: 2
    note: "53k per second for 6 sec, and Lightfire Beams sprout where the target is standing when it expires. Choose that spot."
  - id: 1239825
    name: "Lightfire"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1239919
    name: "Lightfire Beams"   # auto
    # Instant · 300 yd range
    tag: dodge
    prio: 2
    note: "58k a second and a 6-second silence. The silence is what turns a bad position into a wipe."
  - id: 1240100
    name: "Lightfall"   # auto
    # 2 sec cast
    tag: dodge
    note: "291k within 4 yd of each impact. Small radius, so it is a matter of watching the ground."
  - id: 1240152
    name: "Lightfall"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1272265
    name: "Mangling Claws"   # auto
    # Instant
    tag: tank
    prio: 1
    note: "Bear form only: melee hits for double. Watch which shape he is in before committing a tank cooldown."
  - id: 1239885
    name: "Shapeshift: Bear"   # auto
    # 2 sec cast
    tag: tank
    note: "Into the form that doubles his melee damage."
  - id: 1239882
    name: "Shapeshift: Moonkin"   # auto
    # 2 sec cast
    tag: ignore
  - id: 1239883
    name: "Shapeshift: Haranir"   # auto
    # 2 sec cast
    tag: ignore
  - id: 1239821
    name: "Warden's Wrath"   # auto
    # 2 sec cast · Unlimited range
    tag: kick
    prio: 2
    note: "Only 48k, but it is interruptible — the cheapest cast in the fight and the only kick available."
  - id: 1242244
    name: "Blight Propagation"   # auto
    # Channeled
    tag: dodge
    note: "How the Vale's trash comes to carry Lightwarden's Blight: he channels it into nearby allies."
  - id: 1242180
    name: "Lightwarden's Blight"   # auto
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Pulverized doubles the damage of the next Pulverizing Strikes wave. One mistake makes the following wave twice as likely to kill — miss the first one and the fight snowballs."
---

The longest fight in the Vale, and the one that punishes accumulation rather than any single
mistake.

Three of its mechanics have no natural end. **Grievous Thrash** runs 40 seconds *or until the
target is fully healed*, and stacks. **Pulverized** doubles the damage of the next Pulverizing
Strikes wave, so one clipped frontal makes the following one twice as dangerous.
**Spirits of the Vale** removes the pauses entirely: from that cast onward, all four of his
abilities repeat every 8 seconds until he dies.

**Lightfire** is the one that asks for a decision — where its target is standing when it
expires is where **Lightfire Beams** appear, and those beams silence for 6 seconds. In a fight
whose damage never stops, a silenced healer is the failure mode.

He is also the source of the dungeon's ambient hazard: **Blight Propagation** is what puts
**Lightwarden's Blight** on the trash, which is why so much of the Vale explodes when it dies.
