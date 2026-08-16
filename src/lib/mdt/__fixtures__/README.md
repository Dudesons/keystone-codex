# Fixture de compatibilité in-game

`real-export.txt` contient une string exportée depuis MDT en jeu. C'est la seule chose qui
prouve qu'une string produite ici sera acceptée par le jeu — les autres tests ne valident que
notre cohérence interne et la conformité à la RFC 8949.

Le test compare le **CBOR décompressé**, pas la string finale : deux compresseurs deflate
corrects produisent des flux différents pour la même entrée, et le jeu décompresse les deux.
L'invariant qui compte est que les octets sérialisés coïncident.

## Le nom de la route a été anonymisé

Seuls les octets du champ `text` ont été réécrits, par `scripts/patch-fixture-name.mjs` :
958 des 982 octets d'origine sont intacts, tels que le jeu les a émis.

Le patch est chirurgical exprès. Décoder puis ré-encoder la fixture entière avec notre propre
encodeur aurait rendu le test **circulaire** — il aurait comparé notre code à lui-même et
n'aurait plus rien prouvé sur la compatibilité in-game. En patchant sur place, le test continue
de vérifier que notre encodeur reproduit la mise en octets de MDT pour les maps, les tableaux,
les flottants, les entiers, les booléens et les index sparses.

## Ce que cette fixture a permis de corriger

Trois écarts que seul un export réel pouvait révéler, tous découverts et corrigés grâce à elle :

1. **Chaînes en major 2.** Lua n'a que des chaînes d'octets : `C_EncodingUtil.SerializeCBOR`
   émet du major 2 (byte string), jamais du major 3 (text string). Notre décodeur rendait
   donc un `Uint8Array` là où une clé de table était attendue.
2. **Deflate brut.** `Enum.CompressionMethod.Deflate` ne pose pas d'en-tête zlib.
3. **Table vide.** `{}` part en tableau vide (`0x80`), pas en map vide (`0xa0`). C'était la
   dernière divergence, sur 1 octet parmi 982.

## Renouveler la fixture

Si un patch change le format, exporte une nouvelle route depuis MDT et remplace le contenu de
`real-export.txt`. Les tests sont automatiquement ignorés si le fichier est absent, donc le
dépôt reste testable sans lui.
