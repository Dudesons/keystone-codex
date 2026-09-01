---
npcId: 134364
name: "Faithless Subjugator"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 1293307
    name: "Addle Mind"   # auto
    # dispel: curse · 5 sec cast · 60 yd range
    tag: kick
    prio: 1
    note: "Disorients a player for 5 sec. Kickable, and a curse if it lands — the dispel type groups most often lack."
  - id: 269896
    name: "Embryonic Vigor"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "It feeds on an egg: heals itself 10% and gains +30% damage until cancelled — no duration at all. Stop it reaching the eggs."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Embryonic Vigor has no duration — the +30% damage lasts until something removes it. Killing the Subjugator is the only reliable answer."
---

Two units at 7 forces each, with two abilities that both need attention.

**Embryonic Vigor** is the unusual one. It heals the caster for 10% and raises its damage by
30% *until cancelled* — the tooltip gives no duration, so this is permanent for the length of
the pull.

**Addle Mind** is a five-second disorient, interruptible, and a **curse** afterwards. The mob
also takes the full CC list, so there are more ways to stop it than there are to stop most
things here.
