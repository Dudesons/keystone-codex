---
npcId: 245345
name: "Lightgorged Lasher"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1238158
    name: "Lightbloom Pollination"   # auto
    # Instant
    tag: kick
    prio: 1
    note: "A 600k absorb on itself, CC immunity while it holds, and +50% attack speed with a 5%-per-3-sec heal for every ally nearby. Lasts a full minute. This is the interrupt of the dungeon."
  - id: 1238173
    name: "Pollen Surge"   # auto
    # Instant · 150 yd range
    tag: kick
    note: "What the pack gains from the pollination: +50% attack speed and a rolling heal. It ends when the shield does."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "One Lightbloom Pollination buffs the entire pack for a minute. If it goes through, the pull is twice the length it should have been — kick it or strip the shield."
---

Twenty-eight units at 7 forces each, and a single ability that matters more than anything else
in the Vale's trash.

**Lightbloom Pollination** does four things at once: absorbs 600k on the caster, makes it
immune to crowd control, and gives every nearby ally 50% attack speed plus a heal for 5% of
maximum health every 3 seconds. It runs for **one minute**, or until the shield is removed.

That last clause is the whole entry. The buff is not on a timer you wait out — it is on a
shield you break. Kick the cast if it is caught in time; strip the absorb if it is not.
