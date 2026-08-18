---
npcId: 234648
name: "Kystia Manaheart"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: caster

spells:
  - id: 1214959
    name: "Chaotic Burst"   # auto
    # Instant
    tag: soak
    prio: 1
    note: "Stuns Kystia for 20 sec and raises her damage taken by 115% — the burn window, handed over by Nibbles' Light Infusion. Everything is saved for this."
  - id: 474238
    name: "Illicit Infusion"   # auto
    # Channeled (3 sec cast) · 100 yd range
    tag: dodge
    prio: 1
    note: "Re-infuses Nibbles with fel and turns her hostile again. The loop the fight runs on."
  - id: 1217464
    name: "Illicit Infusion"   # auto
    # Channeled · Unlimited range
    tag: dodge
  - id: 1217989
    name: "Felshield"   # auto
    # 3 sec cast
    tag: dodge
    prio: 1
    note: "A fel barrier cutting her damage taken. The tooltip's percentage is an unresolved formula in the data, so the figure is not quoted."
  - id: 1223906
    name: "Fel Nova"   # auto
    # 3.5 sec cast
    tag: dodge
    prio: 1
    note: "She teleports to a player and blasts for 291k with a knockback. It lands where somebody is standing — nowhere is pre-emptively safe."
  - id: 474240
    name: "Fel Nova"   # auto
    tag: dodge
  - id: 1230298
    name: "Chaos Barrage"   # auto
    # 3 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "291k on the tank, then jumping to nearby players at reduced strength. Spread so the jumps cost less."
  - id: 1264095
    name: "Mirror Images"   # auto
    # Instant
    tag: kick
    prio: 1
    note: "Copies of herself, each channelling Felstorm. The copies' casts are interruptible — that is where the kicks go."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Chaotic Burst is a 20-second window at +115% damage taken. Everything the group has goes there — the rest of the fight is about reaching it."
---

A two-part fight with [Nibbles](#/d/murder-row/codex/mob/234660), and the pair run a loop.

**Illicit Infusion** fills Nibbles with fel and turns her hostile. Drained of it, she reverts
to her light form and casts **Light Infusion** back at Kystia — which triggers
**Chaotic Burst**: Kystia stunned for twenty seconds, taking **115% extra damage**, throwing
off chip damage while she is helpless.

So the fight is not about Kystia's damage. It is about reaching that window with cooldowns
available, as often as possible.

In between, **Fel Nova** teleports to a player before exploding, **Chaos Barrage** chains off
the tank, and **Mirror Images** puts up copies whose
[Felstorm channels](#/d/murder-row/codex/mob/255050) can be interrupted.
