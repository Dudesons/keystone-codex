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
  - id: 1300612
    name: "Uncoiled"   # auto
    # Instant · 100 yd range
    # No tag: the split is the fight's central mechanic and asks for no single answer, so
    # every badge in the vocabulary would misdescribe it — `ignore` most of all.
    note: "The split itself. Each Writhe holds a portion of the Coil's health, and after 20 sec they cast Assimilation and it returns with their combined health. Those twenty seconds are the fight."
  - id: 1300503
    name: "Spiteful Hunt"   # auto
    # Channeled (20 sec cast) · 100 yd range
    tag: dodge
    note: "Every Writhe fixates on someone, for the same 20 seconds the split lasts."
  - id: 1305368
    name: "Spiteful Venom"   # auto
    # Instant · Melee Range · dispel: poison
    tag: dispel
    note: "-5% damage done per stack while it ticks. Dispellable as a poison; its damage figure is unscaled, so it is not quoted."
  - id: 1305393
    name: "Undermining"   # auto
    # Instant · 100 yd range
    tag: dodge
    note: "A defeated Writhe destabilises the ground and knocks back whoever stands over it. Its damage figure is unscaled."
  - id: 1300686
    name: "Assimilation"   # auto
    # Instant
    tag: ignore
    note: "The Writhes converging to reform the Coil. Nothing to react to — by the time it casts, the reacting is over."
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
  - id: 1310357
    name: "Toxic Barrage"   # auto
    # Instant
    # No tag, as above: it announces three unavoidable debuffs and asks for nothing.
    note: "Announces three Toxic Atrophies in succession. The announcement is the only warning; the debuffs themselves are instant."
  - id: 1310547
    name: "Toxic Atrophy"   # auto
    # Instant · 500 yd range
    # No tag: MDT marks the Writhes' copy interruptible and leaves this one unmarked, so on
    # the Coil there is nothing to kick, dodge or dispel.
    note: "-20% damage done and -20% movement speed on everyone, stacking, with no cast to interrupt. The Writhes' copy is the interruptible one."
  - id: 1310974
    name: "Toxic Atrophy"   # auto
    # Instant · 100 yd range

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Uncoil is the goal, not the accident — but the split runs 20 seconds and then the Coil reforms with whatever health the Writhes have left. Spend the window on them."
---

One mechanic decides this fight, and it is easy to read backwards.

**Death Rattle** does not expire. It adds an application every second and keeps going *until
the Writhing Coil is pulled apart*. The only thing that pulls it apart is **Uncoil** — and
Uncoil is triggered by **Vine Grip**: the attached players walking 10 yards out.

So the vines are not a punishment to escape, they are the tool. Staying put lets Death Rattle
ramp unopposed; running out ends it and splits the boss into
[Uncoiled Writhes](#/d/altar-of-fangs/codex/mob/262398).

**The split is a window, not a resolution.** Each Writhe carries a portion of the Coil's
health, and after **20 seconds** they cast **Assimilation** and it comes back with their
combined health. Everything the group wants to do, it does inside those twenty seconds — which
is also when its two answers exist: MDT marks the Writhes' **Toxic Atrophy** interruptible and
leaves the Coil's own copies unmarked, and the tooltip says outright that the Writhes are
susceptible to crowd control. That last is worth its own sentence. Every mob in this dungeon
has an empty `cc` list, as in every Midnight dungeon, and of the nine tooltips in the season
that mention crowd control at all, eight grant *immunity* to it. This is the only one that
says a unit can be controlled.

**Toxic Barrage** is what makes the window matter. It announces three Toxic Atrophies in
succession — each **-20% damage done and -20% movement speed**, stacking — and on the Coil they
are instant, with nothing to kick, dodge or dispel. The debuff is therefore a clock: the longer
the fight runs outside the split, the less damage the group is doing.

The Writhes bring three smaller problems with them. **Spiteful Hunt** fixates every one of them
on a player for the full twenty seconds, **Spiteful Venom** stacks -5% damage done until someone
dispels the poison, and **Undermining** answers each Writhe's death with a knockback. All three
carry unscaled damage figures, so this card quotes none of them.

**Tail Scythe** is 678k on the tank, the hardest hit in Altar of Fangs.
