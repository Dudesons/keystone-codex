---
npcId: 245339
name: "Underbrush Stalker"   # auto
count: 6   # auto — forces per unit

threat: medium
role: melee

spells:
  - id: 1238076
    name: "Thornblade"   # auto
    # dispel: bleed · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "58k on the backstab then 39k every 2 sec for 8 sec. A bleed, not magic — Stoneform and the like clear it, a magic dispel does not."
  - id: 1238066
    name: "Thornblade"   # auto
    # Instant · 50 yd range
    tag: dispel
  - id: 1238071
    name: "Thornblade"   # auto
    # Instant · 50 yd range
    tag: dispel

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It appears behind someone, not in front of the tank. The bleed lands on whoever it chose, and it is a bleed — the healer's usual dispel will not touch it."
---

Sixteen units at 6 forces each, with one ability that it uses on whoever it likes.

**Thornblade** teleports it behind a target and applies a bleed: 39k every 2 seconds for 8
seconds on top of the hit. Two things make it more annoying than the numbers suggest — it
picks its own target rather than the tank, and the dispel type is **bleed**, which most groups
are not carrying an answer for by reflex.

The same ability, larger, belongs to [Lekshi](#/d/the-blinding-vale/codex/mob/243030) in the
Lightblossom Trinity, so learning to read it here pays off later.
