# Wowhead tooltip fixtures

Ten responses captured verbatim from `nether.wowhead.com/tooltip/<kind>/<id>?dataEnv=1&locale=<n>`
— two spells and three creatures, each in two languages.

## Why they are committed rather than fetched

The tests read these files. They never call Wowhead. A suite that queried the live API would
depend on Wowhead being up, break whenever a patch reworded a spell, and be subject to their
rate limiting — for no gain, since what is under test is our parsing, not their uptime.

## Why real responses rather than hand-written HTML

`classifyLines` rests on one claim: **Wowhead renders the same lines in the same order
whatever the language**, so the meaning of each line can be decided once on English and
applied positionally everywhere else. HTML written by hand would satisfy that claim by
construction, and the test would prove nothing.

The pair is chosen to make the claim falsifiable:

| Fixture | Header lines | What it shows |
| --- | --- | --- |
| `dismember.{en,fr}` | 2 — range, then cast time | both fields land in the right place across languages |
| `fade-out.{en,fr}` | 1 — cast time only | a different shape, handled without a per-language rule |

`fade-out.fr` is the one that matters: its line reads **"Instantanée"**, which the English
pattern `/^instant$/i` does not match. Only positional mapping puts it in `castTime`. Were
anyone to replace it with per-language regexes, that test would fail.

Both `fade-out` responses also carry a separate `buff` block. `tooltipLines` reads the first
table only, so "Invisible." must never appear in a spell's fields — there is a test for that.

## The creature fixtures

`tooltip/npc/<id>` renders the name, then `Type (Classification)` on the line below it. The
three pairs are chosen the same way — each one breaks a parser the others would let through:

| Fixture | Renders | What it shows |
| --- | --- | --- |
| `npc-ritual-chieftain.{en,fr}` | `Humanoid (Elite)` / `Humanoïde (Élite)` | the ordinary shape, and that the classification is dropped in both languages |
| `npc-ravi.{en,fr}` | a boss | its tooltip opens with a `wowhead-tooltip-npc-graphic` row holding the journal portrait, which shifts every row down by one — read by index, the creature type comes back as "Rav'i" |
| `npc-infused-eggs.{en,fr}` | ` (Normal)` / ` (Standard)` | a creature Wowhead gives no type at all, so the split has to yield nothing rather than an empty string |

Both `npc-ritual-chieftain` responses are also the pair behind the "Wowhead agrees with MDT"
check: `270306` is the reference entry of `content/altar-of-fangs/`, and its English name here
is what proves the two sources share an id space.

## Refreshing them

```bash
curl -s "https://nether.wowhead.com/tooltip/spell/1306911?dataEnv=1&locale=0" \
  -o scripts/__fixtures__/wowhead/dismember.en.json
```

Locale codes live in `SPELL_LOCALES` (`scripts/config.mjs`) and were established by probing,
not from documentation: `0` is English, `2` is French.
