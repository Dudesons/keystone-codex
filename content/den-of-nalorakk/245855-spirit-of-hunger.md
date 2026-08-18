---
npcId: 245855
name: "Spirit of Hunger"   # auto
count: 25   # auto — forces per unit

threat: high
role: caster

spells:
  - id: 1238760
    name: "Starvation Effigy"   # auto
    # 1.5 sec cast · 100 yd range
    tag: kick
    prio: 1
    note: "Plants a totem that takes 15% of everyone's maximum health for 25 sec, stacking. Two of these and the healer is working against a shrinking ceiling."
  - id: 1238687
    name: "Feast of Misery"   # auto
    # 1.5 sec cast · 100 yd range
    tag: kick
    prio: 2
    note: "39k Shadow to everyone every second for 5 sec, and it heals itself for half of what it deals. Damage and healing in one cast."
  - id: 1238725
    name: "Feast of Misery"   # auto
    # Instant · 100 yd range
    tag: kick
  - id: 1249737
    name: "Feast of Misery"   # auto
    # 1.5 sec cast · 100 yd range
    tag: kick

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Starvation Effigy takes maximum health, not current health. Healing does not undo it — the totem has to be killed or the debuff dispelled as a curse."
---

Seven units at 25 forces each — 24% of the dungeon, the heaviest mob in Den of Nal'orakk.

Its two casts fail in different ways. **Feast of Misery** is party damage that also heals the
caster, so letting it through costs twice. **Starvation Effigy** is worse and quieter: it
plants a [Starvation Effigy](#/d/den-of-nalorakk/map/mob/245567) totem which strips **15% of
maximum health** for 25 seconds, stacking. Nobody dies to it directly; the group simply gets
easier to kill with everything else.

The debuff is a **curse**, dispellable from the totem's own cast — which is worth knowing,
because curses are the dispel most groups forget they have.
