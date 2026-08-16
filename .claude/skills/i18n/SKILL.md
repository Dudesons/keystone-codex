---
name: i18n
description: Comment keystone-codex parle deux langues — dictionnaires typés, détection de la langue, contenu de content/ suffixé par locale, et libellés de sorts localisés depuis Wowhead. À lire avant de toucher à src/lib/i18n/, d'ajouter une chaîne d'UI, de traduire une fiche de content/, ou d'ajouter une langue.
---

# Internationalisation

L'app parle anglais par défaut et français quand le navigateur le demande. Trois systèmes
distincts s'en partagent la charge, et **on ne les confond pas** :

| | Chrome de l'UI | Contenu rédigé | Termes de jeu |
| --- | --- | --- | --- |
| Quoi | Boutons, titres, légendes, messages | Menaces, pièges, notes de sorts, prose | Noms de mobs, noms et descriptions de sorts |
| Où | `src/lib/i18n/en.ts` et `fr.ts` | `content/<donjon>/*.md` et `*.fr.md` | `src/data/generated/` |
| Qui l'écrit | Toi, à la main | RwlRwlRwlRwl, à la main | **Le pipeline** — MDT et Wowhead |
| Quand | À la compilation | À la compilation (Vite glob) | `npm run fetch:assets` |

**La règle qui compte : aucun terme de jeu ne se traduit à la main.** Écrire `'Démembrer'`
dans `fr.ts` est un bug, pas une traduction — ce nom vient de Wowhead et se met à jour tout
seul au patch suivant.

---

## 1. Le chrome de l'UI (`src/lib/i18n/`)

| Fichier | Rôle |
| --- | --- |
| [locales.ts](../../../src/lib/i18n/locales.ts) | `LOCALES`, `Locale`, `DEFAULT_LOCALE`, `isLocale` |
| [en.ts](../../../src/lib/i18n/en.ts) | Dictionnaire de référence |
| [fr.ts](../../../src/lib/i18n/fr.ts) | Traduction, typée contre l'anglais |
| [detect.ts](../../../src/lib/i18n/detect.ts) | `resolveLocale` — fonction pure |
| [format.ts](../../../src/lib/i18n/format.ts) | `translate`, `pluralize`, `formatNumber`, `formatPercent` |
| [context.tsx](../../../src/lib/i18n/context.tsx) | `LocaleProvider`, `useI18n` |

### La complétude est un invariant de compilation, pas un test

`fr.ts` est déclaré `Dictionary`, c'est-à-dire `Record<keyof typeof en, string>`. Une clé
manquante **ou en trop** fait échouer `tsc -b`. C'est la raison pour laquelle il n'y a pas de
dépendance i18n externe ici : une librairie ne détecte ça qu'à l'exécution.

**N'écris pas de test qui compare les jeux de clés** : il dupliquerait le compilateur.

### Ajouter une chaîne

1. Une entrée dans `en.ts`, une dans `fr.ts`. Clés en `domaine.chose`.
2. Dans le composant : `const { t } = useI18n()` puis `t('domaine.chose')`.
3. Paramètres : `t('mob.pull', { n: 3 })` remplace les `{n}`. Un placeholder inconnu est
   laissé visible plutôt que vidé — un `{oops}` à l'écran désigne le coupable.

### Pluriels : `key.one` et `key.other`

`plural('common.units', n)` choisit via `Intl.PluralRules`. Ce n'est pas de la
sur-ingénierie pour deux langues : **l'anglais et le français divergent à zéro** (« 0 units »
contre « 0 unité »). `n` est disponible comme placeholder sans qu'on le passe.

Le type `PluralKey` n'accepte que les bases qui ont *à la fois* `.one` et `.other`.

### Nombres et pourcentages

Passe par `formatPercent` / `formatNumber` du contexte, jamais par `toFixed()` : le français
écrit `82,5 %`, pas `82.5%`. `formatPercent` prend une valeur **de 0 à 100**, comme
`routeStats` la produit.

### Ce qui n'est pas du chrome et ne se traduit pas

- **`DEFAULT_ROUTE_NAME`** dans [useRouteDoc.ts](../../../src/lib/mdt/useRouteDoc.ts) —
  `'New route'`. C'est de la **donnée** : sérialisée dans la string MDT, persistée en
  `localStorage`, répliquée aux pairs Y.js. La traduire ferait voir deux noms différents à
  deux coéquipiers.
- **Les erreurs de diagnostic du codec** (`'CBOR: truncated string'`) restent en anglais dans
  le code et remontent telles quelles. Qui en voit une ouvre un ticket, il n'ajuste pas son
  copier-coller.
- **Les quatre erreurs adressées à l'utilisateur** sont l'exception : elles passent par
  [`MdtUserError`](../../../src/lib/mdt/errors.ts), qui porte un `code` et des `params`, et
  `RoutePanel` les traduit via les clés `mdtError.*`. Les tests assertent le **code**, jamais
  la phrase.

---

## 2. Le contenu rédigé (`content/`)

### Suffixe, pas dossier

`134251-seneschal-mbara.md` porte la langue de base ; `134251-seneschal-mbara.fr.md` la
traduction. Les deux dans le **même dossier**, ce qui rend visible d'un coup d'œil ce qui est
traduit — un arbre `content/fr/` parallèle demanderait un diff, et la traduction sera
toujours partielle ici. Ça laisse aussi
[scaffold-content.mjs](../../../scripts/scaffold-content.mjs) intact : un stub par mob.

Le découpage du chemin teste le suffixe contre `LOCALES`, **pas** contre « deux lettres
quelconques » : un slug de mob peut légitimement finir par un segment de deux lettres.

### Fusion champ par champ, pas remplacement

Une traduction se superpose à la base ; les `spells` fusionnent par `id`. Concrètement :

```yaml
# 270306-ritual-chieftain.md — la base porte les jugements
threat: high
role: melee
spells:
  - id: 1306911
    tag: tank
    prio: 1
    note: "581k physical on the current target."

# 270306-ritual-chieftain.fr.md — la traduction ne porte que du texte
spells:
  - id: 1306911
    note: "581k physique sur la cible actuelle."
```

**`threat`, `role`, `tag` et `prio` ne se répètent pas dans la traduction.** Ce sont des
jugements, pas de la langue : les dupliquer serait la garantie qu'ils divergent un jour. Un
champ absent de la traduction retombe sur la base ; une fiche sans `.fr.md` du tout s'affiche
en base, ce qui préserve l'invariant « un mob sans fiche reste affiché ».

[270306-ritual-chieftain](../../../content/altar-of-fangs/270306-ritual-chieftain.md) et son
`.fr.md` sont la paire de référence, et servent de fixture aux tests de
[content.test.ts](../../../src/lib/content.test.ts).

### La locale se propage en paramètre

`getMobContent`, `getDungeonContent`, `contentProgress`, `getIndicators` et `kickList`
prennent tous une `locale` et **l'incluent dans leur clé de cache**. Ce n'est pas cosmétique :
`hasTrap` se calcule depuis le contenu fusionné, donc un piège rédigé dans une seule langue
change réellement les pastilles.

Paramètre explicite plutôt qu'une « locale courante » de module : une variable mutable
rendrait les caches non déterministes et les tests dépendants de l'ordre d'exécution.

`contentProgress` compte ce que le lecteur **voit**, retombée comprise — la barre mesure la
lisibilité, pas l'avancement de la traduction.

---

## 3. Les libellés de sorts (`scripts/fetch-assets.mjs`)

### Le mapping de locale Wowhead est vérifié, pas documenté

```js
// scripts/config.mjs
export const SPELL_LOCALES = [
  { lang: 'en', wowhead: 0 },
  { lang: 'fr', wowhead: 2 },
]
```

`0` → anglais et `2` → français ont été établis **par sonde** sur
`nether.wowhead.com/tooltip/spell/<id>?dataEnv=1&locale=<n>`, pas lus dans une doc. Wowhead
ne publie pas cette table.

**Sonde avant d'ajouter une langue. Ne la devine pas.** Une sonde, c'est un `curl` et un coup
d'œil au champ `name`.

### `parseTooltip` classe par position, pas par regex multilingue

Le tooltip rend `nom / [portée] / [incantation]`. Les motifs qui reconnaissent ces lignes
(`/range$/i`, `/cast$/i`) ne matchent **que l'anglais** : le français rend « Portée
illimitée » et « 3 s d'incantation ».

Plutôt que d'entretenir un jeu de regex par langue, `classifyLines()` classe **une fois** sur
la langue de base, et les autres locales appliquent le même mapping **par index**. Wowhead
rend les mêmes lignes dans le même ordre quelle que soit la langue — vérifié sur les 875
sorts du pool, zéro écart.

Si les nombres de lignes diffèrent, le script **ne devine pas** : il garde nom et description,
laisse `castTime`/`range` vides et émet un avertissement. L'app tolère déjà leur absence.

### Forme de `spells.json`

`id` et `icon` ne dépendent pas de la langue et restent en tête ; le reste va dans `text` :

```json
"1306911": {
  "id": 1306911,
  "icon": "ability_criticalstrike",
  "text": {
    "en": { "name": "Dismember", "range": "Unlimited range", "castTime": "3 sec cast", "description": "…" },
    "fr": { "name": "Démembrer", "range": "Portée illimitée", "castTime": "3 s d'incantation", "description": "…" }
  }
}
```

`getSpell(id, locale)` retombe sur `DEFAULT_LOCALE` si la locale manque : Wowhead ne traduit
pas tout, et un sort récent sort en anglais d'abord. Ce n'est pas une erreur, c'est le
chemin normal.

**Ajouter une langue à `SPELL_LOCALES` demande un `FORCE=1 npm run fetch:assets`** : le cache
ne considère à refaire que les entrées sans bloc `text`, il ne sait pas qu'une locale
secondaire manque.

### Liens Wowhead

`wowheadUrl(spellId, locale)` dans [data.ts](../../../src/lib/data.ts). L'anglais est servi à
la **racine** du domaine et ne prend pas de préfixe, les autres langues si — d'où le cas
particulier plutôt qu'une interpolation uniforme.

---

## 4. Tester

Un composant qui affiche du texte lit le contexte : un `render()` nu lève. Passe par
[src/test/render.tsx](../../../src/test/render.tsx) — `renderEn` / `renderFr` — ce qui force
chaque test à dire dans quelle langue il assertionne. Un `wrapper` fourni par l'appelant
(un routeur) est **imbriqué** dans le provider, pas écrasé.

`resolveLocale` et les fonctions de `format.ts` sont pures : teste-les directement, sans DOM.

## Checklist avant de committer

1. `npm run typecheck` — c'est lui qui prouve que `fr.ts` couvre exactement `en.ts`.
2. `npm test`.
3. Ouvrir l'app **dans les deux langues** : le sélecteur est dans l'en-tête de l'accueil et
   de la page de donjon. Vérifier qu'il ne reste pas de chaîne en dur.
4. Si `SPELL_LOCALES` ou `fetch-assets.mjs` a changé : relancer `npm run fetch:assets` et
   **committer `spells.json`** — la CI ne lance aucun script d'extraction.
