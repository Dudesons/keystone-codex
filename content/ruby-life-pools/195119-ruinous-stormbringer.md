---
npcId: 195119
name: "Ruinous Stormbringer"   # auto
count: 10   # auto — forces per unit

threat: high
role: caster

spells:
  - id: 385310
    name: "Storm Bolt"   # auto
    # 2.5 sec cast · 60 yd range
    tag: kick
    prio: 1
    note: "116k Nature. Its only interruptible cast, and the one that keeps its energy from climbing."
  - id: 385311
    name: "Thunderstorm"   # auto
    # Instant
    tag: dodge
    prio: 1
    note: "97k within 20 yd and a knockback, fired at 100 energy. Instant — the answer is to not be stacked on it."
  - id: 385312
    name: "Gathering Storm"   # auto
    # Instant
    tag: ignore
    note: "The energy bar that arms Thunderstorm. Nothing to do about it directly."
  - id: 385313
    name: "Lightning Rod"   # auto
    # 2 sec cast · 60 yd range
    tag: dodge
    note: "58k every 1.5 sec on a player, then 97k when it expires."
  - id: 385314
    name: "Lightning Rod"   # auto
    # Instant · Unlimited range
    tag: dodge
  - id: 385316
    name: "Lightning Rod"   # auto
    # Instant · Unlimited range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Thunderstorm knocks the group back at 100 energy. Standing packed around it is what turns a knockback into a second pull."
---

Four units at 10 forces each, and the toughest body in the trash at 10.7 million health — it
stays alive long enough to use everything it has.

The energy bar is the clock. **Gathering Storm** fills it, and at 100 it spends the bar on
**Thunderstorm**: 97k and a knockback inside 20 yards. It is an instant, so the answer is
positional rather than reactive — do not be stacked in melee range of it when the bar is full.

Only Mind Soothe and Taunt work on it, so the interrupt on **Storm Bolt** is the only
interaction available.
