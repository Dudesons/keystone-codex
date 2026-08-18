---
npcId: 250478

# Traduction : seuls les champs de texte sont repris. `threat`, `role`, `tag` et `prio` sont
# des jugements, pas de la langue — ils restent dans la fiche de base et se fusionnent ici.

spells:
  - id: 1309964
    note: "Un nuage dense autour de lui : 39k de Givre toutes les 2 s à l'intérieur, et personne ne peut cibler vers l'intérieur ni vers l'extérieur. Les distants perdent le mob, le heal perd celui qui est entré."
  - id: 1309947
    note: "La seconde variante. Les chiffres de son infobulle ne sont pas mis à l'échelle — le champ du rayon contient une valeur de dégâts — donc les données ne disent rien de sa taille."

trap: "**Hiver rude** coupe la ligne de vue dans les deux sens. Un joueur pris dans le nuage ne peut pas être soigné depuis l'extérieur — c'est ça qui tue, pas les 39k."
---

Cinquante forces sur un seul corps, la plus grosse part d'un mob unique dans le donjon.

**Hiver rude** est inhabituel en ce que ses dégâts sont le moindre de ses problèmes. Le nuage
empêche le ciblage dans les deux sens : la mêlée à l'intérieur est coupée du heal, les distants à
l'extérieur ne peuvent pas toucher le mob. De quelque côté que le groupe se retrouve, la moitié
cesse de travailler.

Une réserve honnête : les deux variantes MDT de ce sort portent des **valeurs d'infobulle cassées**
— l'une indique 0 dégât dans un rayon de 0 mètre, l'autre un rayon de 38793 mètres, qui est le
chiffre de dégâts dans le mauvais champ. La mécanique est lisible ; les dimensions non, et cette
fiche ne les devine pas.
