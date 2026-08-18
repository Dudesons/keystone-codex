---
npcId: 190485

# Traduction : seuls les champs de texte sont repris. `threat`, `role`, `tag` et `prio` sont
# des jugements, pas de la langue — ils restent dans la fiche de base et se fusionnent ici.

spells:
  - id: 381515
    note: "388k Physique et 194k Nature, et ça double les dégâts de Nature subis par la cible pendant 30 s — cumulable. Le dissiper, sinon le Frappement de la tempête suivant tombe sur un tank qui prend le double."
  - id: 381516
    note: "97k à tout le monde et toutes les incantations du groupe interrompues pendant 2 s. Remonter les barres de vie avant que ça se déclenche, pas après."
  - id: 381517
    note: "10k par seconde pendant 8 s, et ça pousse les joueurs — et les Braises enflammées de Kyrakka — à travers la salle."
  - id: 181089
    note: "Du scripting, pas une capacité."

trap: "**Frappement de la tempête** cumule +100 % de dégâts de Nature subis sur le tank. C'est la dissipation qui rend le deuxième survivable."
---

L'autre moitié du combat avec [Kyrakka](#/d/ruby-life-pools/codex/mob/190484), et celle qui punit
de réagir trop tard.

**Frappement de la tempête** est un tank buster avec un multiplicateur greffé dessus : +100 % de
dégâts de Nature subis pendant 30 secondes, cumulable, dans un combat où l'essentiel des dégâts
entrants *est* de la Nature. MDT le marque comme dissipation magie, ce qui est la réponse prévue
— laissé en place, le débuff rend l'incantation suivante de la même capacité bien pire que la
première.

**Interruption d’explosion nuageuse** empêche le groupe d'incanter pendant deux secondes, sur un
préavis de cinq secondes. Rien ne s'esquive ici ; le jeu consiste à être full vie avant que ça se
résolve plutôt qu'à essayer de soigner à travers le blocage.

**Vents du changement** est ce qui fait des braises de Kyrakka un problème mobile plutôt que
statique.
