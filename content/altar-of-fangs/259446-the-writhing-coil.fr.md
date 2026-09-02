---
npcId: 259446

# Traduction : seuls les champs de texte sont repris. `threat`, `role`, `tag` et `prio` sont
# des jugements, pas de la langue — ils restent dans la fiche de base et se fusionnent ici.

spells:
  - id: 1298949
    note: "678k physique sur la cible actuelle — le plus gros coup unique du donjon."
  - id: 1299053
    note: "9,7k par seconde, et ça ajoute une application par seconde. Ça ne s'arrête pas tout seul : seule la scission du Coil y met fin."
  - id: 1287798
    note: "Attache des joueurs au Coil. Ce sont les joueurs attachés qui s'éloignent de 10 mètres qui forcent le **Désentortillement**."
  - id: 1287811
    note: "145k à tout le monde, et le Coil se scinde en Tortilleurs déroulés."
  - id: 1300612
    note: "La scission elle-même. Chaque Tortilleur porte une part de la vie du Coil, et au bout de 20 s ils incantent **Assimilation** : le Coil revient avec leur vie cumulée. Ces vingt secondes sont le combat."
  - id: 1300503
    note: "Chaque Tortilleur se concentre sur un joueur, pendant les 20 secondes que dure la scission."
  - id: 1305368
    note: "-5 % de dégâts infligés par cumul tant que ça tique. Dissipable comme poison ; son chiffre de dégâts n'est pas à l'échelle, donc il n'est pas cité."
  - id: 1305393
    note: "Un Tortilleur vaincu déstabilise le sol et repousse qui se tient au-dessus. Son chiffre de dégâts n'est pas à l'échelle."
  - id: 1300686
    note: "Les Tortilleurs convergent pour reformer le Coil. Rien à quoi réagir — quand ça s'incante, il est trop tard pour réagir."
  - id: 1299130
    note: "387k sur tout ce qui se trouve sur son passage."
  - id: 1299902
    note: "Cône frontal, 387k."
  - id: 1299154
    note: "87k à tout le monde, puis 17k par seconde pendant 35 s."
  - id: 1310357
    note: "Annonce trois **Atrophie toxique** à la suite. L'annonce est le seul préavis ; les debuffs eux-mêmes sont instantanés."
  - id: 1310547
    note: "-20 % de dégâts infligés et -20 % de vitesse de déplacement sur tout le monde, cumulable, sans incantation à interrompre. C'est la copie des Tortilleurs qui est interruptible."

trap: "**Désentortillement** est l'objectif, pas l'accident — mais la scission dure 20 secondes, puis le Coil se reforme avec ce qu'il reste de vie aux Tortilleurs. La fenêtre se passe sur eux."
---

Une seule mécanique décide de ce combat, et elle se lit facilement à l'envers.

**Cliquetis mortel** n'expire pas. Il ajoute une application par seconde et continue *jusqu'à ce
que le Writhing Coil soit scindé*. La seule chose qui le scinde, c'est **Désentortillement** — et Désentortillement
est déclenché par **Poigne de la vigne** : les joueurs attachés qui s'éloignent de 10 mètres.

Les lianes ne sont donc pas une punition à fuir, elles sont l'outil. Rester en place laisse
Cliquetis mortel monter sans opposition ; s'écarter y met fin et scinde le boss en
[Tortilleurs déroulés](#/d/altar-of-fangs/codex/mob/262398).

**La scission est une fenêtre, pas une résolution.** Chaque Tortilleur porte une part de la vie
du Coil, et au bout de **20 secondes** ils incantent **Assimilation** : le boss revient avec
leur vie cumulée. Tout ce que le groupe veut faire, il le fait dans ces vingt secondes — qui
sont aussi le moment où ses deux réponses existent : MDT marque l'**Atrophie toxique** des
Tortilleurs comme interruptible et laisse celles du Coil sans marque, et l'infobulle dit
explicitement que les Tortilleurs sont sensibles au contrôle. Ce point mérite sa propre phrase.
Chaque mob de ce donjon a une liste `cc` vide, comme dans tous les donjons de Midnight, et sur
les neuf infobulles de la saison qui parlent de contrôle, huit y accordent l'*immunité*. Celle-ci
est la seule qui dise qu'une unité peut être contrôlée.

**Barrage toxique** est ce qui donne son prix à la fenêtre. Il annonce trois Atrophie toxique à
la suite — chacune **-20 % de dégâts infligés et -20 % de vitesse de déplacement**, cumulables —
et sur le Coil elles sont instantanées, sans rien à kicker, esquiver ou dissiper. Le debuff est
donc un chronomètre : plus le combat dure hors de la scission, moins le groupe fait de dégâts.

Les Tortilleurs amènent trois problèmes plus petits avec eux. **Chasse malveillante** concentre
chacun d'eux sur un joueur pendant les vingt secondes entières, et **Venin malveillant** cumule
-5 % de dégâts infligés jusqu'à ce que quelqu'un dissipe le poison. **Ébranlement** répond de la
mort de chaque Tortilleur par une poussée. Tous portent des chiffres de dégâts qui ne sont pas à
l'échelle, donc cette fiche n'en cite aucun.

**Faucheuse caudale**, c'est 678k sur le tank, le coup le plus dur d'Altar of Fangs.
