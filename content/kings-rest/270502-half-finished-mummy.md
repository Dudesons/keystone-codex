---
npcId: 270502
name: "Half-Finished Mummy"   # auto
count: 7   # auto — forces per unit

threat: medium
role: caster

spells:
  - id: 267763
    name: "Wretched Discharge"   # auto
    # dispel: disease · 4 sec cast
    tag: kick
    prio: 1
    note: "A disease on every player: 116k every 2 sec for 12 sec. Its only cast — and if the kick is missed, the disease dispel is the second answer."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "One cast, four seconds, and it lands on the whole group for twelve seconds. Kick it; failing that, dispel it as a disease."
---

Four units at 7 forces each, and a single ability with two answers.

**Wretched Discharge** is party-wide, 116k every 2 seconds for 12 seconds — roughly 700k per
player if it runs. It is **interruptible**, and MDT also flags it as a **disease**, so a
missed kick is recoverable.

The same spell belongs to [Mchimba the Embalmer](#/d/kings-rest/mob/134993), who summons these
mummies during his encounter — so learning to kick it here pays off there.
