---
npcId: 263181
name: "Egg Marker"   # auto
count: 0   # auto — forces per unit

# The eggs of the Merektha encounter. Worth no forces.
threat:
role: add

spells:
  - id: 1296738
    name: "Hatch"   # auto
    # Instant · 200 yd range
    tag: dodge
    prio: 1
    note: "The embryo is hatching. When it completes, a snake emerges and attacks — breaking the egg first is cheaper than fighting what comes out."
  - id: 1289208
    name: "[DNT]Summon Sand egg"   # auto
    tag: ignore
    note: "A developer-internal spell — the `[DNT]` prefix means \"do not translate\", i.e. it was never meant to be seen. No tooltip text."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Break the eggs before they hatch. A Toxic Viper or Storm Serpent is far more work than the egg was."
---

The eggs in [Merektha](#/d/temple-of-sethraliss/codex/mob/133384)'s chamber, and the source of the
[Toxic Vipers](#/d/temple-of-sethraliss/codex/mob/134389) and
[Storm Serpents](#/d/temple-of-sethraliss/codex/mob/134390).

The trade is the usual one for spawners: an egg costs a few globals, a snake costs a fight.

The second spell here — `[DNT]Summon Sand egg` — is developer scaffolding that leaked into the
data. It is listed because it is in the extraction; it means nothing to a player.
