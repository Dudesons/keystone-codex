---
npcId: 241814
name: "Earthwhisper Tender"   # auto
count: 7   # auto — forces per unit

threat: high
role: caster

spells:
  - id: 1297696
    name: "Healing Breeze"   # auto
    # dispel: magic · 3.5 sec cast
    tag: kick
    prio: 1
    note: "Heals every nearby ally for 5% of maximum health every 2 sec. Kick it — and if the kick is missed, it carries a magic dispel type, so the heal can still be stripped."
  - id: 1241214
    name: "Earth Bolt"   # auto
    # 2.5 sec cast · 40 yd range
    tag: kick
    prio: 2
    note: "116k on one player. Second in line — never spend the interrupt here while a Healing Breeze is up."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Two kickable casts and only one of them matters. Healing Breeze first, always — Earth Bolt is a healer's problem, a finished Healing Breeze is everyone's."
---

Twelve units at 7 forces each, and the dungeon's healer.

**Healing Breeze** restores 5% of maximum health to every nearby ally every 2 seconds for the
duration of the channel. On a large pull that is more effective health than anything else in
Den of Nal'orakk contributes, and it is the reason pulls run long.

It has an unusual second answer: MDT flags the ability as **dispellable as magic** as well as
interruptible. So a missed kick is not the end of it.

**Earth Bolt** exists mainly to compete for the interrupt. Let it through.
