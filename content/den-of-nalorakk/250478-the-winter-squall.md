---
npcId: 250478
name: "The Winter Squall"   # auto
count: 50   # auto — forces per unit

threat: high
role: melee
rank: miniboss

spells:
  - id: 1309964
    name: "Harsh Winter"   # auto
    # Instant · 100 yd range
    tag: dodge
    prio: 1
    note: "A dense cloud around itself: 39k Frost every 2 sec inside, and nobody can target into or out of it. Ranged lose the mob, the healer loses whoever walked in."
  - id: 1309947
    name: "Harsh Winter"   # auto
    tag: dodge
    note: "The second variant. Its tooltip figures are unscaled — the radius field holds a damage value — so nothing about the size can be read from the data."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Harsh Winter blocks line of sight both ways. A player inside the cloud cannot be healed from outside it — that is what kills, not the 39k."
---

Fifty forces on a single body, the largest one-mob share in the dungeon.

**Harsh Winter** is unusual in that its damage is the least of it. The cloud prevents targeting
in either direction: melee inside it are cut off from the healer, ranged outside it cannot
touch the mob. Whichever side the group ends up on, half of them stop working.

One honest caveat: the two MDT variants of this spell carry **broken tooltip values** — one
reads 0 damage in a 0-yard radius, the other a radius of 38793 yards, which is the damage
figure in the wrong field. The mechanic is legible; the dimensions are not, and this card does
not guess at them.
