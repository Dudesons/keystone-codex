---
npcId: 234763
name: "Lithiel Cinderfury"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: caster

spells:
  - id: 1217345
    name: "Malefic Wave"   # auto
    # 10 sec cast · Unlimited range
    tag: dodge
    prio: 1
    note: "+50% Fire damage taken for a minute, stacking — in a fight that is entirely Fire. The Demonic Gateway prevents it; that is what the gateways are for."
  - id: 1217384
    name: "Malefic Wave"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 1214675
    name: "Demonic Gateway"   # auto
    tag: soak
    prio: 1
    note: "Using it prevents the initial damage and the Fire vulnerability from Malefic Wave. Her own ability, and the group's escape from the wave."
  - id: 1214730
    name: "Demonic Gateway"   # auto
    # Instant · Unlimited range
    tag: soak
  - id: 1214740
    name: "Demonic Gateway"   # auto
    # Instant · Unlimited range
    tag: soak
  - id: 1217415
    name: "Felshield"   # auto
    # Instant
    tag: dodge
    prio: 2
    note: "-50% damage taken for 10 sec, conjured alongside Malefic Wave."
  - id: 474375
    name: "Chaos Bolt"   # auto
    # 3 sec cast · 300 yd range
    tag: kick
    prio: 1
    note: "155k Chaos on one player. Her main interruptible cast."
  - id: 1216945
    name: "Searing Fel Flame"   # auto
    # Instant
    tag: kick
    prio: 2
    note: "19k a second to everyone around her, continuously. MDT flags it interruptible."
  - id: 1287627
    name: "Searing Fel Flame"   # auto
    # Instant
    tag: kick
  - id: 474462
    name: "Fingers of Gul'dan"   # auto
    # 5 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "116k within 6 yd of each player, and Wild Imps burst from every impact site. Spread, or the imps arrive in one heap."
  - id: 474457
    name: "Fingers of Gul'dan"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 474408
    name: "Summon Vilefiend"   # auto
    # 2 sec cast · 100 yd range
    tag: dodge
    prio: 2
    note: "Brings in a Furious Vilefiend, which Method reads as the tank's problem."
  - id: 1226469
    name: "Malefic Empowerment"   # auto
    # Instant · Unlimited range
    tag: dodge
    note: "+100% haste for anything empowered by Malefic Wave — including the Wild Imps."
  - id: 1217881
    name: "Shadow Bite"   # auto
    # Instant · 100 yd range
    tag: tank
    note: "39k extra Shadow on melee swings."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Malefic Wave stacks +50% Fire damage taken for a minute. The Demonic Gateway is what stops it landing — take the gateway, do not try to out-heal the wave."
---

The last fight in Murder Row, and its central mechanic is one the group has to *use* rather
than avoid.

**Malefic Wave** applies **+50% Fire damage taken for a minute**, stacking, in a fight where
every source of damage is Fire. Two or three stacks make everything else lethal. And the
counter is stated in her own tooltip: **Demonic Gateway** *prevents the initial damage and Fire
vulnerability from Malefic Wave*. Her gateways are the escape.

**Fingers of Gul'dan** rewards spreading — 116k around each player, with
[Wild Imps](#/d/murder-row/codex/mob/237626) bursting from every impact — and those imps then gain
**Malefic Empowerment**, +100% haste, from the same wave.

**Chaos Bolt** and **Searing Fel Flame** are her interruptible casts.
