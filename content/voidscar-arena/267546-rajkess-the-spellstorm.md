---
npcId: 267546
name: "Raj'kess the Spellstorm"   # auto
count: 40   # auto — forces per unit

threat: low
role: caster
rank: miniboss

spells:
  - id: 1311747
    name: "Orb of Disruption"   # auto
    # 2 sec cast
    tag: dodge
    prio: 1
    note: "Summons three orbs around the arena. Method rates this the *Important* one — the orbs are the objects the fight is fought around."
  - id: 1311754
    name: "Forked Lightning"   # auto
    # 2.5 sec cast · 100 yd range
    tag: tank
    prio: 1
    note: "78k on the target, bouncing to two more. Method classes it a tank buster — spread so the bounces have fewer places to go."
  - id: 1311712
    name: "Lightning Strike"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "194k within 4 yd of the impact. A small circle, so it is entirely a matter of watching the floor."
  - id: 1299270
    name: "Thundering Storm"   # auto
    # 3 sec cast · 100 yd range
    tag: dodge
    prio: 2
    note: "MDT carries no tooltip text. Method files it as avoidable party damage."
  - id: 1299273
    name: "Thundering Storm"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1299240
    name: "Raging Typhoon"   # auto
    # 3 sec cast · 100 yd range
    tag: dodge
    prio: 2
    note: "A typhoon at a location that periodically spawns Crashing Waves. The tooltip figures are unscaled and not worth quoting."
  - id: 1299244
    name: "Raging Typhoon"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1299257
    name: "Crashing Wave"   # auto
    # Instant · 100 yd range
    tag: dodge
    note: "What the typhoon throws out. Tooltip figure unscaled."
  - id: 1298902
    name: "Proof of Mastery"   # auto
    # Instant · Unlimited range
    tag: ignore
    note: "Mastery granted for beating the arena champion. A reward, not a mechanic."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Everything he does lands on the floor rather than on a health bar. The fight is won by reading the ground, and there is a lot of it to read at once."
---

The second arena champion, also worth 40 forces, and Method marks him Tough as well.

He is a positional fight almost entirely: **Lightning Strike** at 194k in a small circle,
**Raging Typhoon** spitting out Crashing Waves, **Thundering Storm** to be avoided, and
**Orbs of Disruption** placed around the room. **Forked Lightning** is the only ability aimed
at a person, and it bounces to two more, which argues for spreading.

A caveat worth stating plainly: several of his tooltips carry **unscaled values** — Raging
Typhoon reads as 10 damage, Crashing Wave as 12 — and two of them (**Thundering Storm**) carry
**no text at all**. This card describes what the abilities are for; it does not invent numbers
for them.

Beating him grants **Proof of Mastery**.
