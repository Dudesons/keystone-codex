# Contribuer à Keystone Codex

Keystone Codex est un codex et une carte interactive pour les donjons Mythique+ de World of
Warcraft : chaque mob a une fiche qui dit ce qu'il fait, ce qu'il faut interrompre, et ce qui
wipe le groupe. La carte, les forces et les listes de sorts sont extraites du jeu ; les fiches,
elles, sont écrites par les gens qui font les donjons. Si vous les jouez, vous pouvez en
améliorer une. Une phrase corrigée est aussi bienvenue qu'une fiche entière, et ni l'une ni
l'autre ne demande d'être développeur — [éditer dans le navigateur](#dans-le-navigateur) ne
demande ni clone ni outillage.

*This guide also exists in English: [CONTRIBUTING.md](CONTRIBUTING.md).*

## Ce que vous pouvez modifier, et ce que vous ne pouvez pas

La moitié de ce qu'affiche une fiche n'a jamais été écrite à la main, et ne doit pas être
modifiée à la main. Toute modification de la colonne de droite est un travail que le prochain
`npm run data` effacera.

| À vous d'écrire — `content/<donjon>/*.md` | Généré — réécrit par `npm run data` |
| --- | --- |
| `threat` : à quel point ce mob change le pull | Noms, icônes, descriptions, temps d'incantation et portées des sorts — récupérés sur Wowhead |
| `role` : de quel genre de mob il s'agit | Noms des mobs, forces, positions sur la carte, CC applicables — extraits de MDT |
| `rank` : boss ou miniboss, quand le jeu et les joueurs ne sont pas d'accord | Les mobs que le jeu lui-même marque comme boss |
| Le `tag`, la `prio` et la `note` d'un sort | Quels sorts un mob possède, et leurs identifiants |
| `trap` : la phrase qui évite le wipe | Les cartes de donjon sous `public/maps/` |
| La prose sous le frontmatter | Tout ce qui se trouve sous `src/data/generated/` |
| `tips` : une phrase, une vidéo ou une capture | |

Une fiche fraîchement générée contient aussi quelques lignes que le scaffold a recopiées depuis
les données générées, à titre de rappel : `name:`, `count:` et `isBoss:`, chacune marquée
`# auto` ; le `name:` d'un sort, marqué de la même façon ; et, juste en dessous, un simple
commentaire donnant son temps d'incantation et sa portée. L'application n'en lit aucune, et en
changer une ne change rien à l'écran.

**Un nom de sort faux, un temps d'incantation faux ou un sort manquant sont un problème de
données, pas un problème de fiche.** Aucune modification dans `content/` ne peut les corriger,
donc n'essayez pas : [ouvrez une issue](https://github.com/Dudesons/keystone-codex/issues) à la
place.

## Deux façons de modifier

### Dans le navigateur

Rien à installer, et cela suffit pour n'importe quelle modification de texte.

1. Ouvrez le fichier sur GitHub — les fiches sont sous `content/<donjon>/`.
2. Cliquez sur l'icône du crayon (*Edit this file*).
3. Faites votre modification, puis cliquez sur **Commit changes…** et choisissez **Create a new
   branch for this commit and start a pull request**. Sur certains écrans, GitHub appelle ce
   bouton *Propose changes* ; c'est la même chose.
4. Remplissez le titre, ouvrez la pull request. C'est tout — la CI prend le relais.

Pour ajouter une capture d'écran, ouvrez `public/tips/<donjon>/` et utilisez **Add file → Upload
files** ; le sélecteur de fichiers l'envoie dans la même pull request. Si le dossier n'existe pas
encore, passez par **Add file → Create new file** et tapez `public/tips/<donjon>/` dans le champ
du nom : GitHub crée le dossier en même temps que le premier fichier qu'on y met.

### Sur votre machine

Un peu plus d'installation, mais un retour bien meilleur : la fiche se redessine quand vous
enregistrez.

```bash
npm install
npm run dev
```

Ouvrez le donjon, trouvez le mob, éditez son `.md`. Le serveur de dev recharge `content/` à
chaud : la fiche se met à jour sans rebuild. Avant de pousser :

```bash
npm test
npm run typecheck
```

Rien de tout cela ne demande d'avoir World of Warcraft ni MDT. Les scripts d'extraction lisent
une installation locale du jeu, mais leur résultat est versionné — l'application ne lit jamais
que les fichiers versionnés.

## Anatomie d'une fiche

Un fichier par mob, à `content/<slug-du-donjon>/<npcId>-<slug-du-nom>.md`. Le frontmatter YAML
entre les lignes `---`, la prose libre en dessous.

```markdown
---
npcId: 270306
threat: high              # low | medium | high | lethal
role: melee               # caster | melee | patrol | add
rank: miniboss            # facultatif : boss | miniboss — prime sur ce que dit MDT
spells:
  - id: 1306911
    tag: tank             # kick | frontal | dodge | dispel | tank | soak | ignore
    prio: 1
    note: "581k physique sur la cible actuelle."
trap: "Insensible à tous les CC : il faut le burst."
tips:
  - text: "Tirez-le dans le couloir — le frontal n'a plus moyen d'atteindre le heal."
---

Prose libre : placement, ordre de focus, cooldowns.
```

| Champ | Ce qu'il contient |
| --- | --- |
| `npcId` | L'identifiant du mob. Écrit par le scaffold ; ne le changez jamais — c'est par ce seul nombre que la fiche est rattachée à la carte. |
| `threat` | `low`, `medium`, `high` ou `lethal`. Détermine la couleur de l'anneau sur la carte. Voir [Évaluer la menace d'un mob](#évaluer-la-menace-dun-mob). |
| `role` | `caster`, `melee`, `patrol` ou `add`. De quel genre de mob il s'agit. |
| `rank` | `boss` ou `miniboss`. Sans lui, le mob est ce que MDT en dit. À écrire quand le jeu et les joueurs ne sont pas d'accord : une unité marquée boss qui est en réalité un miniboss, ou une unité non marquée que tout le monde traite comme telle. Une autre valeur est ignorée, et un test nomme le fichier. |
| `spells[].id` | Un identifiant de sort qui existe déjà dans les données générées. N'en inventez pas. |
| `spells[].tag` | `kick`, `frontal`, `dodge`, `dispel`, `tank`, `soak` ou `ignore`. Une fiche fraîche porte `tag: todo`, qui n'affiche aucun badge et veut dire « pas encore regardé ». |
| `spells[].prio` | Un nombre. À l'intérieur d'une fiche, il ordonne les sorts portant le même tag ; `prio: 1` peut en plus atteindre l'onglet Résumé du donjon. Voir [Annoter un sort](#annoter-un-sort). |
| `spells[].note` | Une phrase, affichée **à la place** de la description Wowhead. Si vous n'en mettez pas, c'est le texte de Wowhead qui s'affiche. |
| `trap` | La phrase, unique, qui évite le wipe. Laissez vide si le mob est inoffensif. |
| `tips` | Voir [Ajouter une astuce](#ajouter-une-astuce). |
| La prose | Tout ce pour quoi les phrases ci-dessus n'ont pas la place. |

`note` et `trap` sont du markdown, rendu en ligne : l'emphase et les liens fonctionnent, les
titres et les listes non. La prose, elle, est du markdown complet.

Un mob sans fichier s'affiche quand même, avec ses seules données MDT. Rien de ce que vous
laissez de côté ne casse quoi que ce soit.

## Recettes

Chacune de ces recettes fait une petite pull request. Aucune n'a besoin des autres.

### Ajouter ou modifier un piège

Le piège est la phrase qu'on lit en plein pull : elle dit ce qu'il faut *faire*, pas ce que le
mob *est*. Extrait de `content/the-blinding-vale/254850-sporeblight-belcher.fr.md` :

```yaml
trap: "Vingt-cinq forces par corps et 291k à chaque mort. Ne pas en laisser plusieurs mourir sur le groupe en même temps — étaler les kills ou les disperser."
```

Si le mob est vraiment inoffensif, laissez `trap:` vide. Un champ vide est une information ; un
champ rempli pour la forme est du bruit.

### Annoter un sort

Trouvez le sort dans la liste `spells:` — le scaffold a déjà écrit son identifiant, son nom et
son temps d'incantation — puis donnez-lui un `tag`, une `prio` s'il la mérite, et une `note` :

```yaml
  - id: 1263636
    name: "Belch Spores"   # auto
    # 1.5 sec cast
    tag: dodge
    prio: 1
    note: "291k Nature par impact, un toutes les 1,5 sec pendant 3 sec. Dégâts au sol — toute l'incantation s'évite en bougeant."
```

Remplacez `tag: todo` au lieu d'ajouter une deuxième ligne `tag:`. Ne touchez pas aux lignes
`# auto` autour.

`prio: 1` est une promotion : le sort devient une pastille dans l'onglet Résumé du donjon, qui
est une liste courte et cesse d'être utile dès que tout y figure. Deux ou trois par mob au
maximum. Le Résumé ne liste que les mobs évalués `medium` ou au-dessus (et les minibosses) : une
`prio: 1` sur un mob non évalué n'apparaît donc que sur sa fiche — évaluez le mob et elle
apparaîtra.

### Évaluer la menace d'un mob

`threat` ne répond pas à « le chiffre est-il gros », mais à « ce mob change-t-il le pull ».
L'échelle, les trois règles qui en découlent et deux exemples travaillés vivent dans
[`.claude/skills/codex-content/SKILL.md`](.claude/skills/codex-content/SKILL.md#the-threat-scale)
— **lisez-le avant d'évaluer.** Il dit aussi quand laisser le champ vide plutôt que de le
remplir, et quels mobs ne portent pas de `threat` du tout.

Cette page est le seul endroit où ces réponses vivent, et c'est pourquoi celle-ci ne les répète
pas : une règle écrite deux fois est une règle qui finira par se contredire.

### Écrire la prose

Tout ce qui suit le `---` de fermeture. Markdown complet. C'est là qu'un mob cesse d'être une
liste de capacités : lequel de ses sorts décide vraiment du pull, ce que le pack fait ensemble,
ce qu'un groupe rate la première fois.

Écrivez-la pour quelqu'un qui a la fiche ouverte et s'apprête à lancer le pull. Mettez en gras
la phrase qui compte ; ne répétez pas les notes de sorts qui sont juste au-dessus.

### Ajouter une astuce

Une astuce, c'est ce qu'une fiche ne peut pas dire en une phrase : un placement, quinze secondes
de vidéo, ou une capture montrant où tombent les rayons. Elle s'affiche en bas de la fiche, dans
le codex comme dans la colonne des mobs de l'onglet Route.

Trois types. C'est la clé qui nomme le type, donc une entrée porte exactement un `text:`, un
`video:` ou un `image:` :

```yaml
tips:
  - text: "Interrompez la deuxième incantation, pas la première — la première est un leurre."
  - video: https://www.youtube.com/shorts/9D0gCU8Tp5Y
    label: "Naowh — le pull après le premier boss"
  - image: zuljan-beams.webp
    label: "Où tombent les rayons"
```

Les règles :

- **Mettez toujours un `label:` sur une vidéo et sur une image.** Sans lui, le bouton n'affiche
  que « Lire la vidéo » et l'image n'a aucune légende — rien ne dit au lecteur ce qu'il s'apprête
  à ouvrir. Une astuce en texte n'en a pas besoin : la phrase est l'astuce.
- **Créditez l'auteur dans le label.** Si la vidéo est le travail de quelqu'un d'autre, son nom
  passe devant la description, comme ci-dessus.
- **Les URL de vidéo acceptées** sont les quatre formes qu'on a réellement dans son
  presse-papiers : `youtube.com/watch?v=…`, `youtu.be/…`, `youtube.com/shorts/…` et
  `youtube.com/embed/…`, avec un `?t=90` (ou `t=90s`) facultatif pour démarrer en cours de route.
  Tout le reste est rejeté et l'astuce disparaît. Collez le lien, pas du HTML d'intégration.
- **Une image est un nom de fichier nu**, versionné sous `public/tips/<slug-du-donjon>/`. Pas de
  chemin, pas d'URL vers un autre site — une valeur contenant `/` est rejetée. Le `.webp` est
  préféré ; `.png`, `.jpg`, `.jpeg` et `.gif` marchent aussi, `.svg` non. Nommez le fichier
  d'après ce qu'il montre, pas d'après votre outil de capture.
- **Rien n'est chargé depuis YouTube tant qu'un lecteur n'a pas cliqué.** La fiche dessine son
  propre bouton ; le clic est le consentement, et c'est aussi le moment où quelqu'un veut
  vraiment la vidéo.

Une astuce malformée est ignorée avec un avertissement dans la console du navigateur, et le reste
de la fiche s'affiche quand même — donc si votre astuce n'apparaît pas, ouvrez la console. Un
fichier image manquant, lui, est attrapé par les tests et non par la production : `npm test`
échoue si un `image:` nomme un fichier qui n'est pas là.

### Dire de quel pull parle une astuce

Une astuce sans `packs:` parle du mob, où qu'on le croise, et la carte marque chacun de ses points.
La plupart des astuces sont comme ça. Mais une astuce qui parle d'*un pull* — où se placer, avec
quoi l'enchaîner, dans quel coin le combattre — devrait le dire :

```yaml
tips:
  - text: "Tirez-le dans le couloir — le frontal n'a nulle part où atteindre le soigneur."
    packs: [44]
```

`packs:` prend les numéros que l'infobulle de la carte affiche au survol d'un mob. Nommez-en
plusieurs quand le pull prend plusieurs groupes à la fois : `packs: [44, 45]`. La carte pose alors
le `?` **sur ces pulls** et non sur un mob : le conseil porte sur la façon de prendre ce groupe, et
la fiche qui le porte n'est que l'endroit où la phrase est écrite. La fiche dit de quel pull il
s'agit, pour que celui qui a suivi la marque sache ce qu'il a trouvé.

Le Rejeteur de spores est la raison d'être de cette clé : il se tient dans onze packs, et une vidéo
sur le pull d'après le premier boss posait un `?` sur ses onze points.

**Un `.fr.md` qui reprend `tips:` doit reprendre `packs:` aussi.** La liste traduite remplace la
liste de base en entier : un `packs:` oublié, et les lecteurs francophones voient le badge sur tous
les points du mob là où les anglophones le voient sur le pull. Un test le vérifie, en même temps que
l'existence du pack dans ce donjon et la présence du mob dedans.

### Traduire une fiche en français

Une traduction est un fichier voisin : `254850-sporeblight-belcher.md` reçoit
`254850-sporeblight-belcher.fr.md` à côté de lui. Il ne porte **que du texte**, et il est fusionné
par-dessus la fiche de base champ par champ — tout ce que vous omettez garde l'anglais.

Ce qui a sa place dans un `.fr.md` : `npcId` (pour rattacher le fichier), la `note` d'un sort
repérée par son `id`, `trap`, la prose — et `tips`, avec la réserve ci-dessous. Ce qui n'y a pas
sa place : `threat`, `role`, `tag`, `prio`, `rank`. Ce sont des jugements, pas de la langue ; les
dupliquer dans deux fichiers ne ferait que les laisser diverger.

```yaml
---
npcId: 245346

spells:
  - id: 1237855
    note: "533k Physique sur le tank, et ça laisse de la Terre fissurée en dessous."

trap: "Chaque tank buster laisse une flaque ralentissante là où se tenait le tank."
---
```

**Les astuces se traduisent en bloc, ou pas du tout.** Un `.fr.md` qui nomme `tips:` remplace
entièrement la liste de base — il n'y a pas de fusion astuce par astuce, donc une liste partielle
supprime silencieusement les astuces que vous n'avez pas reprises. Ne pas mettre `tips:` du tout
est le cas normal et parfaitement acceptable : le lecteur voit la liste de base avec une petite
marque `EN` sur la section, qui dit franchement dans quelle langue on le sert. C'est aussi ce qui
rend une traduction à moitié faite honnête plutôt que cassée.

Vous pouvez traduire une seule phrase et vous arrêter là. Le retour à la langue de base se fait
champ par champ.

### Un mob n'a pas encore de fiche

Les fiches ne s'écrivent pas de zéro — le scaffold les génère à partir des données extraites, avec
l'identifiant, le nom, les forces et toute la liste des sorts déjà remplis :

```bash
npm run scaffold
```

Il **n'écrase jamais un fichier existant** ; il ne fait qu'ajouter ceux qui manquent. Il ne
demande aucune installation de WoW, puisqu'il lit les données versionnées sous
`src/data/generated/`. Versionnez le nouveau fichier avec ce que vous y avez écrit.

Si vous travaillez dans le navigateur et ne pouvez pas le lancer, dites-le dans une issue et
quelqu'un générera la fiche. N'écrivez pas le frontmatter à la main : un `npcId` ou un
identifiant de sort inventé ne rattache la fiche à rien du tout.

### Le nom d'un sort est faux

Vous ne pouvez pas le corriger dans `content/`. Les noms, icônes, descriptions et temps
d'incantation des sorts viennent de Wowhead ; les noms des mobs, les forces et les CC applicables
viennent de MDT. Les deux sont réécrits en bloc par `npm run data` : une correction à la main
survit donc exactement jusqu'à la prochaine extraction — et, entre-temps, elle met la fiche en
désaccord avec le jeu.

[Ouvrez une issue](https://github.com/Dudesons/keystone-codex/issues) en nommant le donjon, le
mob et ce qui est faux. Le correctif est soit une nouvelle extraction, soit une modification des
scripts, et les deux sont la pull request de quelqu'un d'autre.

## Avant d'ouvrir une pull request

- **Une fiche par pull request** quand c'est possible. C'est plus facile à relire, plus facile à
  discuter, et un désaccord sur une phrase ne bloque pas quatre autres mobs.
- **Lancez les vérifications** si vous avez le dépôt en local : `npm test` et `npm run typecheck`.
  Si vous travaillez dans le navigateur, ouvrez la pull request et laissez la CI le dire — elle
  lance les deux mêmes commandes, plus un build et la suite end-to-end.
- **La CI ne peut pas vérifier si ce que vous avez écrit est vrai.** Elle vérifie les types,
  lance les tests et construit le site : elle attrape un `image:` qui nomme un fichier absent,
  et tout ce que votre modification aurait cassé ailleurs. Elle n'a jamais joué le donjon. Une
  affirmation que les données ne soutiennent pas passe toutes les vérifications et reste fausse
  — c'est pour cela que la section suivante existe.

## Règles de la maison

- **Écrivez ce que les données contiennent, et rien de plus.** C'est la règle la plus facile à
  enfreindre sans s'en rendre compte, et elle a plus de cas particuliers qu'une puce ne peut en
  porter : une infobulle qui ne donne aucun rayon, un chiffre non mis à l'échelle, deux sources
  qui se contredisent, quelque chose que vous ne savez que pour l'avoir joué. Tous ces cas sont
  traités dans
  [`.claude/skills/codex-content/SKILL.md`](.claude/skills/codex-content/SKILL.md#what-may-be-written-at-all).
  Lisez-le avant d'écrire une phrase que la fiche ne peut pas sourcer.
- **Ne recopiez pas le guide de quelqu'un d'autre.** Un écrit de route, un script de vidéo, une
  page de wiki : mettez-le en lien comme astuce, avec son nom dans le label. Recopier du texte
  dans ce dépôt est à la fois un problème de licence et un problème de maintenance — leur guide
  sera mis à jour, notre copie non.
- **Jamais de HTML brut.** `note:`, `trap:` et une astuce de type texte sont rendus comme du
  markdown en ligne, et une balise écrite dans l’un de ces champs est **échappée** : `<b>gras</b>`
  arrive au lecteur sous la forme de ces caractères exacts, visibles sur la fiche. Le markdown
  suffit à ce qu’une fiche demande — emphase et liens — écrivez donc cela. Cet échappement est
  une règle de sécurité avant d’être une règle de style : sans lui, une balise `<script>` dans
  l’un de ces champs s’exécuterait dans le navigateur de chaque personne qui lit la fiche.
- **Un lien pointe vers `http`, `https` ou `mailto`, ou vers rien.** Un lien portant un autre
  schéma garde son texte et perd son lien, pour la même raison : `[cliquez](javascript:…)` est du
  markdown valide qui se lit comme un lien ordinaire dans un diff. Les chemins relatifs et les
  liens internes en `#/d/…` ne sont pas concernés.

## Où poser une question

[Ouvrez une issue](https://github.com/Dudesons/keystone-codex/issues). Une question sur un mob
est une aussi bonne raison qu'un bug : si une fiche est assez floue pour qu'on pose la question,
elle l'est assez pour être corrigée.

La référence sur l'application elle-même — comment lire la carte, les routes, comment les données
sont régénérées — est dans [README.md](README.md).
