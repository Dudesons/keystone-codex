# Analysing an MDT update — design

**Goal:** when Mythic Dungeon Tools ships a new version, one command says what changed and what
that costs the codex, so the hand-written cards can be brought back in line with the data
deliberately rather than by luck.

**Why now:** MDT 6.2.2 is installed; a newer release is out and not yet installed. This is the
only moment at which two real versions of the addon can both be captured, which the differ's
test needs (decision 8).

**Why at all:** a card's spell note is joined to the data by ID at render time.
`MobCard.tsx:49` iterates `enemy.spells` — the MDT list — and `MobCard.tsx:45` looks the note up
by ID. When MDT drops a spell from a mob, the note attached to it is not reported, not warned
about, and not shown: **it leaves the site silently**. The same holds for a whole card whose
`npcId` no longer appears in the dungeon. Human writing is the one thing in this repository
that cannot be regenerated, and today nothing tells us when the data stops carrying it.

## Scope

| In | Out |
| --- | --- |
| What the new MDT brings that must reach the cards | Impact analysis on saved routes and the codec fixture |
| A markdown report, per severity, per dungeon | Automatic renaming of card files after a mob is renamed |
| Refreshing the `# auto` marker lines in place | Any network call; any writing of judgement |
| A skill carrying the procedure end to end | Anything that decides a `threat` rating for us |

Routes were considered and dropped: `mdtIdx` is sparse and referenced by every saved route, so
an update that renumbers clones is a real hazard — but a report cannot repair it, and naming the
hazard belongs in the skill rather than in a tool.

## The decisions

### 1. Record the MDT version at extraction

Nothing in the repository records which addon version produced the generated files, so no report
can name what it compares. `scripts/mdt-version.mjs` exposes `parseTocVersion(tocText)`, which
reads the `## Version:` line of `MythicDungeonTools.toc`. `extract-mdt.mjs` writes
`src/data/generated/mdt.json`:

```json
{ "version": "6.2.2", "expansion": "Midnight" }
```

A separate file, not a field in `dungeons.json`: that file is an array, and `src/lib/data.ts`
consumes its shape. No timestamp goes in, or every re-extraction would produce a diff even when
the data is identical. A `.toc` that cannot be read yields `null` and a warning, never an
exception — extraction must not fail over a metadata line.

**This decision must land while 6.2.2 is still installed.** Running `npm run extract` and
committing `mdt.json` before the update makes the first report read `6.2.2 → <new>` instead of
`unknown → <new>`. Once the update is installed, that provenance cannot be recovered, so the
implementation plan sequences this decision first.

### 2. Git is the base; there is no snapshot

The repository already requires the generated files to be committed after every `npm run data`,
because CI runs no extraction and the live site moves only when they are versioned. `HEAD` is
therefore the pre-update state by construction, with nobody having to remember anything. The
tool reads the old side with `git show <base>:src/data/generated/<file>` and the new side from
the working tree.

A `--base <rev>` flag compares against any other revision.

The tool does **not** refuse to run on a dirty `src/data/generated/`, and an earlier draft of
this design was wrong to say it would: after `npm run data` that directory is dirty by
construction, since its contents are the new side of the comparison. The check has to be one the
tool can still make when it runs, and there is exactly one:

- When base and working tree report the same `mdt.json` version, the tool warns. Either nothing
  was updated, or `HEAD` is not a pre-update state.
- The report header names the base revision and both versions, so any comparison can be audited
  after the fact.

The discipline that actually protects the base — commit the generated files *before* extracting —
belongs in the skill's step 2, because by the time the tool runs, a base overwritten before
committing is already unrecoverable and no check can bring it back.

An explicit `npm run mdt:snapshot` was considered. Its only advantage would be surviving
uncommitted generated files — and in exactly that case, forgetting the snapshot step destroys
the information, whose only remaining recovery is git. A snapshot adds a step that can be
forgotten and nothing that git does not already provide.

### 3. What the report detects, ordered by what it costs

Two sources feed one report: the **diff** of the generated JSON between base and working tree,
and the **audit** of the current generated JSON against `content/**.md` — base files and their
`.fr.md` siblings alike, since a translation carries its own `note:` fields.

| Severity | Detected | Consequence |
| --- | --- | --- |
| 1 — writing lost | A `note:` or `tag:` on a spell ID no longer in that mob's `spells`; a card whose `npcId` is no longer among the dungeon's `enemies` | The writing leaves the site without a word (`MobCard.tsx:45`, `:49`) |
| 2 — writing incomplete | A mob whose card is written (`isStub === false`, `content.ts:283-288`) and whose data gained spells carrying no `note:` | The spell renders with its Wowhead description alone |
| 3 — writing possibly stale | An annotated spell whose `text[lang].description` or `castTime` changed between versions; a mob whose `cc` changed (**shipped at 6** — see below) | Notes quote tooltip numbers. Old and new are printed side by side for a human to judge |
| 4 — to write | Mobs in the data with no card; whole dungeons that are new | `npm run scaffold` writes the stub; the report names them so none is missed |
| 5 — dead weight | Cards, base and `.fr.md`, whose mob left MDT | Nothing breaks; the repository misstates its own contents |
| 6 — informational | Mobs and clones added or removed, by count; pack regrouping (`g`); `totalCount`, `mdtIndex`, `mapID`, `teleportId`; rescaled health and level; `textureFolder`; a mob whose clones moved beyond a distance threshold (decision 4) | A changed `textureFolder` forces `npm run build:maps`. Force coverage below 100% means extraction missed something |

Severity 1 is the reason the tool exists. Severity 6 exists because a human reading a report
needs to know whether the update was small.

**Deviation, as implemented: a changed `cc` is reported at severity 6, not 3.** Grading it at 3
would mean knowing whether any card annotates that mob, and `diffDungeon` compares two generated
snapshots and knows nothing about `content/` — threading the card set into it buys one severity
number at the price of a coupling nothing else in that module has. The change is still named, in
the section a human is told to read for the shape of the update, which is what the row above was
after.

### 4. No coordinate is ever diffed by value

**Measured, not assumed: the first real update, MDT 6.2.2 → 6.2.3 on The Blinding Vale, the one
dungeon that pair touched.** Matching clones by `mdtIdx` — never by array position, which an
inserted or removed clone would shift and so invent movement that never happened — 276 clones
line up on both sides: 91 sit at the byte-identical position and 185 moved, the smallest nonzero
move being well over half a unit. There is no sub-unit recapture jitter in this pair at all: MDT
does not perturb a clone's position on export, and this design's earlier premise that it does
was wrong. What actually happened is visible in the raw `.lua` diff too — round numbers like
`["x"] = 344` are the signature of a mob dragged by hand in MDT's editor, not of floating-point
noise.

A float-by-float diff is still unreadable, and the conclusion stands: no coordinate is ever
reported by value, because 185 raw pairs of numbers would bury every other finding in the same
report. What changes is the reason and the rule that follows from it. Rather than reporting
nothing about position, clones are matched by `mdtIdx`, the distance between matched pairs is
measured, and a mob is reported — at severity 6, one finding for the whole mob, naming how many
of its clones moved and how far the furthest one went — only when that distance exceeds a
threshold of 20 units (MDT's frame is 840 by 560, so 20 units is a couple of percent of the
map's width: enough that a mob changed corner, not that it was nudged by a pixel). A clone
present on only one side is not movement; that is what the existing clone-count finding already
covers.

This is why a semantic differ earns its place over `git diff`, which on these files is
unreadable for precisely this reason — the two real captures above are the strongest version of
that claim, since clone movement is the bulk of what changed between them.

### 5. The report is a file, and it declines to overwrite itself

`docs/mdt-updates/YYYY-MM-DD-<old>-to-<new>.md`, sections in the order of the table above,
subsections per dungeon, findings as checkboxes: the report doubles as the worklist for the
backport that follows it. A version the tool could not read becomes `unknown` in that filename,
which keeps the date and the direction of the comparison legible even when the provenance is
missing — the case that holds for every base committed before decision 1 exists.

An empty section states that it is empty. A section left out cannot be told apart from a section
forgotten.

Standard output carries a compact summary — findings per severity per dungeon — so the size of
the job is known before the file is opened.

When the target file already exists, the tool stops unless given `--force`. Ticked checkboxes
are a human mark, not derived output.

### 6. `--apply` rewrites marked lines in place, and nothing else

`scripts/card-auto-fields.mjs` exposes `refreshAutoFields(cardText, enemy)`, returning the new
text and the list of lines it changed. It is pure, so the rule can be tested without a
filesystem.

The rule is deliberately narrow:

- Only lines carrying the marker are touched: `name: "…"   # auto`, `count: N   # auto`, and the
  `# Applicable CC (auto, from MDT): …` comment.
- Only the value is rewritten, in place, preserving the marker exactly.
- `.fr.md` files are never touched: a translation carries text, and none of these fields.
- The function is idempotent. Running it twice changes nothing.

An `isBoss: true   # auto` line that ought to appear or disappear is **reported, not applied**.
Inserting or deleting a line in a hand-written file differs in kind from correcting a value on
one.

Without `--apply`, the tool prints the lines it would change and writes nothing. This matters
because the gain here is cosmetic: `src/lib/content.ts:200-207` shows the app reads only
`npcId`, `threat`, `role`, `trap`, `spells` and the prose. A stale `count:` is a false comment,
not a bug — so a noisy diff across cards nobody has reread must stay an explicit choice.

### 7. The script analyses; the skill adapts

The mechanical half is deterministic and belongs in tested code. The other half — rewriting a
note whose numbers moved, rating a new mob, deleting a dead card and its translation — is
judgement, and scripting judgement is how a codex starts lying.

`.claude/skills/mdt-update/SKILL.md` therefore carries the procedure, and is listed in
CLAUDE.md's skill table:

1. Install the update; read the version out of the `.toc`.
2. Confirm `src/data/generated/` is committed. **The base is lost if it is not.**
3. `npm run data`.
4. `npm run mdt:report`.
5. Work the report from severity 1 down, deferring to `codex-content` for any rating and to
   `i18n` for the `.fr.md` sibling.
6. Verify: `npm test`, `npm run typecheck`, and force coverage at 100% for every dungeon.
7. Commit.

The skill states the traps that cannot be deduced from the code: sparse indices are what routes
reference; a changed `textureFolder` forces `npm run build:maps`; CI runs no extraction, so the
generated files must be committed; and a game patch may require refreshing
`src/lib/mdt/__fixtures__/real-export.txt`, which is patched in place, never re-encoded.

Commits follow the existing history: one commit re-extracting the data and carrying the report,
then one backport commit per dungeon.

### 8. The differ is tested against two real MDT versions

Every pure module gets a test against a real artefact, as the repository already requires. For a
differ that means two versions of the same file, and only this moment offers them: once the
update is installed, `scripts/__fixtures__/AltarOfFangs.lua` (34 KB, captured from 6.2.2) is
joined by the same dungeon captured from the new release.

The alternative — mutating the existing fixture to manufacture an "old" side — would test our
own idea of what an MDT update does, which is the failure mode the repository's testing rules
name outright.

**Substitution, as implemented.** Two captures of `AltarOfFangs.lua` cannot both exist before the
update is installed, so this decision was unachievable at the moment the differ was written. What
shipped is two git revisions of the real generated `altar-of-fangs.json`, taken from either side of
commit `e520646`, which dropped the seasonal affix from the extraction: eleven mobs lose spell
`1221063` between them — a real spell loss, which is the case the differ exists to catch. Both
sides are output of the real pipeline, so the reasoning above survives intact: neither is
hand-made, and nothing here tests our own idea of what an update does. They are committed as
`scripts/__fixtures__/altar-of-fangs.with-affix.json` and `.without-affix.json`, and documented in
`scripts/__fixtures__/README.md`.

| Module | Test artefact |
| --- | --- |
| `mdt-version.mjs` | The real `MythicDungeonTools.toc`, committed as a fixture |
| `mdt-diff.mjs` | Two real versions of the generated `altar-of-fangs.json` (**substituted** — see above) |
| `card-audit.mjs` | `content/__fixtures__/`, which already holds real cards and one base/`fr` pair |
| `card-auto-fields.mjs` | Real card text in, expected text out, plus an idempotence test |
| Report rendering | A pure function from findings to markdown, asserted on structure |

## Module layout

The split follows what `scripts/` already does: a thin script that reads and writes, and pure
modules that hold the logic so they can be tested without WoW and without a filesystem.

| File | Role |
| --- | --- |
| `scripts/mdt-report.mjs` | New. Reads git and the filesystem, writes the report, owns the flags |
| `scripts/mdt-diff.mjs` | New, pure. `diffDungeon(old, new)`, `diffSpells(old, new)` |
| `scripts/card-audit.mjs` | New, pure. Cards against current data, by severity |
| `scripts/card-auto-fields.mjs` | New, pure. `refreshAutoFields(text, enemy)` |
| `scripts/mdt-version.mjs` | New, pure. `parseTocVersion(tocText)` |
| `scripts/extract-mdt.mjs` | Writes `mdt.json` |
| `package.json` | `"mdt:report": "node scripts/mdt-report.mjs"` |
| `CLAUDE.md` | Lists the `mdt-update` skill |
| `docs/mdt-updates/` | New. One report per update |

`npm run data` does not gain the report: extraction and analysis answer different questions, and
the report should be re-runnable without re-extracting.

## What this design does not do

- It does not decide anything about a mob. Every severity-1 through severity-5 finding ends in a
  human sentence.
- It does not touch `public/maps/`. It says when `build:maps` must run.
- It does not reach the network. The MDT release notes are linked in the report by URL, for a
  human to read.
- It does not analyse route breakage, though the skill names the hazard.

## Appendix A: facts established while designing this

Each was verified rather than assumed, and each is a reason a section reads the way it does.

- `MobCard.tsx:45` and `:49` — the spell list renders from `enemy.spells` and looks notes up by
  ID. An orphaned note vanishes with no diagnostic. This is the whole justification for
  severity 1.
- `src/lib/content.ts:200-207` — the app reads `npcId`, `threat`, `role`, `trap`, `spells` and
  the prose from a card's frontmatter. `name:` and `count:` are read by nobody, which demotes
  the whole "mechanical correction" idea to cosmetics.
- `src/lib/content.ts:283-288` — a card counts as written when it carries prose, a trap, a
  threat, or one annotated spell. Severity 2 uses exactly this test: a written card that has
  gained un-annotated spells is the case worth reporting.
- MDT's installed version is `6.2.2`, on the `## Version:` line of `MythicDungeonTools.toc`.
  Nothing in `src/data/generated/` or `scripts/` records it.
- `spells.json` holds `{ id, icon, text: { <lang>: { name, castTime, description } } }`, 874
  entries; `npcs.json` holds `{ id, text: { <lang>: { name, type } } }`, 259 entries. Severity 3
  compares `description` and `castTime` within `text[lang]`.
- `content/__fixtures__/` already holds three real cards, one of them with its `.fr.md` sibling —
  enough to test the audit without inventing content.

## Appendix B: noted, out of scope

`.claude/skills/testing/` exists on disk but is absent from CLAUDE.md's skill table. Recorded
here rather than fixed, since it belongs to neither this design nor its implementation.
