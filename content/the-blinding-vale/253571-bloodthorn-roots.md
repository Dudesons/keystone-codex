---
npcId: 253571
name: "Bloodthorn Roots"   # auto
count: 0   # auto — forces per unit

# Sown throughout the Ikuzz encounter, and worth no forces.
threat:
role: add

spells:
  - id: 1259365
    name: "Bloodthorn Roots"   # auto
    # dispel: magic · Channeled · Unlimited range
    tag: dispel
    prio: 1
    note: "48k every second, and it roots until destroyed — no timer. MDT gives it a magic dispel type, which is the fast way out."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "It holds until something breaks it. Waiting is not an option — dispel it, break it, or have Ikuzz trample it."
---

The hazard the [Ikuzz](#/d/the-blinding-vale/map/mob/244887) fight is built around, tracked by MDT
as a unit of its own because it has to be killed.

Two things make it dangerous. It deals 48k a second, and it holds its target **until
destroyed** — there is no duration to wait out. With Ikuzz fixating someone at the same time,
a root that is not dealt with is simply fatal.

Three answers exist, and it is worth knowing all of them: MDT lists a **magic dispel** type,
the roots can be broken with damage, and Ikuzz's own **Crushing Footfalls** crushes any within
7 yards as it moves — which is why kiting it through the field is the play rather than around
it.
