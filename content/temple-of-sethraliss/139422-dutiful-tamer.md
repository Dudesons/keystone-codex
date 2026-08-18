---
npcId: 139422
name: "Dutiful Tamer"   # auto
count: 7   # auto — forces per unit

threat: low
role: caster

spells:
  - id: 1292990
    name: "Swarming Krolusks"   # auto
    tag: dodge
    prio: 1
    note: "Summons Krolusk kin. Method rates it the important one — free bodies on top of whatever else is pulled."
  - id: 1291399
    name: "Serrated Charge"   # auto
    # Instant · 60 yd range
    tag: dispel
    prio: 2
    note: "58k plus 39k a second for 6 sec. The dungeon's shared bleed."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

A single unit at 7 forces. Both its abilities are shared with the
[Sand-Sworn Rider](#/d/temple-of-sethraliss/codex/mob/134629): the
[Swarming Krolusk](#/d/temple-of-sethraliss/codex/mob/264785) summon and the Serrated Charge bleed.

The summon is the reason to kill it rather than leave it — the Krolusks it brings are worth no
forces at all, so they are pure added time.

Only **Taunt** applies.
