---
npcId: 134602

# Traduction : seuls les champs de texte sont repris. `threat`, `role`, `tag` et `prio` sont
# des jugements, pas de la langue — ils restent dans la fiche de base et se fusionnent ici.

spells:
  - id: 1308100
    note: "Étourdit un joueur et inflige 97k par seconde pendant 5 s. Nécessite la furtivité pour être lancé — c'est donc l'ouverture. Kickable, et dissipable comme poison."
  - id: 1295610
    note: "Se téléporte sur un joueur et frappe pour 68k. Il choisit sa cible lui-même."

trap: "**Coup bas empoisonné** ouvre depuis la furtivité avec un étourdissement. Celui qui le prend est hors du combat pendant cinq secondes au pire moment possible — le début du pull."
---

Sept unités à 7 forces chacune, et elles ouvrent depuis la furtivité.

**Coup bas empoisonné** nécessite la furtivité pour être lancé, ce qui en fait la *première*
chose qui arrive dans un pull plutôt que quelque chose qui survient en cours de combat — un
étourdissement plus cinq secondes de ticks à 97k, qui tombent avant que le groupe soit installé.

Les deux réponses fonctionnent : c'est **interruptible**, et le poison est dissipable. Et le
Serpent prend Étourdissement, Peur, Racine, Ralentissement, Métamorphose et Assommer, donc on
peut le gérer avant même qu'il n'ouvre si le pull est préparé.
