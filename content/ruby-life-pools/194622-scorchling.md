---
npcId: 194622
name: "Scorchling"   # auto
count: 0   # auto — forces per unit

# The encounter variant, immune to every CC MDT lists. Worth no forces.
threat:
role: add

spells:
  - id: 1307372
    name: "Fiery Demise"   # auto
    # Instant · Unlimited range
    tag: dodge
    prio: 1
    note: "It becomes a fire pool where it dies, ticking 97k per second."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Same pool on death, and this one cannot be moved with crowd control — only with a taunt."
---

The second MDT entry for the Scorchling, distinguished from
[the first](#/d/ruby-life-pools/codex/mob/190205) by being immune to every crowd control listed.

Same death pool, one fewer way of choosing where it lands.
