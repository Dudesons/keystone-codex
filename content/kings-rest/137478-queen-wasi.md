---
npcId: 137478
name: "Queen Wasi"   # auto
count: 25   # auto — forces per unit

threat: medium
role: miniboss

spells:
  - id: 270920
    name: "Bind Soul"   # auto
    # dispel: magic · 2.5 sec cast · 30 yd range
    tag: kick
    prio: 1
    note: "Charms a player for 10 sec — they fight the group until it breaks or they would die. Interruptible, and dispellable as magic if the kick is missed."
  - id: 1294972
    name: "Soul Bolt"   # auto
    # dispel: magic · 2.5 sec cast · 100 yd range
    tag: kick
    prio: 2
    note: "116k on one player. Second in line behind Bind Soul, always."
  - id: 1297326
    name: "Eternal Bond"   # auto
    # Instant
    tag: ignore
    note: "She and King Timalji share health."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Bind Soul turns a player against the group for ten seconds. It is kickable and it is a magic dispel — two chances, and losing both costs a fifth of the party."
---

The casting half of the royal pair, sharing a health pool with
[King Timalji](#/d/kings-rest/codex/mob/137474) through **Eternal Bond**.

**Bind Soul** is the reason her side of the fight needs attention. A charmed player is not
merely absent — they are attacking their own group, for ten seconds, in a fight that already
has a travelling Bladestorm in it.

There are two chances to stop it: the interrupt, and then the **magic** dispel. **Soul Bolt**
is also kickable and should never take priority over Bind Soul.
