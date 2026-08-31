---
name: mdt-update
description: Read before installing an MDT update, re-running npm run data, or backporting what an update changed into the cards.
---

# Installing an MDT update

`npm run mdt:report` says what the generated data cost the cards: a spell that vanished
under a note, a mob that carries abilities nobody has annotated, a dungeon with no cards at
all. It cannot say what to write instead. That half is judgement, and this skill carries it.

## The one-way door

**Commit `src/data/generated/` before you extract.** `npm run mdt:report` compares a base
revision — `HEAD` by default — against the working tree, and that only works because the
pre-update state is already in git. Extract over an uncommitted `src/data/generated/` and the
pre-update data exists nowhere: no later step in this procedure can recover it.

The addon's own files, on the other hand, **are** recoverable, which matters if you installed the
update before thinking about any of this. MDT tags every release, named as a bare version with no
`v` — so one dungeon's pre-update file comes back with:

```bash
gh api "repos/Nnoggie/MythicDungeonTools/contents/Midnight/AltarOfFangs.lua?ref=6.2.2" -H "Accept: application/vnd.github.raw"
```

That is how the two-version fixture pair in `scripts/__fixtures__/` was made. Beware one trap when
comparing what you get against a live install: the tagged file has LF endings and the installed one
CRLF, so their byte sizes differ by roughly one per line while their content is identical. Normalise
before you compare, and never conclude a dungeon changed from its size alone.

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

   **This step does not refresh a single tooltip you already have.** `npm run data` ends in
   `npm run fetch:assets`, which fetches only spells missing from `src/data/generated/spells.json`
   and never revisits a cached one. So severity 3 — the tooltip diff — is measuring nothing
   after a plain `npm run data`: every known spell's text comes back byte-identical, and the
   section will read empty whether or not anything moved.
4. **Only if a game patch landed too:** `FORCE=1 npm run fetch:assets`
   → verify: the run reports a number of spells to fetch, not `0 to fetch`. This re-downloads
   every tooltip in every language in `WOWHEAD_LOCALES` — 874 spells as of this writing — so it
   is deliberately not part of step 3. An MDT update on its own rarely moves a
   tooltip: MDT ships which mob casts what, and Blizzard ships what the spell says. A **patch**
   is what rewrites descriptions and cast times, and this command is the only way the report
   sees it. Skipping it means severity 3 is empty by construction, not by evidence.

   **A fetch that fails no longer costs you the label.** A full pass merges onto the table
   rather than rebuilding it from nothing, so an id whose fetch fails keeps its previous value
   and the table cannot shrink. The command also **exits non-zero** and names the ids, because
   the kept value looks current to a plain pass and only another `FORCE=1` retries it. If it
   fails, re-run it before doing anything else — a stale label is invisible in the diff of a
   generated JSON that large. A 404 is not this: it is reported as unresolved, exits 0, and one
   spell in the pool genuinely has left the game.
5. `npm run mdt:report`
   → verify: the report's title names both MDT versions, neither as `unknown`. The newer one
   renders `unknown` when `src/data/generated/mdt.json` is missing or the `.toc` carried no
   `## Version:` line — an extraction problem. The older one renders `unknown` when the base
   revision's own committed `mdt.json` has no version, a fact about that revision rather than
   this run.
6. Work the report from severity 1 down. See below for what each severity asks of you.
7. `npm test && npm run typecheck`
   → verify: both green, and the fixture tests in `codec.test.ts` not reported as skipped — a
   skip there means `real-export.txt` went missing, not that the update is done.
8. Commit, at the granularity below.

## How to work each severity

- **Severity 1 — writing already lost.** A note now points at a spell id the mob no longer
  carries, or a whole card's mob left the dungeon. Move the note to the spell that replaced
  it, or delete it. Deleting writing is a decision, not a tidy-up: state it in the commit
  message. Read [`docs/writing-cards.md`](../../../docs/writing-cards.md) first — it owns what a
  card may claim.
- **Severity 2 — writing incomplete.** A written card whose mob carries spells nobody has
  annotated — the audit reads the current state of the card against the current data, not what
  the update changed, so these may predate it. Annotate the spells, or leave `tag: todo`
  deliberately. Both are answers; an unread finding is not. Working one is codex work rather than
  update work, so deferring one deliberately — to raise separately, or to leave for whoever knows
  what the spell does — is a legitimate answer here too, as long as it is deliberate.
- **Severity 3 — writing possibly stale.** A tooltip changed under a note that may quote its
  numbers. Reread the note against the new tooltip — a changed description usually means a
  changed sentence, since a note's figures are quoted from it. An **empty** severity 3 means
  nothing unless step 4 ran: without `FORCE=1 npm run fetch:assets` every cached tooltip comes
  back unchanged by construction.
- **Severity 4 — to write.** A new mob or a new dungeon, with no card yet. Run
  `npm run scaffold`, then write. [`docs/writing-cards.md`](../../../docs/writing-cards.md) owns
  the threat scale.
- **Severity 5 — dead weight.** The card's mob left MDT and the card was never written.
  Delete the file **and its `.fr.md` sibling** — missing one leaves a translation of nothing.
- **Severity 6 — informational.** What moved in the data, with no writing lost. Read it: it
  is what tells you whether the update was small. Most of these are just the shape of the
  change, but two kinds name a concrete follow-up rather than nothing — a changed
  `textureFolder` means the committed map no longer matches the tiles (`npm run build:maps`),
  and an `isBoss` line that should now appear or disappear names which line to add or remove.
  A changed **`cc`** also lands here rather than at severity 3: the differ compares two data
  snapshots and cannot know which mobs have cards. Read those against the notes yourself — a
  note telling the group to stun something no longer stunnable is stale writing, and severity 6
  is the only place it is named.

  **A changed `health` is the same trap, and it is by far the most common finding here.** The
  6.2.8 → 6.2.10 pass moved 70-odd health values and left **fourteen cards across five dungeons
  stating a figure the data no longer held** — the differ cannot see prose, and "informational"
  reads like "nothing to do". Two of those were not arithmetic: the Lightning Spire's card
  argued *from* its 21.6M health that a spell-less NPC could not be scenery, and MDT corrected
  the figure to 235,746, so the card's conclusion had to go with the number. **Sweep it
  mechanically rather than by eye** — cards write health as `0.4 million health` /
  `0,4 million de points de vie` / `8.4M health`, so grep `health|points de vie` in every card
  whose mob the report names, and compare. Watch for two kinds of false positive: most matches
  are percentage *mechanics* ("5% of maximum health"), and a card often quotes a **different**
  mob's health when it links to one. Also note the same npcId can carry different health in
  two dungeons (Magma Totem, `248666`).

  A mob reported as **moved on the map** needs nothing from
  you: the map is drawn from the data, so wherever the mob now stands is already where it
  renders. It is here only so you know the update repositioned something, not because there is
  a line to change.
- **For every `.fr.md` you touch**, read `i18n` first. A translation carries text only —
  `threat`, `role`, `tag` and `prio` stay in the base card.

## The traps

- **`mdtIdx` is sparse, and routes reference it directly.** Never renumber it, even to close a
  gap left by a deleted mob.
- **A scoped tip's `packs:` is a pack id, and nothing promises those are stable.** `mdtIdx` is
  never renumbered, but `g` carries no such rule — `mdt-diff` reports pack changes precisely
  because they happen. After an update that names a pack finding, re-read every card with a
  `packs:` key: a tip pointing at a renumbered pack is wrong and looks entirely correct.
  `grep -rl 'packs:' content/` is the list.
- **A changed `textureFolder` means the committed WebP no longer matches the tiles.** Run
  `npm run build:maps`; the report names this, but only running the command fixes it.
- **CI runs no extraction.** The generated files and the rebuilt maps have to be committed, or
  the live site does not move.
- **`npm run build:maps` leaves a map alone unless its tiles moved**, so there is no encoder
  noise to sort out by hand any more. It says which it did and why — `unchanged`, or
  `rebuilt: source changed` — and it is the digests in `public/maps/source-digests.json` that
  decide, not the file sizes. **Commit that file with the maps**; they are one fact, and a
  digest describing bytes that were never committed sends the next run to sleep on a stale map.
  `FORCE=1 npm run build:maps` re-encodes everything, which is for a new encoder rather than for
  an update. The encoder is still not byte-stable — that is why the digest is taken over the
  tiles and never over the output.
- **`npm run fetch:assets` prints an "Unresolved spells" line, and it must be read.** On one real
  run it read `Unresolved spells (rendered with their raw ID): 1300666` — one spell Wowhead has
  no page for, which the site then renders as a bare number. That particular id was pre-existing,
  from a dungeon the update did not touch, but a **newly** unresolved id means a label the site
  is now missing, and nothing else in this procedure surfaces it. Compare the line against what
  the run before it said. The non-zero exit added for a *failed* fetch does not cover this: a 404
  is expected and exits 0, precisely because 1300666 is real and would otherwise fail every run.
- **Do not try to read the `.lua` diff yourself.** Coordinate floats drown the real change, and a
  naive line-by-line diff silently hides a changed scalar whose new value occurs anywhere else in
  the file — `["count"] = 0,` exists for dozens of other mobs, so six bosses losing thirty forces
  each was invisible to it on a real run. The semantic differ compares mob by mob, by id, and is
  the only thing here that can be trusted with this question. Run the report; do not eyeball the
  addon.
- **A game patch can require refreshing the codec fixture**,
  `src/lib/mdt/__fixtures__/real-export.txt`. It is patched in place by
  `scripts/patch-fixture-name.mjs`, never re-encoded from scratch — re-encoding it with our own
  encoder would compare our code to itself. See `mdt-pipeline`.
- **`--apply` touches only the unindented `name:` and `count:` lines and the
  `# Applicable CC (auto, from MDT)` comment.** It never touches the per-spell `name:` lines
  under `spells:` — those carry the same `# auto` marker, but an earlier version of the code
  overwrote every one of them with the mob's own name, which is why the rewrite is anchored to
  column 0. A spell whose label moved is reported by the label diff instead, not by `--apply` —
  but only if the labels were actually re-fetched. Step 4 is what makes that true; after a plain
  `npm run data` the label diff sees nothing, and a per-spell `name:` line is then stale in the
  card with nothing anywhere saying so. It never touches a `.fr.md` either. Run `npm run mdt:report` without the flag first and read
  what it would change before adding `-- --apply`.

## Commit granularity

One commit for the re-extraction and the report. Then one commit per dungeon for the
backport, matching the existing history.
