---
npcId: 135167
name: "Royal Berserker"   # auto
count: 22   # auto — forces par unité

# À REMPLIR : low | medium | high | lethal
threat:
# À REMPLIR : caster | melee | patrol | miniboss
role:
# CC applicables (auto, depuis MDT) : Stun, Incapacitate, Silence, Root, Slow, Disorient, Shackle Undead, Taunt

spells:
  - id: 270482
    name: "Violent Lunge"   # auto
    # 45 yd range3 sec cast
    # tag : kick | dodge | dispel | tank | soak | ignore
    tag: todo
    note:
  - id: 270485
    name: "Violent Lunge"   # auto
    # Instant
    # tag : kick | dodge | dispel | tank | soak | ignore
    tag: todo
    note:
  - id: 1301851
    name: "Bloodthirsty Axe"   # auto
    # 60 yd range2 sec cast · dispel: bleed
    # tag : kick | dodge | dispel | tank | soak | ignore
    tag: todo
    note:

# Le piège : la phrase qui évite le wipe. Laisser vide si le mob est sans danger.
trap:
---

<!-- Prose libre : positionnement, ordre de focus, cooldowns. -->
