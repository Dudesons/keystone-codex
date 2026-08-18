---
npcId: 244887
name: "Ikuzz the Light Hunter"   # auto
isBoss: true   # auto
count: 0   # auto — forces per unit

# A boss ring is gold whatever this says, so threat only adds a badge here.
threat:
role: melee

spells:
  - id: 1253410
    name: "Bloodthirsty Gaze"   # auto
    # 4 sec cast · 100 yd range
    tag: dodge
    prio: 1
    note: "Fixates a player for 10 sec. It cannot be tanked away — the target runs, and everyone else clears the way."
  - id: 1237093
    name: "Crushing Footfalls"   # auto
    # Instant · 7 yd range
    tag: dodge
    prio: 1
    note: "While fixated it crushes Bloodthorn Roots within 7 yd as it moves. That is how the rooted get freed — kite it across them deliberately."
  - id: 1237166
    name: "Incise"   # auto
    # Instant · 100 yd range
    tag: dispel
    prio: 1
    note: "What happens if the fixate catches you: 194k bleed every second for 3 sec."
  - id: 1237267
    name: "Incise"   # auto
    # dispel: bleed · Instant · 100 yd range
    tag: dispel
  - id: 1272290
    name: "Crunched"   # auto
    # Instant · 300 yd range
    tag: dodge
    note: "Stunned for 5 sec after being chewed and spat out. Five seconds is a long time in this fight."
  - id: 1237330
    name: "Bloodthorn Roots"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "Roots that hold a player in place until destroyed. They do not expire — someone has to break them, or Ikuzz has to trample them."
  - id: 1236709
    name: "Thorncaller Roar"   # auto
    # 2 sec cast
    tag: dodge
    prio: 2
    note: "82k to everyone while roots erupt around it every 2 sec for 6 sec."
  - id: 1236731
    name: "Thorncaller Roar"   # auto
    # Instant · 500 yd range
    tag: dodge
  - id: 1236746
    name: "Verdant Stomp"   # auto
    # 3 sec cast · 150 yd range
    tag: dodge
    prio: 2
    note: "145k and a knockback, then roots at everyone's feet 4 sec later. The knockback decides where those roots land."
  - id: 1236747
    name: "Verdant Stomp"   # auto
    # Instant · 150 yd range
    tag: dodge
  - id: 1237073
    name: "Lightcrazed Frenzy"   # auto
    # 1 sec cast
    tag: dodge
    prio: 2
    note: "+20% movement speed and a 29k pulse every 2 sec. A faster fixate is a harder fixate."
  - id: 1263420
    name: "Lightcrazed Frenzy"   # auto
    # Instant · 150 yd range
    tag: dodge

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Bloodthorn Roots hold until destroyed, and the fixate does not stop for them. A rooted player is a dead player unless someone breaks the roots — or Ikuzz is kited over them."
---

A kiting fight where the hazard and the answer are the same object.

**Bloodthirsty Gaze** fixates a player for 10 seconds, and **Bloodthorn Roots** — sown by
Thorncaller Roar and by Verdant Stomp — hold whoever they catch **until destroyed**. They do
not time out. So the failure case is simple and fatal: the fixated player gets rooted, and the
boss arrives.

The way out is in **Crushing Footfalls**: while fixating, Ikuzz crushes any roots within 7
yards as it moves. Kiting it *through* the root field clears the field. The instinct to run
around the roots is the wrong one — running through them, with the boss behind, is what breaks
them.

**Verdant Stomp** is worth reading in order: knockback first, roots at everyone's feet four
seconds later. Where the knockback leaves the group is where the roots grow.
