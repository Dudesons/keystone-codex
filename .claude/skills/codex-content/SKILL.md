---
name: codex-content
description: How a mob entry under content/ is written and rated — the threat scale, what may be claimed at all, and what to do when MDT's data is missing or unscaled. Read before writing or editing a card, rating a mob, or reconciling MDT against another source.
---

# Writing a codex entry

**Read [`docs/writing-cards.md`](../../../docs/writing-cards.md) first, and follow it.** It holds
the threat scale, the rules about what a card may claim at all, what to do when MDT's data is
missing or unscaled, and what earns a tip its place. It is not a summary of this file — it *is*
the rule, and it says the same thing to a contributor with no agent, in either language.

This file keeps only what a contributor has no reason to read: two ways the tooling will mislead
you.

Also worth having open:

- [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) — the field reference. Every key, its allowed
  values, and what a `.fr.md` may carry. The one place the format is defined.
- [the i18n skill](../i18n/SKILL.md) — which fields are translated and which are not.
- [`docs/codex-notes/`](../../../docs/codex-notes/) — per-dungeon working notes. Read the
  dungeon's note before editing its cards, and update it in the same pass.

## Two traps in the tooling

- **Affix spells are dropped at extraction**, via `AFFIX_SPELLS` in
  [`scripts/config.mjs`](../../../scripts/config.mjs). MDT hangs them on whichever mobs its
  capture happened to catch — `Xal'atath's Gift` sat on 44 mobs in three dungeons and none in
  the other five. Add to that list rather than deleting rows from the generated JSON, which a
  re-run would undo.
- **Never pin a test to a card's wording.** Six tests have broken that way across two
  sessions, each time punishing the writing they were meant to protect. Derive the expectation
  — call `getMobContent`, read the rendered link order — instead of hardcoding a sentence.

## Keeping the pair honest

`docs/writing-cards.md` and `docs/writing-cards.fr.md` are a translated pair, on the same terms
as `CONTRIBUTING.md` and `CONTRIBUTING.fr.md`: **both land in the same commit or neither does.**
Nothing tests a document, so that rule is the only thing keeping them in step.
