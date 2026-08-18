---
npcId: 133392
name: "Avatar of Sethraliss"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "MDT holds no spells for the Avatar herself — everything in the fight is carried by the adds. The Essence Defiler blocks all external healing; the Lifeforce orbs are what the group manipulates."
---

**MDT records no spells for the Avatar of Sethraliss.** 21.6 million health and an empty
ability list, which makes this the largest data gap in the pool — but unusually, the fight is
still legible, because MDT *does* carry its adds, and they hold the mechanics.

- [Essence Defiler](#/d/temple-of-sethraliss/codex/mob/268427) — **Defiling Taint** channels into the
  Avatar and *prevents all external healing*. Two of them, 4.3 million health each.
- [Corrupted Guardian](#/d/temple-of-sethraliss/codex/mob/268344) — a 485k tank buster, a charge, and
  **Unstable Corruption**, which erupts for 485k within 20 yards and forms Corrupted Lifeforce.
- [Lifeforce](#/d/temple-of-sethraliss/codex/mob/268364) — the orbs. Touching one cleanses it;
  left alone it bursts for 194k party-wide. A cleansed orb can be consumed by the Avatar to
  **heal her**, and the **Corruption** carried by whoever touched it is savage:
  -33% healing done and **+300% Physical damage taken** for 15 seconds, stacking.
- [Twisted Hexxer](#/d/temple-of-sethraliss/codex/mob/268491) and
  [Faithless Tormentor](#/d/temple-of-sethraliss/codex/mob/268729) — encounter versions of the trash,
  bringing Hex Muck, Latent Hex and the healer fixate into the fight.

Method's tracker names the Avatar's own abilities — *Agony of Sethraliss*, *Vile Charge*,
*Tainted Strike*, *Corrupted Lifeforce*, *Corruption*, *Defiling Taint* — and several of those
match spells MDT files under the adds above. So the fight is not a mystery; the attribution is.
None of those names are written into a spell list here, because no matching IDs exist on this
NPC in the extracted data.
