---
npcId: 137473
name: "Guard Captain Atu"   # auto
count: 10   # auto — forces per unit

threat: low
role: caster

spells:
  - id: 1296671
    name: "Captain's Bulwark"   # auto
    # dispel: magic · 2.5 sec cast · 60 yd range
    tag: dispel
    prio: 1
    note: "-30% damage taken for every ally. Its only ability, and MDT does not flag it interruptible — the magic dispel is the answer."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "One ability, and it makes the whole pack 30% harder to kill. Dispel it — a kick will not land, and waiting it out costs the timer."
---

One unit at 10 forces, with a single cast that is not interruptible.

**Captain's Bulwark** gives every ally 30% damage reduction. MDT records no interruptible flag
on it, so this is a **magic dispel** or nothing — and unlike a kick, a dispel can be applied
after the cast lands, which is the saving grace.

MDT lists Stun, Slow and Disorient as applicable, so it can also be controlled before it casts.

The same spell belongs to [Seneschal M'bara](#/d/kings-rest/codex/mob/134251) and
[King Rahu'ai](#/d/kings-rest/codex/mob/134331).
