---
npcId: 189232
name: "Kokia Blazehoof"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 372858
    name: "Searing Blows"   # auto
    # Channeled (3 sec cast) · 300 yd range
    tag: tank
    prio: 1
    note: "Four strikes over 3 sec, each applying Searing Wounds. The wounds are the tank buster, not the strikes."
  - id: 372859
    name: "Searing Blows"   # auto
    # Instant · 300 yd range
    tag: tank
  - id: 372860
    name: "Searing Wounds"   # auto
    # Instant · 300 yd range
    tag: tank
    prio: 1
    note: "15k every half-second for 8 sec, stacking with every strike. Four applications a cast is what makes the tank's health bar fall between busters."
  - id: 372107
    name: "Molten Boulder"   # auto
    # 2.5 sec cast · 50 yd range
    tag: dodge
    prio: 1
    note: "291k and a knockback to anything it touches, then it rolls 40 yd and explodes for 582k within 12 yd, leaving Scorched Earth. Side-step the line, do not outrun it."
  - id: 372811
    name: "Molten Boulder"   # auto
    # Instant · 300 yd range
    tag: dodge
  - id: 372819
    name: "Molten Boulder"   # auto
    # Instant · 300 yd range
    tag: dodge
  - id: 1306272
    name: "Molten Boulder"   # auto
    tag: dodge
  - id: 372820
    name: "Scorched Earth"   # auto
    # Instant · Unlimited range
    tag: dodge
    note: "97k per second wherever a boulder finished. The arena gets smaller every cast."
  - id: 372863
    name: "Ritual of Blazebinding"   # auto
    tag: dodge
    prio: 2
    note: "At 100 energy she summons a Blazebound Firestorm and sears everyone within 12 yd for 145k."
  - id: 1309540
    name: "Ritual of Blazebinding"   # auto
    # Instant · Unlimited range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Every Molten Boulder leaves Scorched Earth where it stops. Choose where the boulders go early, or the fight runs out of floor."
---

A fight against the floor as much as against the boss.

**Molten Boulder** hits three times over: 291k and a knockback on contact, 582k when it
explodes after rolling 40 yards, and a patch of **Scorched Earth** that stays. Nothing cleans
those up, so the arena shrinks with every cast — which makes the *direction* of each boulder a
group decision, not something to react to individually.

The tank damage is cumulative rather than spiky. **Searing Blows** lands four strikes, each
stacking **Searing Wounds** at 15k every half-second, so the tank bleeds between busters
rather than during them.

At 100 energy, **Ritual of Blazebinding** spawns a
[Blazebound Firestorm](#/d/ruby-life-pools/map/mob/189886) — whose Blaze Volley hits the whole
party from any distance and has to be interrupted.
