---
npcId: 238883
name: "Dominated Brawler"   # auto
count: 7   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1254826
    name: "Bloodsurge"   # auto
    # dispel: enrage · Instant
    tag: dispel
    prio: 1
    note: "An enrage worth +20% damage. Soothe it — this is the one dungeon where the group will be doing that constantly anyway."
  - id: 1298899
    name: "Demoralizing Shout"   # auto
    tag: kick
    prio: 1
    note: "Interruptible, and Method rates it *Important*. MDT carries no tooltip text for it, so what it does is not established here — kick it and find out."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "One enrage to soothe and one cast to kick. Neither is optional, and they compete for different people's globals — sort that out before the pull."
---

Eight units at 7 forces each, asking two different players for two different answers.

**Bloodsurge** is a straightforward enrage at +20% damage, and Voidscar Arena hands out
enrages more freely than any other dungeon in the pool.

**Demoralizing Shout** is more awkward to write about honestly: MDT records it as
**interruptible** and carries **no tooltip text at all**, so its effect cannot be stated from
the data. Method flags it as *Important* and as a debuff. Both sources agree it should be
stopped; neither says here what happens if it is not.
