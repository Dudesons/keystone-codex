---
npcId: 245143
name: "Ruthless Totemcaller"   # auto
count: 5   # auto — forces per unit

threat: lethal
role: caster

spells:
  - id: 1246820
    name: "Magma Totem"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "The totem pulses 36k Fire to all players every 0.3 sec — roughly 120k a second, party-wide, for as long as it stands. Kill the totem before anything else."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Magma Totem does about 120k a second to the whole group and does not care where anyone stands. It is the highest sustained damage in the dungeon, on a mob worth 5 forces."
---

Five units at 5 forces each — 3% of the count, and the single most urgent kill order in Den of
Nal'orakk.

The arithmetic is what makes it: **Magma Totem** pulses 36k to every player **every 0.3
seconds**. That is around 120k per second, party-wide, unavoidable by position, running until
the [totem](#/d/den-of-nalorakk/mob/248666) dies.

Nothing else here comes close, and nothing about the mob's forces or health suggests it. This
is the entry that exists to stop a group from ignoring the small caster while it kills the big
bear.
