---
npcId: 241869

# Traduction : seuls les champs de texte sont repris. `threat`, `role`, `tag` et `prio` sont
# des jugements, pas de la langue — ils restent dans la fiche de base et se fusionnent ici.

spells:
  - id: 1241463
    note: "Emprisonne chaque joueur dans la glace, à 39k toutes les 2 s jusqu'à destruction. Personne ne fait plus rien tant que les tombes ne sont pas cassées — le groupe doit s'extraire lui-même."
  - id: 1240280
    note: "388k et un étourdissement de 4 secondes à tout le monde dans les 12 mètres. Étourdi à l'intérieur d'une Tombe glaciale, c'est la séquence qui met fin aux pulls — restez hors des 12 mètres."

trap: "**Tombe glaciale** n'expire pas — elle tient jusqu'à ce qu'on la casse. Être étourdi par **Pulvérisation** pendant qu'un joueur est emprisonné, c'est n'avoir plus personne pour casser quoi que ce soit."
---

Deux unités à 28 forces chacune, et le mob de trash le plus capable de terminer une run à lui
seul.

**Tombe glaciale** emprisonne *tous* les joueurs et tique jusqu'à ce que la glace soit détruite.
Il n'y a aucune durée à attendre : les dégâts du groupe sur ses propres tombes sont la seule
sortie.

**Pulvérisation** étourdit tout ce qui se trouve dans les 12 mètres pendant 4 secondes. Lus
ensemble, le cas d'échec est évident et fatal : un groupe emprisonné *et* étourdi est un groupe
qui ne fait rien pendant que les tics continuent. Garder les distants hors du cercle de
12 mètres, c'est ce qui empêche les deux mécaniques de se superposer.

Method signale la Bénédiction de liberté comme réponse à la tombe, ce qui est l'autre voie de
sortie.
