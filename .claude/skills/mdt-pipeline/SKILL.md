---
name: mdt-pipeline
description: Comment keystone-codex lit Mythic Dungeon Tools — extraction des .lua vers du JSON versionné, et codec des strings de partage (CBOR + deflate brut). À lire avant de toucher à src/lib/mdt/, scripts/, src/data/generated/ ou à la fixture d'export réel.
---

# Pipeline MDT

Deux ponts distincts existent entre keystone-codex et Mythic Dungeon Tools. Ne les confonds
pas : ils n'ont ni le même moment d'exécution, ni les mêmes contraintes.

| | Extraction | Codec de string |
| --- | --- | --- |
| Quand | Hors ligne, à la main (`npm run data`) | À l'exécution, dans le navigateur |
| Entrée | `MythicDungeonTools/<Extension>/*.lua` | String `!~MDT2~…` collée par l'utilisateur |
| Sortie | `src/data/generated/*.json`, `public/maps/` | Table Lua en mémoire, puis route |
| Code | `scripts/*.mjs` | `src/lib/mdt/` |
| Contrainte dure | L'app ne lit **jamais** l'installation WoW à l'exécution | Fidélité **octet à octet** avec le sérialiseur du jeu |

---

## 1. Extraction (`scripts/`, `npm run data`)

`npm run data` enchaîne quatre scripts, dans cet ordre et pour une raison :

| Script | Entrée → sortie |
| --- | --- |
| `extract` — [extract-mdt.mjs](../../../scripts/extract-mdt.mjs) | `Midnight/*.lua` → `src/data/generated/*.json` (mobs, clones, packs, forces, sorts) |
| `build:maps` — [build-maps.mjs](../../../scripts/build-maps.mjs) | 150 tuiles PNG (15×10 de 128 px) → une WebP 1920×1280 par donjon |
| `fetch:assets` — [fetch-assets.mjs](../../../scripts/fetch-assets.mjs) | IDs de sorts issus de l'extraction → noms, icônes, descriptions (Wowhead) ; portraits |
| `scaffold` — [scaffold-content.mjs](../../../scripts/scaffold-content.mjs) | liste des mobs → fiches `content/<donjon>/*.md` manquantes |

`fetch:assets` et `scaffold` consomment ce que `extract` a produit : les relancer seuls après
avoir modifié l'extraction est légitime, l'inverse ne l'est pas.

### Configuration : [scripts/config.mjs](../../../scripts/config.mjs)

C'est le **seul** fichier à éditer pour changer de saison ou de machine.

- `MDT_PATH` — racine de l'addon, surchargeable par variable d'environnement. Défaut :
  `D:\jeux\World of Warcraft\_retail_\Interface\AddOns\MythicDungeonTools`.
- `MDT_EXPANSION` — sous-dossier de l'extension. Défaut : `Midnight`.
- `SEASON_DUNGEONS` — les noms de fichiers `.lua` du pool courant. **Tout le reste** (index de
  donjon, total de forces, `mapID`) est lu dans ces fichiers ; rien d'autre n'est codé en dur.
- `MDT_GEOMETRY` — l'espace de coordonnées de MDT (840×560, `MainFrame.lua`) et la géométrie
  des tuiles. Si une carte s'affiche décalée, c'est ici, pas dans le composant React.

### Le piège des index sparses

**Les index de mobs et de clones de MDT sont troués et doivent le rester.** Supprimer un mob
dans MDT laisse un trou (`clones = { [8] = …, [13] = … }`), et ces index sont exactement ce
que les routes référencent. Les renuméroter casserait silencieusement toutes les routes
existantes, importées comme sauvegardées.

`intEntries()` dans `extract-mdt.mjs` trie sans jamais recompacter. Si tu ajoutes un traitement
qui itère sur les mobs, itère sur les clés, pas sur une position dans un tableau.

### Écrire du code d'extraction

Le parseur Lua maison est [lua-table.mjs](../../../scripts/lua-table.mjs) : `parseAssignment`
puis `toPlain`. Les valeurs venues de `L["X"]` arrivent enveloppées dans un `LuaExpr` qui porte
son littéral — `unwrap()` les déplie. N'ajoute pas de dépendance à un parseur Lua tiers sans en
parler : le fichier existant est calibré sur ce que MDT écrit réellement.

`readDungeonSource()` lève une erreur explicite si le `.lua` est introuvable, avec le chemin
complet et un rappel des variables d'environnement. Garde ce niveau de diagnostic : ce script
tourne sur la machine de quelqu'un qui n'a pas le code sous les yeux.

---

## 2. Codec des strings (`src/lib/mdt/`)

### Deux formats en lecture, un seul en écriture

[string.ts](../../../src/lib/mdt/string.ts) lit les deux formats de `Transmission.lua` :

- **MDT2** (actuel) : `!~MDT2~` + Base64 standard + deflate + CBOR ;
- **legacy** : `!` + encodage 6 bits de LibDeflate + deflate + AceSerializer rev 1.

Le legacy est en lecture seule et le reste : beaucoup de routes publiées sur Wago sont encore
à ce format. On écrit **toujours** en MDT2, ce que le jeu produit aujourd'hui.

### Les trois particularités du sérialiseur du jeu

Découvertes via un export réel, corrigées, et à ne surtout pas « simplifier » :

1. **Chaînes en CBOR major 2, pas major 3.** Lua n'a que des chaînes d'octets, donc
   `C_EncodingUtil.SerializeCBOR` émet des *byte strings*. Un décodeur qui suppose major 3
   rend un `Uint8Array` là où une clé de table est attendue.
2. **Deflate brut**, sans en-tête zlib — `Enum.CompressionMethod.Deflate` n'en pose pas.
   `inflateAuto()` tente le brut d'abord et retombe sur zlib, et `DecodedMdt.deflate` mémorise
   la variante observée pour ré-encoder à l'identique.
3. **Une table vide part en tableau vide (`0x80`)**, pas en map vide (`0xa0`).

### La règle tableau/map de [cbor.ts](../../../src/lib/mdt/cbor.ts)

Une table Lua est une `Map` dont les clés entières restent **1-based**, comme en Lua. Un
tableau CBOR se décode en `Map {1:…, 2:…}` et se ré-encode en tableau **si et seulement si**
ses clés sont `1..n` contiguës. C'est l'inverse exact, et c'est ce qui rend le round-trip
stable. Le CBOR est réimplémenté à la main plutôt que pris sur étagère précisément pour
garder ce contrôle — ne remplace pas ce module par une librairie.

### Ne jamais perdre ce qu'on ne sait pas éditer

Un preset MDT porte des dessins, des notes, des offsets de faille, des assignations. On ne
sait éditer que `value.pulls`. [route.ts](../../../src/lib/mdt/route.ts) conserve donc la
table Lua d'origine dans `Route.source` et `routeToLua()` repart de cette table : ré-exporter
une route importée la rend au jeu intacte.

**Toute évolution du modèle de route doit préserver cette propriété.** Si tu ajoutes un champ,
écris-le dans la copie de la table source, ne reconstruis pas la table depuis zéro.

C'est aussi pour ça que le `localStorage` stocke la route **encodée en string MDT** plutôt
qu'en JSON maison : le format porte déjà tout.

---

## 3. Tests (`npm test`)

[codec.test.ts](../../../src/lib/mdt/codec.test.ts) valide sur deux axes :

- les vecteurs de l'**annexe A de la RFC 8949** — conformité CBOR ;
- une **route réellement exportée du jeu**, `__fixtures__/real-export.txt` — compatibilité
  in-game. C'est la seule chose qui prouve qu'une string produite ici sera acceptée par WoW.

Le test compare le **CBOR décompressé**, pas la string finale : deux compresseurs deflate
corrects produisent des flux différents pour la même entrée, et le jeu décompresse les deux.
L'invariant qui compte est que les octets sérialisés coïncident.

### Ne rends pas le test circulaire

Le nom de la route dans la fixture a été anonymisé **chirurgicalement** par
[patch-fixture-name.mjs](../../../scripts/patch-fixture-name.mjs) : seuls les octets du champ
`text` ont été réécrits, 958 des 982 octets d'origine sont ceux que le jeu a émis.

Décoder puis ré-encoder la fixture entière avec notre propre encodeur comparerait notre code à
lui-même et ne prouverait plus rien. Si tu dois retoucher la fixture, patche sur place.

Les tests de fixture sont **ignorés si le fichier est absent**, donc le dépôt reste testable
sans lui. Pour la renouveler après un patch du jeu : exporte une route depuis MDT, remplace le
contenu de `real-export.txt`, ré-anonymise. Voir
[__fixtures__/README.md](../../../src/lib/mdt/__fixtures__/README.md).

---

## Checklist avant de committer une modification du pipeline

1. `npm test` → verte, y compris les tests de fixture (vérifie qu'ils ne sont pas *skipped*).
2. `npm run typecheck`.
3. Si `src/data/generated/` ou `public/maps/` a changé : **committer le résultat**. La CI ne
   lance aucun script d'extraction — il n'y a pas de WoW sur le runner — donc le site en ligne
   ne bouge que si les fichiers générés sont versionnés.
4. Si le codec a changé : réimporter une route réelle en jeu avant de considérer que ça marche.
   Les tests prouvent la sérialisation, pas l'acceptation par le client.
