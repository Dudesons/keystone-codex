---
npcId: 268491
name: "Twisted Hexxer"   # auto
count: 0   # auto — forces per unit

# The Avatar of Sethraliss encounter version. Worth no forces.
threat:
role: add

spells:
  - id: 1300684
    name: "Hex Muck"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "Turns anyone standing in it into a frog — no attacking, no casting — at 97k every 2 sec. During an encounter that already asks people to touch orbs."
  - id: 1302158
    name: "Flame Shock"   # auto
    # 4 sec cast · 60 yd range
    tag: kick
    prio: 1
    note: "242k plus 78k a second for 8 sec. The interruptible cast."
  - id: 1311964
    name: "Latent Hex"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "4 sec of ticks, then 78k to everyone within 10 yd on removal. Walk out before it ends."
  - id: 1302153
    name: "Latent Hex"   # auto
    tag: dodge
  - id: 1311979
    name: "Latent Hex"   # auto
    # Instant · Unlimited range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Hex Muck in the Avatar fight means somebody is a frog while a Lifeforce orb is expiring. The two mechanics do not wait for each other."
---

The [trash Hexxer](#/d/temple-of-sethraliss/map/mob/136250) again, this time inside the
[Avatar of Sethraliss](#/d/temple-of-sethraliss/map/mob/133392) encounter, with 2.4 million health
and immune to every crowd control listed.

Same three abilities, and they cost far more here. **Hex Muck** removes a player from a fight
that needs someone to cleanse orbs on a timer, and **Latent Hex** wants people to spread out
in an encounter that already has enough placement rules.
