---
npcId: 138489
name: "Shadow of Zul"   # auto
count: 30   # auto — forces per unit

threat: high
role: melee
rank: miniboss

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Two players get a large area around them and have to split off — from the group **and** from each other. Everything else here waits on that."
---

Thirty forces on one body, the most of any trash mob in King's Rest, and 8.4 million health.
**Taunt** is the only crowd control that applies.

## What it does

The fight has three moving parts, in this order:

1. **Two players are marked**, each carrying a large area of damage around them. They have to
   split — away from the group and away from each other. Nothing else can be handled until
   they are clear.
2. **Two soaks** follow, so the remaining players pair off to cover them.
3. **One cast to interrupt.**

## Why no spell list appears below

**MDT extracted no spells at all for this mob** — an empty ability list, which is a gap in the
data rather than a mob that does nothing. The three parts above come from playing it, not from
a data source, which is why they are written here as prose and not as spell entries: this
codex only carries spell IDs that exist in the extracted data, and inventing identifiers would
put fake links in front of a reader.

For reference, Method's tracker names three abilities MDT does not carry — *Shadow Barrage*,
*Pool of Darkness* and *Dark Revelation*. They are not mapped onto the three parts above,
because matching them up would be a guess.
