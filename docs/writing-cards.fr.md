# Écrire une fiche de codex

*This page also exists in English: [`writing-cards.md`](writing-cards.md).*

Cette page porte le **jugement** : comment un mob est évalué, et ce qu'une fiche a le droit
d'affirmer. Le **format** — chaque clé, ses valeurs autorisées, ce qu'un `.fr.md` peut porter,
comment ouvrir une pull request — c'est [`CONTRIBUTING.fr.md`](../CONTRIBUTING.fr.md). Chaque
réponse vit dans l'une des deux et l'autre y renvoie : une règle écrite deux fois est une règle
qui finira par se contredire.

Une fiche sous `content/<donjon>/<npcId>-<slug>.md` ne porte que ce qu'un humain apporte : un
niveau de menace, ce qu'il faut interrompre, le piège du pack, et de la prose. Tout ce qui est
mécanique — nom, forces, CC, IDs de sorts — vient de MDT et ne doit jamais être tapé à la main.

Les notes de travail par donjon vivent dans [`codex-notes/`](codex-notes/) : un fichier par
donjon qui consigne chaque évaluation et sa raison, les questions auxquelles seul le jeu peut
répondre, et les endroits où les sources se contredisent. **Lisez la note du donjon avant de
modifier ses fiches**, et mettez-la à jour dans la même passe — c'est le registre des décisions
déjà prises.

## L'échelle de menace

Quatre niveaux. La question n'est jamais « le chiffre est-il gros », c'est **à quel point cela
change le pull**.

| Niveau | Signifie |
| --- | --- |
| `low` | Le jeu normal s'en occupe. Aucune décision à prendre. |
| `medium` | Demande une réponse, mais une réponse de routine — un kick, un dissipel, un pas de côté, un apaisement. |
| `high` | Force le groupe à changer ce qu'il est en train de faire. |
| `lethal` | Peure tout le groupe, pose un étourdissement massif, ou est une zone qui vous tue si vous restez dedans. |
| *(vide)* | Rien pour l'évaluer. **Laissez vide plutôt que de deviner** — voir plus bas. |

Trois règles qui en découlent, et que la relecture a re-dérivées jusqu'à ce qu'elles soient
écrites :

- **Le poids n'est pas la menace.** `count × placements` dit combien de donjon un mob vaut, pas
  à quel point il est dangereux. Un corps qui vaut 35 % des forces peut être `medium` ; un corps
  à 0 force peut être `high` (le Curious Yearling de Den of Nal'orakk lance l'enrage complet de
  la Matriarch et ne vaut rien du tout).
- **Un buff défensif ne monte jamais la menace.** Un bouclier de réduction de dégâts, un mur de
  raid, une immunité au CC — évaluez le mob sur ses dégâts seuls. Le Protective Turtle de
  Voidscar donne −75 % de dégâts subis au pack et reste `low`. Un buff *offensif* (vitesse
  d'attaque, dégâts infligés) compte, et un bouclier à composante offensive aussi : le Tempest
  Stormshield de Ruby irradie des dégâts et se détonne en étourdissement, ce n'est donc pas un
  buff défensif.
- **Une capacité avec une réponse claire est au plus `medium`**, quelle que soit la taille du
  chiffre. Deux réponses, c'est `medium` sans discussion. Ce qui mérite `high`, c'est de n'avoir
  aucune réponse, ou de forcer tout le monde à s'arrêter pour s'en occuper.

Exemple travaillé des deux dernières règles, sur deux mobs qui se ressemblent à s'y tromper —
7 forces chacun, « le soigneur du pack » tous les deux :

| | Earthwhisper Tender (Den) — `high` | Voidminder (Voidscar) — `low` |
| --- | --- | --- |
| Soigne | **les alliés proches**, 5 % PV max / 2 s | **sa cible**, 3 % PV max / 2 s |
| Réponses | interruption **ou** dissipel magique | interruption |

**Les boss ne portent pas de `threat`.** Leur anneau est doré de toute façon, le champ
n'ajouterait qu'un badge redondant. **Un mob que vous rétrogradez avec `rank: miniboss` n'est
plus un boss**, et son anneau redevient l'évaluation de menace — une fiche rétrogradée en mérite
donc une.

**`rank` parle du combat, pas de la barre de vie.** Écrivez `boss` pour ce que le donjon compte
comme une rencontre, et `miniboss` pour une unité qui arrête le groupe sans en être une. Le
drapeau de MDT est la valeur par défaut et il se trompe dans les deux sens — il marque toute
unité qui apparaît dans une rencontre, si bien qu'un conseil de trois se lit comme trois boss,
et il ne marque rien pour le bloqueur à 200 M de PV planté dans un couloir. Laissez `rank` de
côté sauf si vous corrigez.

## Ce qui peut être écrit

La règle dure, et celle qui a été le plus cassée : **n'écrivez jamais ce que la donnée ne porte
pas.** Trois erreurs à reconnaître, toutes commises ici :

1. **Inventer des IDs de sorts.** Chaque `id:` d'une fiche doit exister dans
   `src/data/generated/<donjon>.json`. Vérifiez-le ; ne le reconstruisez pas depuis un nom.
2. **Déduire depuis un nom.** Le Hex Volley de King's Rest a été décrit comme touchant tout le
   groupe dans une note, un piège et la prose, à cause du mot *Volley*. Le tooltip de MDT ne
   nomme aucun rayon. Si le tooltip ne le dit pas, la fiche ne le dit pas.
3. **Lire une donnée absente comme une négation.** Une liste `cc` vide veut dire que MDT n'a pas
   rempli le donjon, pas que le mob est immunisé (`hasCcData` sur `DungeonLookup` porte
   désormais cette distinction). Un type de dissipel non consigné ne veut pas dire qu'une
   capacité ne peut pas être apaisée.

### Quand la donnée manque ou se trompe

| Situation | Quoi faire |
| --- | --- |
| **Aucun sort** pour un mob (Temple Disruptor, Coffin) | Dites-le dans la prose. N'écrivez rien dans `spells:`. Une mise à jour de MDT peut combler le trou plus tard — celui de Shadow of Zul l'a été en 6.2.10 — donc dites *la donnée est vide*, pas *le mob ne fait rien*. |
| **Quelque chose que vous savez pour l'avoir joué** | Écrivez-le dans la prose et **signalez-le comme observé** — jamais comme entrée de sort, jamais comme badge, parce que les badges sont générés depuis une donnée qui ne le contient pas. |
| **Rien de connu, d'aucune source** | Laissez `threat:` vide avec un commentaire disant que c'est délibéré. L'anneau gris est honnête ; une supposition se lit exactement comme un jugement. |
| **Un tooltip non mis à l'échelle** (`10 Physical`, `55`, une valeur de dégâts dans un champ de rayon) | Décrivez le comportement et la durée. **Ne citez aucun chiffre.** Consignez-le dans la note du donjon. |
| **Method et MDT se contredisent** | Suivez MDT, parce que les badges viennent de MDT — et nommez la contradiction dans la prose. Consignez-la dans la note du donjon. |

## À quoi sert une astuce

**Les astuces servent à ce qu'une fiche ne peut pas dire.** Une entrée `tips:` porte une phrase,
une vidéo YouTube ou un Short, ou une capture d'écran commitée sous `public/tips/<donjon>/`. Le
format est dans [`CONTRIBUTING.fr.md`](../CONTRIBUTING.fr.md) ; ce qui appartient ici, c'est le
jugement :

- **Une astuce n'est pas un second bloc de prose.** Si ça peut s'écrire comme une phrase dans la
  fiche, écrivez-le là. Une astuce gagne sa place quand ce qu'elle explique est spatial ou une
  question de timing — où se placer, à quoi ressemble le pull quand il tourne mal.
- **Créditez l'auteur dans le `label:`.** Nous lions le travail des autres ; nous ne le
  présentons pas comme le nôtre, et nous ne transcrivons pas les affirmations d'une vidéo dans
  la fiche comme si elles étaient sourcées.
- **Une vidéo n'est pas une source.** Les règles de [*Ce qui peut être
  écrit*](#ce-qui-peut-être-écrit) ne changent pas : un chiffre entre dans la fiche seulement si
  MDT ou Wowhead le porte. Une vidéo peut les contredire, et si elle le fait, dites-le dans la
  prose plutôt que de la suivre en silence.
- **Cadrez une astuce quand elle parle d'un pull.** « Ce frontal est large » parle du mob, se
  passe de cadrage, et marque chaque blip de ce mob. « Prenez celui-ci après le premier boss, par
  la gauche » parle d'un groupe de mobs planté à un endroit : `packs:` déplace la marque du mob
  vers le pull, là où le conseil s'applique vraiment. Sans lui, la carte marque chaque clone de
  ce mob dans le donjon — onze, dans le cas pour lequel cette clé a été écrite. Si vous ne savez
  pas nommer le pack, l'astuce est probablement générale.
- **Les astuces ne sont jamais exportées vers MDT**, comme tout ce qui vit sous `content/`.

## Deux détails que la référence de format ne porte pas

**Un lien entre fiches de mobs s'écrit `#/d/<slug>/codex/mob/<npcId>`.** Le rendu émet le href
tel quel et rien dans l'app ne le réécrit, donc l'adresse doit être celle que le routeur sert
vraiment — la fiche d'un mob vit sous la route du codex, pas sous le briefing du donjon à
`/d/<slug>`.

**`tag: frontal` est un cône** qu'on évite en ne restant pas devant ; **`tag: dodge` est une
flaque au sol** dont on sort à pied. Seul `frontal` remonte jusqu'au briefing du pull.

## Dans quelle langue va un jugement

`threat`, `role`, `rank`, `tag` et `prio` sont des jugements et vivent **uniquement dans le
fichier de base** ; un frère `.fr.md` porte `note`, `trap` et la prose. La référence de champs de
`CONTRIBUTING.fr.md` en donne la liste complète.
