---
npcId: 135764
name: "Explosive Totem"   # auto
count: 0   # auto — forces per unit

# One of Zanazal's three totems, and worth no forces.
threat:
role: add

spells:
  - id: 267077
    name: "Explode"   # auto
    # 9 sec cast
    tag: dodge
    prio: 1
    note: "397k to all players after a nine-second cast. 0.4 million health. Nine seconds is a long window and the consequence of missing it is enormous."
  - id: 1309499
    name: "Reinforced"   # auto
    tag: ignore
    note: "MDT carries no tooltip text for it. All three of Zanazal's totems have it."

# The trap: the sentence that avoids the wipe. Leave empty if the mob is harmless.
trap: "Nine seconds, 0.4 million health, 397k to everyone if it finishes. This is the first totem to die, every time."
---

The one of [Zanazal](#/d/kings-rest/map/mob/269810)'s three totems that ends runs.

The numbers make the priority obvious: 0.4 million health against 397k party-wide damage, on a
nine-second timer. Compared with the Disruption Totem's four-second lockout and the Torrent
Totem's knockback, there is no argument about kill order.

It cannot be crowd controlled — the totems answer to nothing MDT lists.
