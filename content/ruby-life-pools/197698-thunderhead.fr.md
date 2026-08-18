---
npcId: 197698

# Traduction : seuls les champs de texte sont repris. `threat`, `role`, `tag` et `prio` sont
# des jugements, pas de la langue — ils restent dans la fiche de base et se fusionnent ici.

spells:
  - id: 392641
    note: "32k par seconde pendant 45 s, cumulable. Le retirer envoie une Décharge d’électricité dans le groupe, donc la dissipation est une décision, pas un réflexe."
  - id: 1310599
    note: "Ce que Tonnerre grondant paie à son retrait : 78k plus 15k par seconde pendant 10 s à tout le monde dans les 60 mètres, cumulable."
  - id: 392395
    note: "582k Physique plus 145k Nature et une projection. La projection est la moitié dangereuse — elle met le tank hors de portée."
  - id: 391726
    note: "Cône frontal à 97k toutes les demi-secondes pendant 3 s. Quatre secondes d'incantation pour en sortir."

trap: "Dissiper **Tonnerre grondant** n'est pas gratuit — ça détone dans le groupe. Nettoyer les stacks quand le groupe est full vie, pas quand quelqu'un est déjà bas."
---

Quarante-huit forces sur une seule unité, la plus grosse part portée par un mob unique de Ruby
Life Pools, avec un frontal et un tank buster en plus. Il se comporte comme un miniboss et mérite
d'être traité comme tel.

**Tonnerre grondant** est la capacité à comprendre. Il court 45 secondes, se cumule, et paie au
*retrait* : Décharge d’électricité touche tout le monde dans les 60 mètres pour 78k plus un
saignement de 10 secondes, et ça se cumule aussi. La dissipation est donc une question de timing
— la prendre tant que le groupe est en forme, ou laisser tourner les ticks et payer plus tard.

Un désaccord à connaître : MDT déclare Tonnerre grondant en dissipation **magie**, alors que le
tracker de Method suggère que Stoneform le retire, ce qui en ferait quelque chose de physique par
nature. Les données de ce dépôt viennent de MDT, donc le badge `D` suit MDT. S'il faut un jour
réconcilier les deux, c'est sur cette capacité.
