---
npcId: 188011
name: "Earthbound Guardian"   # auto
count: 5   # auto — forces per unit

threat: low
role: melee

spells:
  - id: 384933
    name: "Ice Shield"   # auto
    # Channeled · 10 yd range
    tag: kick
    prio: 1
    note: "Shields an ally for 5% of its own maximum health every 3 sec for 15 sec, and makes that ally immune to CC while it holds. Kick it or the pack stops being controllable."
  - id: 1307205
    name: "Earthbound's Imprint"   # auto
    # Instant · Unlimited range
    tag: dodge
    note: "68k on a player then 36k per second for 8 sec. Steady healer damage, nothing to react to."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Ice Shield is not a healing cast to shrug off — it also makes its target immune to crowd control, which is what breaks the pull."
---

Nine units at 5 forces each. It takes stuns and roots itself, so it can be handled either way.

**Ice Shield** is the reason to bother. Five percent of the caster's health per application,
up to five applications, is a real amount of absorb on a pack — but the clause that matters is
the second one: the shielded target cannot be crowd-controlled. A pull built around a stun
falls apart if one shield lands first.
