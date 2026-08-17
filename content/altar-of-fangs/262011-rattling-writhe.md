---
npcId: 262011
name: "Rattling Writhe"   # auto
count: 25   # auto — forces per unit

threat: medium
role: melee

spells:
  # Not interruptible — confirmed in game. Dispel is the only answer.
  - id: 1294845
    name: "Corrosive Fangs"   # auto
    # 3 sec cast · dispel: poison
    tag: dispel
    prio: 1
    note: "242k Nature and +20% damage taken for 20 sec. Everything the pack does afterwards hits harder."

  - id: 1294849
    name: "Rattle"   # auto
    # 3 sec cast
    tag: tank
    note: "58k Physical every second for 5 sec, and it ignores armour — mitigation that relies on armour does nothing here."

  - id: 1294859
    name: "Rattle"   # auto
    # Instant
    tag: tank


# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Corrosive Fangs leaves +20% damage taken for 20 sec, and Rattle ignores armour. The two together turn a survivable pull into a dead tank — clear the debuff rather than trying to heal through it."
---

Twenty-five forces per unit, and a mob whose two abilities are only dangerous as a pair.

**Corrosive Fangs** is the one that matters, not for its 242k but for the twenty seconds of
+20% damage taken that follow it. **Rattle** then lands 58k a second through armour, which is
the part no mitigation cooldown fully answers.

Order matters more than raw numbers here: clear the amplifier, and the rest is ordinary trash
damage.
