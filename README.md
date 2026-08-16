# Keystone Codex

Codex et carte interactive pour les donjons Mythique+ de World of Warcraft, actuellement
calibré sur le pool de la **saison 2 de Midnight**. Chaque donjon a sa carte MDT avec les vrais
packs cliquables, une fiche par mob, et un éditeur de route capable d'importer et d'exporter
des strings MDT — à plusieurs si besoin.

Rien dans le code n'est lié à une extension : changer de saison ne demande que d'éditer
`SEASON_DUNGEONS` dans `scripts/config.mjs` puis de relancer `npm run data`.

## Démarrer

```bash
npm install
npm run dev
```

## Éditer le codex

**Tout ce qui se rédige est dans `content/`, un fichier markdown par mob.** Le reste (noms,
forces, CC applicables, sorts, positions) est extrait de MDT et ne se touche pas à la main.

```markdown
---
npcId: 270306
threat: high              # low | medium | high | lethal
role: melee               # caster | melee | patrol | miniboss
spells:
  - id: 1306911
    tag: tank             # kick | dodge | dispel | tank | soak | ignore
    prio: 1
    note: "581k physique sur la cible actuelle."
trap: "Immunisé à tous les CC : il faut le burst."
---

Prose libre : positionnement, ordre de focus, cooldowns.
```

`threat` et `tag` pilotent le rendu (couleurs, tri des sorts par priorité de kick). Un sort sans
`note` retombe sur sa description Wowhead, et un mob sans fichier reste affiché avec ses seules
données MDT — le codex se remplit progressivement sans jamais casser l'app.

Le serveur de dev recharge à chaud : enregistrer un `.md` met la fiche à jour immédiatement.

`content/<donjon>/_dungeon.md` porte le chrono, le résumé et le plan de route du donjon.

## Régénérer les données après une mise à jour de MDT

```bash
npm run data
```

Enchaîne les quatre scripts, qui lisent l'installation WoW et écrivent des fichiers versionnés —
**l'app ne lit jamais `D:\jeux` à l'exécution**, c'est ce qui la rend partageable.

| Script | Rôle |
| --- | --- |
| `npm run extract` | `Midnight/*.lua` → `src/data/generated/*.json` (mobs, clones, packs, forces) |
| `npm run build:maps` | 150 tuiles PNG → une image WebP 1920×1280 par donjon |
| `npm run fetch:assets` | IDs de sorts → noms, icônes, descriptions (Wowhead) ; portraits de mobs |
| `npm run scaffold` | crée les fiches `.md` manquantes — **n'écrase jamais un fichier existant** |

Si WoW est installé ailleurs : `MDT_PATH="D:\autre\chemin\MythicDungeonTools" npm run extract`.
Pour changer de pool de donjons (nouvelle saison), édite `SEASON_DUNGEONS` dans
`scripts/config.mjs` — tout le reste (index MDT, totaux de forces, mapID) est lu dans les
fichiers du jeu.

## Lecture de la carte

Chaque unité est un portrait circulaire, comme dans MDT. L'information se lit à trois niveaux :

- **L'anneau** donne le niveau de menace (`threat` dans la fiche) : rouge létal, orange
  dangereux, or à surveiller, vert sans danger, doré pour un boss, gris quand ce n'est pas
  encore renseigné.
- **Les pastilles** au-dessus du portrait signalent `K` un sort à interrompre, `T` un tank
  buster, `D` un sort dissipable.
- **Les enveloppes** entourent les packs en mode Codex, et les pulls (avec leur numéro) en
  mode Route.

`K` et `D` sont **dérivés de MDT** — 75 sorts interruptibles et 108 types de dispel sont déjà
renseignés sans que tu écrives quoi que ce soit. `T` et le niveau de menace viennent des
fiches : leur absence signifie « pas encore jugé », pas « inoffensif ». Le bouton *Légende* sur
la carte rappelle tout ça.

Survoler un mob dans le codex l'éclaire sur la carte et estompe les autres ; cliquer une unité
sur la carte ouvre son pack et fait défiler le panneau jusqu'à sa fiche.

## Routes

L'onglet **Route** d'un donjon permet de :

- coller une string MDT pour l'importer (formats `!~MDT2~` actuel et legacy `!`) ;
- cliquer un pack sur la carte pour l'ajouter au pull courant (Ctrl+clic ne vise qu'un mob,
  recliquer retire) ;
- réordonner et colorer les pulls, en suivant les forces cumulées ;
- déplier le **briefing** d'un pull : ses mobs, ce qu'il faut y couper, et leurs pièges ;
- copier une string MDT réimportable en jeu.

Quand une route existe, les fiches du codex portent une pastille du numéro de pull, et survoler
un pull éclaire ses mobs sur la carte.

La route en cours est sauvegardée dans le `localStorage`, encodée en string MDT — ce format
porte déjà tout, y compris les dessins et notes d'une route importée qu'on ne sait pas éditer
et qu'on restitue intacts au ré-export.

### Éditer à plusieurs

La route est portée par un document [Y.js](https://docs.yjs.dev/) **en permanence**, même hors
session : il n'y a donc qu'un seul chemin de code, et ouvrir une session ne fait qu'y attacher
un provider réseau. Les modifications passent par des opérations d'intention (« ajoute ce pack
au pull 3 ») plutôt que par un remplacement global, ce qui permet à deux personnes d'éditer des
pulls différents sans s'écraser.

*Ouvrir une session* génère un code à six caractères à dicter sur Discord ; *Rejoindre* remplace
la route locale par celle du salon. La liaison est pair-à-pair via WebRTC, donc l'hébergement
reste statique.

Seule la mise en relation initiale passe par un serveur de signalisation public
(`wss://y-webrtc-eu.fly.dev`). C'est le point faible du montage : s'il est indisponible, les
pairs ne se trouvent pas. Il se change sans toucher au code :

```bash
VITE_SIGNALING_URL=wss://mon-serveur npm run build
```

## Tests

```bash
npm test
```

Le codec CBOR est validé contre les vecteurs de l'annexe A de la RFC 8949, et contre une route
réellement exportée du jeu : le CBOR ré-encodé est identique octet à octet à celui produit par
MDT. Voir `src/lib/mdt/__fixtures__/README.md` pour renouveler cette fixture si un patch change
le format.

Trois particularités du sérialiseur du jeu, découvertes via cette fixture et documentées dans
le code : les chaînes partent en CBOR major 2 (Lua n'a que des chaînes d'octets), la
compression est du deflate **brut**, et une table vide devient un tableau vide (`0x80`).

## Déployer

```bash
npm run build
```

Produit un `dist/` statique d'environ 6 Mo, servable tel quel (GitHub Pages, n'importe quel
hébergeur). Le routage est en hash, donc aucune configuration serveur n'est nécessaire.

## Sources

Données de mobs, cartes et positions extraites de
[Mythic Dungeon Tools](https://github.com/Nnoggie/MythicDungeonTools). Noms, icônes et
descriptions de sorts via Wowhead.
