---
npcId: 137486
name: "Queen Patlaa"   # auto
count: 25   # auto — forces per unit

threat: medium
role: miniboss

spells:
  - id: 1297763
    name: "Bestial Berserk"   # auto
    # dispel: enrage · 2.5 sec cast · 100 yd range
    tag: dispel
    prio: 1
    note: "+25% movement, attack and cast speed for herself and every ally, 15 sec. An enrage — soothe it."
  - id: 1306763
    name: "Serpent Strike"   # auto
    # dispel: poison · Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "58k plus 53k a second and -50% movement speed for 8 sec. A poison. The slow is the dangerous half."
  - id: 1306761
    name: "Serpent Strike"   # auto
    tag: dispel
  - id: 270931
    name: "Shadow Volley"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 2
    note: "Arrow volleys leaving zones that burn 68k a second for 10 sec. Ground damage — but a slowed player cannot leave it."
  - id: 1305982
    name: "Shadow Volley"   # auto
    # Channeled (2 sec cast)
    tag: dodge
  - id: 1294883
    name: "Shoot"   # auto
    # 2.5 sec cast · 60 yd range
    tag: dodge
    note: "78k on one player."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Serpent Strike halves movement speed and Shadow Volley covers the floor. The slow and the ground damage are one mechanic — dispel the poison or nobody is leaving the volleys."
---

One unit at 25 forces, one of the royal minibosses, and the clearest example in the dungeon of
two abilities that only matter together.

**Serpent Strike** is a poison with a **50% slow**. **Shadow Volley** covers the ground in
zones burning 68k a second for ten seconds. Either alone is manageable. A slowed player
standing in a volley is not, and the dispel is what breaks the pairing.

**Bestial Berserk** buffs her *and* every ally by 25% for 15 seconds and soothes off.

Only **Taunt** applies to her directly.
