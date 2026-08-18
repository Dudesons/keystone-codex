---
npcId: 134174

# Traduction : seuls les champs de texte sont repris. `threat`, `role`, `tag` et `prio` sont
# des jugements, pas de la langue — ils restent dans la fiche de base et se fusionnent ici.

spells:
  - id: 269972
    note: "116k d'emblée et 39k par seconde pendant 12 s — environ 580k si ça court. Une **malédiction**, la dissipation qu'un groupe a le moins de chances d'avoir. Kicker celle-ci, pas l'éclair."
  - id: 1294815
    note: "116k sur un joueur. Dissipable comme magie, donc c'est le moins cher des deux à laisser passer."

trap: "Deux sorts kickables, et c'est la malédiction qui compte. **Salve maléfique** d'abord — **Éclair de givre-ombre** est plus petit et se retire comme de la magie."
---

Une unité à 20 forces, avec deux incantations interruptibles et un classement clair entre elles.

**Salve maléfique** pose 116k d'emblée, puis une malédiction de douze secondes à 39k par
seconde — environ 580k au total si personne ne nettoie. **Éclair de givre-ombre** fait 116k.
L'infobulle de MDT ne nomme aucun rayon sur l'une ni l'autre, donc traiter la salve comme le
plus gros coup plutôt que comme un AoE.

Toutes deux portent un type de dissipation — malédiction pour la salve, magie pour l'éclair —
ce qui veut dire que l'interruption doit aller à celle que le groupe aura le moins de chances de
pouvoir nettoyer ensuite.

Seule la **provocation** s'applique à ce mob, il n'y a donc pas moyen de le contrôler à la place.
