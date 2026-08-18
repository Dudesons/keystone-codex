---
npcId: 137591
name: "Healing Tide Totem"   # auto
count: 0   # auto — forces per unit

# Summoned by the Spectral Shaman, and worth no forces.
threat:
role: add

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "0.4 million health against 10% of a pack's health every 2.5 seconds for thirty seconds. Killing it is never the wrong call."
---

The [Spectral Shaman](#/d/kings-rest/codex/mob/135239)'s totem. MDT carries **no spell list** for the
totem itself — the healing is recorded on the shaman's cast, which is where the numbers are.

What matters is on this side: 0.4 million health, thirty seconds of duration, and it dies to a
few globals. The tooltip on the shaman's card is explicit that the totem *lasts for 30 sec or
until killed*.
