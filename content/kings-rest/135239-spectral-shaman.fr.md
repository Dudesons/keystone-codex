---
npcId: 135239

# Traduction : seuls les champs de texte sont repris. `threat`, `role`, `tag` et `prio` sont
# des jugements, pas de la langue — ils restent dans la fiche de base et se fusionnent ici.

spells:
  - id: 270497
    note: "10 % de la vie maximale à chaque allié proche toutes les 2,5 s, pendant 30 secondes. Instantané, donc il n'y a rien à kicker — tuer le totem."
  - id: 270499
    note: "58k et -25 % de vitesse de déplacement pendant 15 s. Dissipable comme magie."

trap: "**Totem de marée de soins** est instantané — il n'y a pas d'incantation à interrompre. Il soigne 10 % toutes les 2,5 secondes pendant trente secondes tant que personne ne tue l'objet."
---

Quatre unités à 7 forces chacune, et le test de soins du trash de ce donjon.

**Totem de marée de soins** vaut la peine qu'on en fasse le calcul : 10 % de la vie maximale, à
chaque allié à portée, toutes les 2,5 secondes, pendant 30 secondes. C'est potentiellement 120 %
de la vie d'un pack rendue par une seule incantation instantanée.

Instantané veut dire aucune interruption. Le [totem](#/d/kings-rest/codex/mob/137591) lui-même a
0,4 million de points de vie et doit être tué — ce qui explique pourquoi ce mob dépasse largement
ses 7 forces.

MDT indique Étourdissement, Silence, Ralentissement et Désorientation comme applicables, donc un
silence avant que le totem tombe fonctionne aussi.
