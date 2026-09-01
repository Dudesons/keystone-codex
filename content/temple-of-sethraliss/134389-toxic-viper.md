---
npcId: 134389
name: "Toxic Viper"   # auto
count: 0   # auto — forces per unit

# Hatched during the Merektha encounter. Worth no forces.
threat:
role: add

spells:
  - id: 267027
    name: "Poison Spit"   # auto
    # dispel: poison · 4 sec cast · 100 yd range
    tag: kick
    prio: 1
    note: "116k plus 29k a second for 8 sec. Interruptible and a poison — two answers, and a four-second cast to use one."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

One of the snakes that emerge from the eggs during
[Merektha](#/d/temple-of-sethraliss/codex/mob/133384)'s **Hatch**, with 0.3 million health.

**Poison Spit** is a four-second cast worth about 350k, and MDT flags it both interruptible and
dispellable as a poison — generous, for an add.
