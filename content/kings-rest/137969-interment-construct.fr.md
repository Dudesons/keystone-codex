---
npcId: 137969

# Traduction : seuls les champs de texte sont repris. `threat`, `role`, `tag` et `prio` sont
# des jugements, pas de la langue — ils restent dans la fiche de base et se fusionnent ici.

spells:
  - id: 271555
    note: "Enferme un joueur dans une crypte. Il est hors du combat jusqu'à ce que quelqu'un l'ouvre — et l'Assemblage commence à se lamenter pendant qu'il est dedans."
  - id: 271561
    note: "78k à tout le monde toutes les 2 s, croissant avec le temps, jusqu'à 30 s. Ça s'arrête à l'instant où le joueur enfermé est libéré. Le libérer, ne pas essayer de soigner par-dessus."
  - id: 1312569
    note: "97k par seconde pendant 6 s sur un joueur."
  - id: 1310755
    note: "24k à tout le monde à chaque coup de mêlée."

trap: "**Plainte de deuil** monte en puissance pendant trente secondes et s'arrête à l'instant où le joueur emprisonné est libéré. Ouvrir la crypte — soigner à travers est l'option perdante."
---

Deux unités à 15 forces chacune, et une mécanique avec un interrupteur explicite.

**Enfermer** retire un joueur du combat ; **Plainte de deuil** facture ensuite aux quatre restants
78k toutes les 2 secondes, *en augmentant avec le temps*, jusqu'à trente secondes. Quatre joueurs
qui soignent à travers une montée en puissance alors qu'il en manque un, c'est exactement la
mauvaise forme.

L'infobulle dit comment ça se termine : *libérer le joueur enterré arrêtera cette capacité*. La
crypte est donc la priorité, avant l'Assemblage lui-même.
