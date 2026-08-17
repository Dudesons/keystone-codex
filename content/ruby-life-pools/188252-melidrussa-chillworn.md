---
npcId: 188252
name: "Melidrussa Chillworn"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: caster

spells:
  - id: 372808
    name: "Frigid Shard"   # auto
    # 2.5 sec cast · 100 yd range
    tag: kick
    prio: 1
    note: "776k Physical on the tank — the hardest single hit in the fight, and it is interruptible. Every kick the group has goes here."
  - id: 373680
    name: "Frost Overload"   # auto
    # Channeled
    tag: dodge
    prio: 1
    note: "While the Ice Bulwark holds she pulses 46k every 1.5 sec on everyone and raises damage taken from it by 5% each time, stacking. Break the shield to end it."
  - id: 373688
    name: "Frost Overload"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 372988
    name: "Ice Bulwark"   # auto
    # Instant
    tag: dodge
    note: "10% of her maximum health. It is the timer on Frost Overload: the absorb going down is what stops the pulses."
  - id: 373046
    name: "Awaken Whelps"   # auto
    # 4 sec cast · Unlimited range
    tag: dodge
    prio: 2
    note: "Calls in the Infused Whelps, whose Cold Claws freeze whoever they land on at 20 applications."
  - id: 373727
    name: "Frost Infusion"   # auto
    # Channeled · Unlimited range
    tag: dodge
    note: "Infuses the whelps with Frost energy."
  - id: 372851
    name: "Chillstorm"   # auto
    # 4.5 sec cast · Unlimited range
    tag: dodge
    prio: 2
    note: "A storm that pulls players toward its eye, 41k every 1.5 sec, then 68k and a knock-back after 7 sec. Fight the pull outward, do not walk into it."
  - id: 383925
    name: "Chillstorm"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 397077
    name: "Chillstorm"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 396044
    name: "Hailburst"   # auto
    # 2 sec cast · Unlimited range
    tag: dodge
    note: "121k to everyone, and it seeds the floor with Hailbombs."
  - id: 384024
    name: "Hailbombs"   # auto
    # Instant · Unlimited range
    tag: dodge
    note: "Mines: 242k within 4 yd, a knock-up, and 50% haste lost for 20 sec. The haste loss is the part that costs the pull."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Frost Overload runs for as long as the Ice Bulwark holds — the shield is the mechanic, not the damage. Break it."
---

Everything in this fight is a loop that closes on the same point: **the Ice Bulwark.**

**Frost Overload** encases her, then pulses 46k on the party every 1.5 seconds and adds 5% to
the damage that ability does each time. The pulses do not stop on a timer, they stop when the
absorb — 10% of her maximum health — is gone. Damage on the shield is therefore healing, in
the only sense that matters.

Outside that loop, **Frigid Shard** is 776k on the tank and can be interrupted, which makes it
the single highest-value kick in Ruby Life Pools. **Chillstorm** pulls toward its eye rather
than pushing, so it punishes standing still, and the **Hailbombs** left by Hailburst cost 50%
haste for 20 seconds — a stealth tax on the timer that nobody notices taking.
