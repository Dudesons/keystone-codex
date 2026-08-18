---
npcId: 259446
name: "The Writhing Coil"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 1298949
    name: "Tail Scythe"   # auto
    # 3 sec cast
    tag: tank
    prio: 1
    note: "678k Physical on the current target — the largest single hit in the dungeon."
  - id: 1299053
    name: "Death Rattle"   # auto
    # 5 sec cast
    tag: dodge
    prio: 1
    note: "9.7k per second, and it adds an application every second. It does not stop on its own: only pulling the Coil apart ends it."
  - id: 1287798
    name: "Vine Grip"   # auto
    tag: dodge
    note: "Attaches players to the Coil. Every attached player moving 10 yards away is what forces the Uncoil."
  - id: 1287811
    name: "Uncoil"   # auto
    tag: dodge
    note: "145k to everyone, and the Coil breaks into Uncoiled Writhes."
  - id: 1299130
    name: "Burrowing Charge"   # auto
    # 3 sec cast
    tag: dodge
    note: "387k to anything in its path."
  - id: 1299902
    name: "Venom Jet"   # auto
    tag: dodge
    note: "Frontal cone, 387k."
  - id: 1299154
    name: "Synchronized Venom"   # auto
    # 2 sec cast
    tag: dodge
    note: "87k to everyone, then 17k every second for 35 sec."
  - id: 1299940
    name: "Vindictive Onslaught"   # auto
    tag: tank

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap:
---

One mechanic decides this fight, and it is easy to read backwards.

**Death Rattle** does not expire. It adds an application every second and keeps going *until
the Writhing Coil is pulled apart*. The only thing that pulls it apart is **Uncoil** — and
Uncoil is triggered by **Vine Grip**: the attached players walking 10 yards out.

So the vines are not a punishment to escape, they are the tool. Staying put lets Death Rattle
ramp unopposed; running out ends it and splits the boss into
[Uncoiled Writhes](#/d/altar-of-fangs/map/mob/262398), whose **Toxic Atrophy** then has to be
interrupted.

**Tail Scythe** is 678k on the tank, the hardest hit in Altar of Fangs.
