---
npcId: 134390
name: "Storm Serpent"   # auto
count: 0   # auto — forces per unit

# Hatched during the Merektha encounter. Worth no forces.
threat:
role: add

spells:
  - id: 1291622
    name: "Storm Catalyst"   # auto
    # 2.5 sec cast · 200 yd range
    tag: dodge
    prio: 1
    note: "291k within 4 yd and it leaves Lingering Storm behind. In a chamber whose exits are already electrified, the floor is the scarce resource."
  - id: 1289589
    name: "Lingering Storm"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "97k every second, on the ground, permanently."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Every Storm Catalyst leaves a pool. Merektha's chamber is sealed — there is nowhere to retreat to when it fills up."
---

The other snake from [Merektha](#/d/temple-of-sethraliss/mob/133384)'s eggs, at 3 million
health.

**Storm Catalyst** matters more for what it leaves than for the 291k: **Lingering Storm** pools
at 97k a second, accumulating in a chamber that Merektha has already sealed with Electrified
Ground. Killing these promptly is a floor-space decision.
