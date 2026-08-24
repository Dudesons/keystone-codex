---
npcId: 137484
name: "King A'akul"   # auto
count: 25   # auto — forces per unit

threat: medium
role: melee
rank: miniboss

spells:
  - id: 1297918
    name: "Mortal Bleed"   # auto
    # dispel: bleed · 2.5 sec cast · 100 yd range
    tag: dispel
    prio: 1
    note: "48k a second for 18 sec and -20% healing received. A bleed, and it is also what arms Blood Drain."
  - id: 1297970
    name: "Blood Drain"   # auto
    # 2.5 sec cast · 60 yd range
    tag: dodge
    prio: 1
    note: "165k to any bleeding enemy. Clear the bleed and this cast has nothing to feed on."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Blood Drain only hits players who are bleeding. Dispelling Mortal Bleed is not just damage removed — it takes the follow-up away entirely."
---

One unit at 25 forces, and a two-card trick that the dispeller controls.

**Mortal Bleed** does two things: 18 seconds of bleed and **-20% healing received**, which is
the part a healer notices. **Blood Drain** then deals 165k *to any bleeding enemies* — a
conditional, not a party-wide.

So the dispel does double duty here. Clearing the bleed removes the damage-over-time, restores
the healing, and disarms the next cast. There are not many abilities in the pool where one
global does that much.

Only **Taunt** applies.
