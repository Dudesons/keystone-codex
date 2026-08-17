---
name: i18n
description: How keystone-codex speaks two languages — typed dictionaries, language detection, locale-suffixed content under content/, and spell labels localized from Wowhead. Read before touching src/lib/i18n/, adding a UI string, translating a content/ entry, or adding a language.
---

# Internationalization

The app speaks English by default, and French when the browser asks for it. Three separate
systems share the load, and **they must not be confused**:

| | UI chrome | Written content | Game terms |
| --- | --- | --- | --- |
| What | Buttons, headings, legends, messages | Threats, traps, spell notes, prose | Mob names, spell names and descriptions |
| Where | `src/lib/i18n/en.ts` and `fr.ts` | `content/<dungeon>/*.md` and `*.fr.md` | `src/data/generated/` |
| Who writes it | You, by hand | RwlRwlRwlRwl, by hand | **The pipeline** — MDT and Wowhead |
| When | At build time | At build time (Vite glob) | `npm run fetch:assets` |

**The rule that matters: no game term is ever translated by hand.** Writing `'Démembrer'` into
`fr.ts` is a bug, not a translation — that name comes from Wowhead and updates itself on the
next patch.

---

## 1. UI chrome (`src/lib/i18n/`)

| File | Role |
| --- | --- |
| [locales.ts](../../../src/lib/i18n/locales.ts) | `LOCALES`, `Locale`, `DEFAULT_LOCALE`, `isLocale` |
| [en.ts](../../../src/lib/i18n/en.ts) | The reference dictionary |
| [fr.ts](../../../src/lib/i18n/fr.ts) | The translation, typed against English |
| [detect.ts](../../../src/lib/i18n/detect.ts) | `resolveLocale` — a pure function |
| [format.ts](../../../src/lib/i18n/format.ts) | `translate`, `pluralize`, `formatNumber`, `formatPercent` |
| [context.tsx](../../../src/lib/i18n/context.tsx) | `LocaleProvider`, `useI18n` |

### Completeness is a compile-time invariant, not a test

`fr.ts` is declared as `Dictionary`, that is `Record<keyof typeof en, string>`. A missing key
**or an extra one** fails `tsc -b`. That is why there is no external i18n dependency here: a
library would only catch this at runtime.

**Do not write a test comparing the key sets** — it would duplicate the compiler.

### Adding a string

1. One entry in `en.ts`, one in `fr.ts`. Keys read `domain.thing`.
2. In the component: `const { t } = useI18n()`, then `t('domain.thing')`.
3. Parameters: `t('mob.pull', { n: 3 })` substitutes `{n}`. An unknown placeholder is left
   visible rather than blanked — a `{oops}` on screen names its own culprit.

### Plurals: `key.one` and `key.other`

`plural('common.units', n)` picks through `Intl.PluralRules`. This is not over-engineering for
two languages: **English and French diverge at zero** ("0 units" against "0 unité"). `n` is
available as a placeholder without passing it.

The `PluralKey` type only accepts bases that have *both* `.one` and `.other`.

### Numbers and percentages

Go through the context's `formatPercent` / `formatNumber`, never `toFixed()`: French writes
`82,5 %`, not `82.5%`. `formatPercent` takes a value **from 0 to 100**, as `routeStats`
produces it.

### What is not chrome and does not get translated

- **`DEFAULT_ROUTE_NAME`** in [useRouteDoc.ts](../../../src/lib/mdt/useRouteDoc.ts) —
  `'New route'`. It is **data**: serialized into the MDT string, persisted to `localStorage`,
  replicated to Y.js peers. Translating it would show two teammates two different names.
- **Codec diagnostics** (`'CBOR: truncated string'`) stay in English in the code and surface
  as-is. Whoever sees one is filing a ticket, not adjusting their paste.
- **The four user-facing errors** are the exception: they go through
  [`MdtUserError`](../../../src/lib/mdt/errors.ts), which carries a `code` and `params`, and
  `RoutePanel` translates them through the `mdtError.*` keys. Tests assert the **code**, never
  the sentence.

---

## 2. Written content (`content/`)

### Suffix, not folder

`134251-seneschal-mbara.md` carries the base language; `134251-seneschal-mbara.fr.md` carries
the translation. Both in the **same folder**, which makes it visible at a glance what is
translated — a parallel `content/fr/` tree would need a diff, and translation here will always
be partial. It also leaves [scaffold-content.mjs](../../../scripts/scaffold-content.mjs)
untouched: one stub per mob.

Path splitting tests the suffix against `LOCALES`, **not** against "any two letters": a mob
slug can legitimately end in a two-letter segment.

### Field-by-field merge, not replacement

A translation layers over the base; `spells` merge by `id`. Concretely:

```yaml
# 270306-ritual-chieftain.md — the base carries the judgements
threat: high
role: melee
spells:
  - id: 1306911
    tag: tank
    prio: 1
    note: "581k physical on the current target."

# 270306-ritual-chieftain.fr.md — the translation carries text only
spells:
  - id: 1306911
    note: "581k physique sur la cible actuelle."
```

**`threat`, `role`, `tag` and `prio` are not repeated in the translation.** They are
judgements, not language: duplicating them guarantees they drift apart eventually. A field
absent from the translation falls back to the base; an entry with no `.fr.md` at all renders
from the base, which preserves the "a mob with no entry still renders" invariant.

[270306-ritual-chieftain](../../../content/altar-of-fangs/270306-ritual-chieftain.md) and its
`.fr.md` are the reference pair, and serve as the fixture for
[content.test.ts](../../../src/lib/content.test.ts).

### A closed frontmatter vocabulary gets keys; free text does not

`threat` and `role` are both written by hand in the frontmatter, and both come from a fixed
list the scaffold template prints. They are **not** game terms, so they are translated —
`threat.*` and `role.*` keys, resolved at render time. `trap`, `note` and the prose are free
text and live in the `.fr.md` instead.

The trap to avoid: rendering a frontmatter value straight into the page. `role` stays typed
as free text, because the file is hand-written and a typo must render as itself rather than
as a raw `role.healer` on screen. `isRole()` is the guard that decides:

```tsx
{isRole(content.role) ? t(`role.${content.role}`) : content.role}
```

Add a value to `ROLES` and `tsc` will demand the matching key in both dictionaries.

### The locale travels as a parameter

`getMobContent`, `getDungeonContent`, `contentProgress`, `getIndicators` and `kickList` all
take a `locale` and **include it in their cache key**. That is not cosmetic: `hasTrap` is
computed from the merged content, so a trap written in only one language genuinely changes the
badges.

An explicit parameter rather than a module-level "current locale": a mutable variable would
make the caches non-deterministic and the tests order-dependent.

`contentProgress` counts what the reader **sees**, fallback included — the bar measures
readability, not translation progress.

---

## 3. Spell labels (`scripts/fetch-assets.mjs`)

### The Wowhead locale mapping is probed, not documented

```js
// scripts/config.mjs
export const WOWHEAD_LOCALES = [
  { lang: 'en', wowhead: 0 },
  { lang: 'fr', wowhead: 2 },
]
```

`0` → English and `2` → French were established **by probing**
`nether.wowhead.com/tooltip/spell/<id>?dataEnv=1&locale=<n>`, not read from documentation.
Wowhead does not publish that table.

**Probe before adding a language. Do not guess it.** A probe is one `curl` and a look at the
`name` field.

### `parseTooltip` classifies by position, not by multilingual regex

The tooltip renders `name / [range] / [cast time]`. The patterns recognizing those lines
(`/range$/i`, `/cast$/i`) match **English only**: French renders "Portée illimitée" and
"3 s d'incantation".

Rather than maintaining one regex set per language, `classifyLines()` classifies **once** on
the base language, and the other locales apply the same mapping **by index**. Wowhead renders
the same lines in the same order regardless of language — verified across all 875 spells in
the pool, zero divergence.

When line counts differ, the script **does not guess**: it keeps name and description, leaves
`castTime`/`range` empty, and warns. The app already tolerates their absence.

### Shape of `spells.json`

`id` and `icon` are language-independent and stay at the top; the rest moves under `text`:

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

`getSpell(id, locale)` falls back to `DEFAULT_LOCALE` when a locale is missing: Wowhead does
not translate everything, and a recent spell ships in English first. That is not an error, it
is the normal path.

**Adding a language to `WOWHEAD_LOCALES` requires `FORCE=1 npm run fetch:assets`**: the cache
only considers entries without a `text` block as needing work — it cannot tell that a
secondary locale is missing.

### Wowhead links

`wowheadUrl(spellId, locale)` in [data.ts](../../../src/lib/data.ts). English is served at the
domain **root** and takes no prefix, other languages do — hence the special case rather than a
uniform interpolation.

---

## 4. Adding a language

Six steps, in this order. There is deliberately no script for them: they are run once every
couple of years, and a script would be one more thing to keep true.

**1. Probe the Wowhead locale code.** It is not documented anywhere, so do not guess it:

```bash
curl -s "https://nether.wowhead.com/tooltip/spell/1306911?dataEnv=1&locale=3" | head -c 200
```

Read the `name` field. `Dismember` means you found English again, not German. Walk the small
integers until the language matches.

**2. Declare it.** One entry in `LOCALES`
([locales.ts](../../../src/lib/i18n/locales.ts)) and one in `WOWHEAD_LOCALES`
([config.mjs](../../../scripts/config.mjs)), with the code you just probed.

**3. Write the dictionary.** Copy `fr.ts` to `<lang>.ts`, translate the values, register it in
the `DICTIONARIES` map of [context.tsx](../../../src/lib/i18n/context.tsx). Do not chase the
key list by hand — `npm run typecheck` prints exactly what is missing or surplus, and keeps
failing until the file is complete. That is the whole point of the typed dictionary.

**4. Refetch the spells, with `FORCE=1`.**

```bash
FORCE=1 npm run fetch:assets
```

The per-spell cache check only looks at the base language, because a missing secondary label
is legitimate. Forgetting `FORCE=1` would therefore have meant "0 to fetch" and a silent
fallback to English across the pool — so `fetch-assets.mjs` now refuses to run instead,
naming the language it has never seen. Commit the regenerated `spells.json`: CI runs no
extraction script.

**5. Translate content if you want to.** Entirely optional and always partial: a mob with no
`<name>.<lang>.md` renders from the base. Nothing breaks by skipping this.

**6. Check both new and old.** `npm test`, then the app in the new language, then in the ones
that already worked — the switcher is in the header of the home and dungeon pages.

What you do **not** touch: mob names, spell names, spell descriptions. Those arrive localized
from the pipeline in step 4.

---

## 5. Testing

A component that displays text reads the context: a bare `render()` throws. Go through
[src/test/render.tsx](../../../src/test/render.tsx) — `renderEn` / `renderFr` — which forces
every test to state which language it is asserting in. A caller-supplied `wrapper` (a router)
is **nested inside** the provider, not overwritten.

`resolveLocale` and the functions in `format.ts` are pure: test them directly, without a DOM.

## Checklist before committing

1. `npm run typecheck` — this is what proves `fr.ts` covers exactly `en.ts`.
2. `npm test`.
3. Open the app **in both languages**: the switcher sits in the header of the home page and of
   each dungeon page. Check no hardcoded string is left.
4. If `WOWHEAD_LOCALES` or `fetch-assets.mjs` changed: re-run `npm run fetch:assets` and
   **commit `spells.json`** — CI runs no extraction script.
