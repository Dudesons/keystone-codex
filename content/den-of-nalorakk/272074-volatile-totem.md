---
npcId: 272074
name: "Volatile Totem"   # auto
count: 0   # auto — forces per unit

# Planted by Loa Speaker Nanea, and worth no forces.
threat:
role: add

spells:
  - id: 1309931
    name: "Volatile Flames"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "Radiates flame at unlimited range for as long as it stands. The tooltip's damage figure is unscaled and not worth quoting — the reason to kill it is that distance does not help."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Unlimited range means backing off does nothing. It is 0.7 million health — kill it rather than out-heal it."
---

[Loa Speaker Nanea](#/d/den-of-nalorakk/map/mob/244889) plants several of these at a time.

**Volatile Flames** has no range limit, so the usual answer to ground damage — move away —
does not apply. With 0.7 million health each, killing them is quick; the mistake is treating
them as scenery.

The tooltip's damage value is **unscaled** in the data, so this card describes what the
ability does rather than what it hits for.
