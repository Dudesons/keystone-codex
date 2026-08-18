---
name: mdt-update
description: Read before installing an MDT update, re-running npm run data, or backporting what an update changed into the cards.
---

# Installing an MDT update

`npm run mdt:report` says what the generated data cost the cards: a spell that vanished
under a note, a mob that gained abilities nobody has annotated, a dungeon with no cards at
all. It cannot say what to write instead. That half is judgement, and this skill carries it.

## The one-way door

**Commit `src/data/generated/` before you extract.** `npm run mdt:report` compares a base
revision — `HEAD` by default — against the working tree, and that only works because the
pre-update state is already in git. Extract over an uncommitted `src/data/generated/` and the
pre-update data exists nowhere: no later step in this procedure can recover it.

## The procedure

1. Install the update, then read `## Version:` from `MythicDungeonTools.toc`.
   → verify: it differs from the `version` in `src/data/generated/mdt.json` — a match means
   the addon did not actually update.
2. `git status --short src/data/generated/`
   → verify: empty. Anything listed is exactly the state the one-way door warns about; commit
   it before continuing.
3. `npm run data`
   → verify: every one of the eight dungeons logs 100% force coverage, and the run prints no
   `unknown characteristics, add them to CC_ORDER: …` warning. If it does, add the named value
   to `CC_ORDER` in `scripts/mdt-dungeon.mjs` before continuing.
4. `npm run mdt:report`
   → verify: the report's title names both MDT versions, neither as `unknown`. The newer one
   renders `unknown` when `src/data/generated/mdt.json` is missing or the `.toc` carried no
   `## Version:` line — an extraction problem. The older one renders `unknown` when the base
   revision's own committed `mdt.json` has no version, a fact about that revision rather than
   this run.
5. Work the report from severity 1 down. See below for what each severity asks of you.
6. `npm test && npm run typecheck`
   → verify: both green, and the fixture tests in `codec.test.ts` not reported as skipped — a
   skip there means `real-export.txt` went missing, not that the update is done.
7. Commit, at the granularity below.

## How to work each severity

- **Severity 1 — writing already lost.** A note now points at a spell id the mob no longer
  carries, or a whole card's mob left the dungeon. Move the note to the spell that replaced
  it, or delete it. Deleting writing is a decision, not a tidy-up: state it in the commit
  message. Read `codex-content` first — it owns what a card may claim.
- **Severity 2 — writing incomplete.** A written card whose mob gained spells nobody has
  annotated. Annotate the new spells, or leave `tag: todo` deliberately. Both are answers; an
  unread finding is not.
- **Severity 3 — writing possibly stale.** A tooltip changed under a note that may quote its
  numbers. Reread the note against the new tooltip — a changed description usually means a
  changed sentence, since a note's figures are quoted from it.
- **Severity 4 — to write.** A new mob or a new dungeon, with no card yet. Run
  `npm run scaffold`, then write. `codex-content` owns the threat scale.
- **Severity 5 — dead weight.** The card's mob left MDT and the card was never written.
  Delete the file **and its `.fr.md` sibling** — missing one leaves a translation of nothing.
- **Severity 6 — informational.** What moved in the data, with no writing lost. Read it: it
  is what tells you whether the update was small. Most of these are just the shape of the
  change, but two kinds name a concrete follow-up rather than nothing — a changed
  `textureFolder` means the committed map no longer matches the tiles (`npm run build:maps`),
  and an `isBoss` line that should now appear or disappear names which line to add or remove.
- **For every `.fr.md` you touch**, read `i18n` first. A translation carries text only —
  `threat`, `role`, `tag` and `prio` stay in the base card.

## The traps

- **`mdtIdx` is sparse, and routes reference it directly.** Never renumber it, even to close a
  gap left by a deleted mob.
- **A changed `textureFolder` means the committed WebP no longer matches the tiles.** Run
  `npm run build:maps`; the report names this, but only running the command fixes it.
- **CI runs no extraction.** The generated files and the rebuilt maps have to be committed, or
  the live site does not move.
- **A game patch can require refreshing the codec fixture**,
  `src/lib/mdt/__fixtures__/real-export.txt`. It is patched in place by
  `scripts/patch-fixture-name.mjs`, never re-encoded from scratch — re-encoding it with our own
  encoder would compare our code to itself. See `mdt-pipeline`.
- **`--apply` touches only the unindented `name:` and `count:` lines and the
  `# Applicable CC (auto, from MDT)` comment.** It never touches the per-spell `name:` lines
  under `spells:` — those carry the same `# auto` marker, but an earlier version of the code
  overwrote every one of them with the mob's own name, which is why the rewrite is anchored to
  column 0. A spell whose label moved is reported by the label diff instead, not by `--apply`.
  It never touches a `.fr.md` either. Run `npm run mdt:report` without the flag first and read
  what it would change before adding `-- --apply`.

## Commit granularity

One commit for the re-extraction and the report. Then one commit per dungeon for the
backport, matching the existing history.
