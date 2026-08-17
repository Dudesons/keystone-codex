---
npcId: 261560
name: "Primal Serpent"   # auto
count: 7   # auto — forces per unit

threat: high
role: caster

spells:
  - id: 1294557
    name: "Piercing Hiss"   # auto
    # 4 sec cast
    tag: kick
    prio: 1
    note: "135k physical, ignores armour, and -30% haste for 6 sec. The haste debuff stacks — that is what makes a 4 second cast worth an interrupt."

  - id: 1306381
    name: "Fetid Spit"   # auto
    # 2.5 sec cast
    tag: ignore
    note: "58k Nature, not interruptible. Filler next to Piercing Hiss."

  - id: 1221063
    name: "Xal'atath's Gift"   # auto
    # Instant
    tag: ignore
    note: "Sub-12 affix, rotated weekly. Not a trait of this mob."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "The haste debuff from Piercing Hiss stacks. Let two or three through and the group's damage and healing throughput collapses at the worst moment — kick it every time, not when convenient."
---

Fourteen units at 7 forces each, and the one mob here whose danger is cumulative rather than
immediate. A single **Piercing Hiss** is survivable; the fourth one is not, because the -30%
haste stacks on a group that still has to kick, heal and move.

Four seconds is a long cast, which is exactly the trap: it looks easy to catch, so it gets
left to someone else.
