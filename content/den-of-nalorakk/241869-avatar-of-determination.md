---
npcId: 241869
name: "Avatar of Determination"   # auto
count: 28   # auto — forces per unit

threat: lethal
role: melee
rank: miniboss

spells:
  - id: 1241463
    name: "Glacial Tomb"   # auto
    tag: dodge
    prio: 1
    note: "Encases every player in ice, ticking 39k every 2 sec until destroyed. Nobody is acting until the tombs are broken — the group has to break itself out."
  - id: 1241464
    name: "Glacial Tomb"   # auto
    # Instant · 100 yd range
    tag: dodge
  - id: 1240280
    name: "Pulverize"   # auto
    tag: dodge
    prio: 1
    note: "388k and a 4-second stun to everyone within 12 yd. Stunned inside a Glacial Tomb is the sequence that ends pulls — stay out of the 12 yards."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Glacial Tomb does not expire — it holds until broken. Being stunned by Pulverize while tombed means nobody is breaking anything."
---

Two units at 28 forces each, and the trash mob most capable of ending a run on its own.

**Glacial Tomb** encases *all* players and ticks until the ice is destroyed. There is no
duration to wait out, so the group's damage on its own tombs is the only exit.

**Pulverize** stuns everything within 12 yards for 4 seconds. Read together, the failure case
is obvious and fatal: a party tombed *and* stunned is a party doing nothing while the ticks
continue. Keeping ranged outside the 12-yard circle is what stops the two mechanics
overlapping.

Method flags Blessing of Freedom as an answer to the tomb, which is the other route out.
