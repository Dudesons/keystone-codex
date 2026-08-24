<!--
Thank you. A corrected sentence is as welcome as a whole card.

Say what the change does and, if it is not obvious, why — the diff already says what.
Delete whichever section below does not apply.
-->

## What this changes



## If you edited a card

- [ ] Every `id:` I wrote exists in `src/data/generated/<dungeon>.json` — I checked it rather than
      reconstructing it from a name.
- [ ] Nothing in the card claims what MDT or Wowhead does not hold. Anything I know only from
      playing is in the prose and marked as observed.
- [ ] I left `threat:` empty rather than guessing, where there was nothing to rate it from.

The rules behind those three are in
[`docs/writing-cards.md`](https://github.com/Dudesons/keystone-codex/blob/main/docs/writing-cards.md)
([français](https://github.com/Dudesons/keystone-codex/blob/main/docs/writing-cards.fr.md)), and
the field reference is in
[`CONTRIBUTING.md`](https://github.com/Dudesons/keystone-codex/blob/main/CONTRIBUTING.md).

## If you edited code

- [ ] `npm test` and `npm run typecheck` pass.
- [ ] New behaviour has a test that was watched failing first.

## Things that are easy to miss

- **A translated pair lands together or not at all** — `CONTRIBUTING.md` with
  `CONTRIBUTING.fr.md`, `docs/writing-cards.md` with its `.fr.md`. Nothing tests a document, so
  that rule is all that keeps them in step.
- **A new interface string needs both `en.ts` and `fr.ts`.** `tsc` fails on a missing key, so this
  one tells you itself.
- **Nothing under `src/data/generated/` or `public/maps/` is edited by hand** — it is rewritten
  wholesale by `npm run data`, and an edit survives until the next extraction.
