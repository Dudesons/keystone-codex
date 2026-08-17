---
npcId: 188067
name: "Flashfrost Chillweaver"   # auto
count: 7   # auto — forces per unit

threat: low
role: caster

spells:
  - id: 372743
    name: "Ice Shield"   # auto
    # Channeled (15 sec cast) · 30 yd range
    tag: kick
    prio: 1
    note: "The kick priority of the dungeon. Up to five applications at 5% of its maximum health each, and everything shielded becomes immune to CC."
  - id: 384933
    name: "Ice Shield"   # auto
    # Channeled · 10 yd range
    tag: kick
    prio: 1
  - id: 372749
    name: "Ice Shield"   # auto
    # Instant · Unlimited range
    tag: kick
  - id: 371984
    name: "Frostbolt"   # auto
    # 2.5 sec cast · Unlimited range
    tag: kick
    prio: 2
    note: "116k Frost on a player. Kick it only when no Ice Shield is up — it is the lesser of the two by a wide margin."
  - id: 371489
    name: "Numbing Cold"   # auto
    # Channeled · 10 yd range
    tag: ignore
    note: "Out-of-combat flavour channel."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Two kickable casts, and they are not equal: Ice Shield first, Frostbolt only when nothing else is casting."
---

Six units at 7 forces each. Its whole importance sits in one decision: **which of its two
kickable casts you spend the interrupt on.**

**Ice Shield** wins every time. Five applications at 5% of the caster's maximum health is a
large absorb on a pack, and it also grants CC immunity to whatever it lands on — so a shield
that goes through does not just slow the pull down, it removes the group's control over it.

**Frostbolt** is 116k on one player. Real damage, but a healer problem, not a pull-defining
one.
