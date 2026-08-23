---
npcId: 267545
name: "Aegyra the Unyielding"   # auto
count: 40   # auto — forces per unit

threat: high
role:
rank: miniboss

spells:
  - id: 1298908
    name: "Champion's Spear"   # auto
    # 2 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "Chains every player, pulling them in at 19k a second until the spear is destroyed. It does not expire — break it."
  - id: 1299145
    name: "Earthsplitter"   # auto
    # 3 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "388k within 15 yd. Three seconds of cast and a large radius — start moving early."
  - id: 1299210
    name: "Aftershock"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "145k every second on the ground it broke. The follow-up that catches people who dodged the first hit and stopped moving."
  - id: 1299133
    name: "Ferocious Leap"   # auto
    # Instant · 100 yd range
    tag: dispel
    prio: 2
    note: "145k plus 58k a second for 4 sec. Method reads the bleed as clearable by Stoneform."
  - id: 1299125
    name: "Ferocious Leap"   # auto
    # 2 sec cast · 100 yd range
    tag: dispel
  - id: 1298933
    name: "Savage Smash"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 2
    note: "116k within 6 yd, then 29k a second for 6 sec in the same spot."
  - id: 1298922
    name: "Savage Smash"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1298924
    name: "Savage Smash"   # auto
    # 8 sec cast · 100 yd range
    tag: dodge
  - id: 1298903
    name: "Proof of Endurance"   # auto
    # Instant · Unlimited range
    tag: ignore
    note: "+3% Versatility, granted for beating the arena champion. A reward, not a mechanic."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Champion's Spear pulls the whole group together and holds until destroyed — right when Earthsplitter wants everyone spread across 15 yards."
---

One of Voidscar Arena's two champions, worth 40 forces, and Method marks her Tough.

The interlock is between two abilities that want opposite things. **Champion's Spear** chains
every player and drags them together, and it *does not expire* — only breaking it releases the
group. **Earthsplitter** then hits everything within 15 yards for 388k, with **Aftershock**
burning the ground afterwards.

Chained is exactly where nobody wants to be for that, so the spear is not a damage-over-time
to heal through; it is a timer against the next cast.

Beating her grants **Proof of Endurance**, +3% Versatility — worth knowing the reward exists.
