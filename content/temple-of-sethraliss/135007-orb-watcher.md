---
npcId: 135007
name: "Orb Watcher"   # auto
count: 25   # auto — forces per unit

threat: high
role: add
rank: miniboss

spells:
  - id: 1303443
    name: "Venomous Slash"   # auto
    # 2.5 sec cast · Unlimited range
    tag: tank
    prio: 1
    note: "582k plus 58k a second for 10 sec on the tank — and Venom Shrapnel rains out from it. It is a tank buster and party damage in one cast."
  - id: 1308546
    name: "Venomous Slash"   # auto
    # Instant · Unlimited range
    tag: tank
  - id: 1303452
    name: "Venom Shrapnel"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "291k within 4 yd of each missile. The avoidable half of the slash — watch the ground after every buster."
  - id: 1303486
    name: "Caustic Stomp"   # auto
    tag: dodge
    prio: 1
    note: "116k to everyone within 60 yd plus 33k a second for 10 sec. Unavoidable — pure healer pressure."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Venomous Slash sprays shrapnel outward at 291k a hit. The tank takes the slash; everyone else has to move for what follows it."
---

Two units at 25 forces each, immune to every crowd control MDT lists — so this is fought
straight.

**Venomous Slash** pays twice: 582k on the tank with a ten-second burn, and **Venom Shrapnel**
raining outward for 291k a hit. The first half is the tank's; the second half is everyone's,
and it is entirely avoidable.

**Caustic Stomp** is the opposite — 60 yards, no escape, 116k plus a ten-second burn.
