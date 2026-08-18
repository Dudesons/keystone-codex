# MDT Update Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** one command that reports what an MDT update changed and what it costs the hand-written
cards, plus a skill that turns that report into corrected content.

**Architecture:** a thin script reads git and the filesystem; every rule lives in a pure module
beside it, tested against real committed artefacts. This mirrors the split the repository already
uses between `extract-mdt.mjs` and `mdt-dungeon.mjs`, and between `scaffold-content.mjs` and
`content-stub.mjs`.

**Tech Stack:** Node ESM (`.mjs`), Vitest (`app` project, node environment), the `yaml` package
already in `dependencies`, `git` through `node:child_process`.

**Spec:** [docs/plans/2026-08-18-mdt-update-analysis-design.md](2026-08-18-mdt-update-analysis-design.md)

## Global Constraints

- **The app never reads the WoW install at runtime.** Only `scripts/` touches `MDT_PATH`.
- **CI runs no extraction script and has no WoW.** No test may depend on either. Anything a test
  needs must be a committed artefact.
- **A real artefact beats a hand-written one** whenever the test's subject is the shape of an
  input. Where a test constructs a *scenario* over a real input shape, it says so in a comment.
- **English** in code, comments, commit messages, skills and these plan documents.
- **No `--no-verify`**, ever.
- **MDT indices are sparse and must stay so.** Never renumber `mdtIdx`; iterate keys, not array
  positions.
- **`npm run scaffold` never overwrites an existing file**, and neither does anything in this plan
  except `--apply`, under its own narrow rule.
- Commit style: imperative subject, no `feat:`/`fix:` prefix, body explains **why**, and ends with
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Sequencing constraint, read before task 1

**Task 1 must run while MDT 6.2.2 is still installed.** It records the addon version into
`src/data/generated/mdt.json`; once the update is installed, the provenance of the current data is
gone for good and the first report reads `unknown → <new>`.

Tasks 1 through 8 need no new MDT. Task 9 is the one that installs it.

## File structure

| File | Responsibility |
| --- | --- |
| `scripts/mdt-version.mjs` | New, pure. Reads the version out of a `.toc` text |
| `scripts/mdt-diff.mjs` | New, pure. Compares two generated snapshots, semantically |
| `scripts/card-audit.mjs` | New, pure. Reads a card's facts; audits cards against current data |
| `scripts/card-auto-fields.mjs` | New, pure. Rewrites `# auto` marker lines in place |
| `scripts/mdt-report-md.mjs` | New, pure. Turns findings into the markdown report |
| `scripts/mdt-report.mjs` | New, thin. Reads git and the filesystem, owns the flags, writes |
| `scripts/extract-mdt.mjs` | Modified. Also writes `mdt.json` |
| `scripts/__fixtures__/` | Gains a real `.toc` and a two-version pair of one dungeon's JSON |
| `.claude/skills/mdt-update/SKILL.md` | New. The procedure, including the judgement half |
| `CLAUDE.md` | Modified. Lists the new skill |
| `package.json` | Modified. `mdt:report` |
| `docs/mdt-updates/` | New. One report per update |

`mdt-report-md.mjs` is one module more than the design's table lists. Rendering is a pure
function of findings, it is the largest single body of string-building in the tool, and keeping it
out of the thin script is what lets it be tested at all.

## Two stated deviations from the design

Both are deliberate. Neither is hidden in a task.

**A changed `cc` is reported at severity 6, not 3.** The design's table puts it at 3, reasoning
that a card telling you to stun a mob dates when the mob stops being stunnable. Grading it that
way would mean threading the card set into `diffDungeon`, which otherwise knows nothing about
`content/` — for a case that a human reading severity 6 catches anyway, since the finding names
the mob and the crowd control by name. The coupling costs more than the grading buys.

**`spells.json` is not committed as a fixture pair.** The design's decision 8 asks for real
artefacts on both sides of every differ test. At 560 KB a second copy of that table costs more
than it proves, so `diffSpells`'s tests read the real committed table as their input shape and
construct each change over it. That is the repository's existing habit — its tests already read
the real generated data — and the thing a fabricated fixture would have faked here is a change,
not an input format.

## Findings: the one shape everything produces

Every rule in every module emits this object, and `mdt-report-md.mjs` is the only thing that
formats it. Defined here because tasks 2 through 6 all depend on it.

```js
/**
 * @typedef {object} Finding
 * @property {1|2|3|4|5|6} severity   Ordered by what it costs; see the design's decision 3.
 * @property {string} dungeon         Dungeon slug, or '' for findings about the whole index.
 * @property {string} subject         What the finding is about: '270306 Ritual Chieftain'.
 * @property {string} what            One sentence, present tense, stating the fact.
 * @property {string} [detail]        Optional second line: old and new values, ids, counts.
 * @property {string} [action]        Present whenever a concrete follow-up is known.
 * @property {string} [file]          Repository-relative path, when one card is implicated.
 */
```

---

### Task 1: Record the MDT version at extraction

**Files:**
- Create: `scripts/mdt-version.mjs`
- Create: `scripts/mdt-version.test.mjs`
- Create: `scripts/__fixtures__/MythicDungeonTools.toc`
- Modify: `scripts/extract-mdt.mjs`
- Modify: `scripts/__fixtures__/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseTocVersion(tocText) -> string | null`. `src/data/generated/mdt.json`, shaped
  `{ "version": string | null, "expansion": string }`.

- [ ] **Step 1: Copy the real `.toc` in as a fixture**

The file is 27 lines. Copy it verbatim — it is the input whose shape the parser claims to read.

```bash
cp "$MDT_PATH/MythicDungeonTools.toc" scripts/__fixtures__/MythicDungeonTools.toc
```

`MDT_PATH` defaults to `D:\jeux\World of Warcraft\_retail_\Interface\AddOns\MythicDungeonTools`
(`scripts/config.mjs`). Confirm the copy contains `## Version: 6.2.2`.

- [ ] **Step 2: Write the failing test**

Create `scripts/mdt-version.test.mjs`:

```js
// ABOUTME: Tests the MDT addon version parser against the real .toc the addon ships.
// ABOUTME: The version is the only provenance the generated data carries.

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseTocVersion } from './mdt-version.mjs'

const realToc = fs.readFileSync(
  fileURLToPath(new URL('./__fixtures__/MythicDungeonTools.toc', import.meta.url)),
  'utf8',
)

describe('parseTocVersion', () => {
  it('reads the version out of the real addon .toc', () => {
    expect(parseTocVersion(realToc)).toBe('6.2.2')
  })

  it('takes the ## Version line, not a Version word appearing elsewhere', () => {
    // `## Interface:` precedes it and `## X-Curse-Project-ID:` follows: order must not matter.
    const shuffled = ['## Title: MDT', '## Version: 7.0.1', '## Interface: 120100'].join('\n')
    expect(parseTocVersion(shuffled)).toBe('7.0.1')
  })

  it('ignores a commented-out directive, which is a plain # in a .toc', () => {
    expect(parseTocVersion('# ## Version: 1.2.3\n## Version: 4.5.6')).toBe('4.5.6')
  })

  it('returns null rather than throwing when no version is declared', () => {
    expect(parseTocVersion('## Title: MDT')).toBeNull()
    expect(parseTocVersion('')).toBeNull()
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run scripts/mdt-version.test.mjs`
Expected: FAIL — `Failed to resolve import "./mdt-version.mjs"`.

- [ ] **Step 4: Write the module**

Create `scripts/mdt-version.mjs`:

```js
// ABOUTME: Reads the MDT addon version out of its .toc, so generated data carries its provenance.
// ABOUTME: Pure, so it can be tested against the real .toc without a WoW install.

/**
 * The addon version declared in a `.toc`, or null when none is.
 *
 * A `.toc` directive is `## Key: value`; a line starting with a single `#` is a comment, which is
 * why the anchor requires the double hash. Returns null rather than throwing: extraction must
 * not fail over a metadata line, and a missing version is reported, not fatal.
 */
export function parseTocVersion(tocText) {
  const match = /^##\s*Version:\s*(.+?)\s*$/m.exec(String(tocText ?? ''))
  return match ? match[1] : null
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npx vitest run scripts/mdt-version.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 6: Write `mdt.json` from the extraction**

In `scripts/extract-mdt.mjs`, add to the imports:

```js
import { GENERATED_DIR, MDT_EXPANSION, MDT_PATH, SEASON_DUNGEONS } from './config.mjs'
import { parseDungeon, summarise } from './mdt-dungeon.mjs'
import { parseTocVersion } from './mdt-version.mjs'
```

Add this function beside `readDungeonSource`:

```js
/**
 * The addon version, for the record.
 *
 * Nothing else in the repository says which MDT produced the generated files, which is what
 * makes an update impossible to name afterwards. A `.toc` we cannot read costs a warning, never
 * the extraction: this is provenance, not data.
 */
function readAddonVersion() {
  const toc = path.join(MDT_PATH, 'MythicDungeonTools.toc')
  if (!fs.existsSync(toc)) {
    console.warn(`  ! ${toc} not found: MDT version recorded as null`)
    return null
  }
  const version = parseTocVersion(fs.readFileSync(toc, 'utf8'))
  if (!version) console.warn(`  ! no "## Version:" line in ${toc}: recorded as null`)
  return version
}
```

At the end of `main()`, after `dungeons.json` is written:

```js
  const version = readAddonVersion()
  fs.writeFileSync(
    path.join(GENERATED_DIR, 'mdt.json'),
    `${JSON.stringify({ version, expansion: MDT_EXPANSION }, null, 2)}\n`,
    'utf8',
  )
  console.log(`\n${index.length} dungeons written to ${path.relative(process.cwd(), GENERATED_DIR)}`)
  console.log(`MDT ${version ?? 'version unknown'} / ${MDT_EXPANSION}`)
```

Keep the existing `console.log` about dungeons written; only add the version line after it.

- [ ] **Step 7: Run the extraction and check what moved**

Run: `npm run extract`
Then: `git status --short src/data/generated/`

Expected: `?? src/data/generated/mdt.json` and **nothing else**. Any other file appearing in that
list means the extraction is not reproducible from the committed data, which is a finding to
report before continuing — not something to commit past.

Confirm the content:

```bash
cat src/data/generated/mdt.json
```

Expected: `{ "version": "6.2.2", "expansion": "Midnight" }`.

- [ ] **Step 8: Verify the app ignores the new file**

`src/lib/data.ts:29` globs `../data/generated/*.json` eagerly, and `:34-39` keeps only modules
carrying an `enemies` array — so `mdt.json` cannot be mistaken for a dungeon. Prove it rather
than trust it:

Run: `npm test`
Expected: PASS, whole suite, no new failures.

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 9: Document the fixture**

Append to `scripts/__fixtures__/README.md`:

```markdown
## MythicDungeonTools.toc

The addon's own `.toc`, copied verbatim from a 6.2.2 install. It is the input
`parseTocVersion` claims to read, and the version line's exact spelling — `## Version:`, double
hash, one space — is the whole subject of that parser. A hand-written stand-in would assert our
guess about a file format instead of testing it.
```

- [ ] **Step 10: Commit**

```bash
git add scripts/mdt-version.mjs scripts/mdt-version.test.mjs scripts/__fixtures__/MythicDungeonTools.toc scripts/__fixtures__/README.md scripts/extract-mdt.mjs src/data/generated/mdt.json
git commit -F - <<'MSG'
Record which MDT version produced the generated data

Nothing said which addon version the generated files came from, so an update
could not be named after the fact: the old version is overwritten and its
provenance goes with it. Written now, while 6.2.2 is still installed, because
this is the last moment it can be recorded truthfully.

A separate mdt.json rather than a field in dungeons.json, which is an array
whose shape src/lib/data.ts consumes. No timestamp: a re-extraction of
unchanged data must not produce a diff. The app's glob keeps only modules
carrying an enemies array, so the new file cannot be read as a dungeon.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 2: Commit a real two-version pair, and diff one dungeon

**Files:**
- Create: `scripts/__fixtures__/altar-of-fangs.with-affix.json`
- Create: `scripts/__fixtures__/altar-of-fangs.without-affix.json`
- Create: `scripts/mdt-diff.mjs`
- Create: `scripts/mdt-diff.test.mjs`
- Modify: `scripts/__fixtures__/README.md`

**Interfaces:**
- Consumes: the `Finding` shape above.
- Produces: `diffDungeon(before, after) -> Finding[]`. `before` may be `null`, meaning the dungeon
  did not exist at the base revision.

- [ ] **Step 1: Extract the two real versions out of git**

Commit `e520646` ("Drop the seasonal affix from the extracted data") removed spell `1221063` from
11 mobs of Altar of Fangs. Both sides are real output of the real pipeline, and the change is
exactly the case severity 1 exists for.

```bash
git show e520646^:src/data/generated/altar-of-fangs.json > scripts/__fixtures__/altar-of-fangs.with-affix.json
git show e520646:src/data/generated/altar-of-fangs.json > scripts/__fixtures__/altar-of-fangs.without-affix.json
```

Confirm the pair differs the way it should:

```bash
grep -c 1221063 scripts/__fixtures__/altar-of-fangs.with-affix.json
grep -c 1221063 scripts/__fixtures__/altar-of-fangs.without-affix.json
```

Expected: `11` then `0`.

- [ ] **Step 2: Write the failing test**

Create `scripts/mdt-diff.test.mjs`:

```js
// ABOUTME: Tests the semantic diff of two generated snapshots against two real versions.
// ABOUTME: Pins that coordinates never surface and that lost spells always do.

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { diffDungeon } from './mdt-diff.mjs'

const read = (name) =>
  JSON.parse(fs.readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), 'utf8'))

/** Two real versions of the same dungeon: 11 mobs lost spell 1221063 between them. */
const withAffix = read('altar-of-fangs.with-affix.json')
const withoutAffix = read('altar-of-fangs.without-affix.json')

describe('diffDungeon', () => {
  it('reports every mob that lost a spell', () => {
    const findings = diffDungeon(withAffix, withoutAffix)
    const lost = findings.filter((f) => f.what.includes('lost spell 1221063'))
    expect(lost).toHaveLength(11)
    expect(lost[0].dungeon).toBe('altar-of-fangs')
    expect(lost[0].severity).toBe(6)
  })

  it('reports a gained spell in the other direction', () => {
    const findings = diffDungeon(withoutAffix, withAffix)
    expect(findings.filter((f) => f.what.includes('gained spell 1221063'))).toHaveLength(11)
  })

  it('finds nothing at all between a snapshot and itself', () => {
    expect(diffDungeon(withAffix, withAffix)).toEqual([])
  })

  it('never surfaces a coordinate', () => {
    // Clone x/y are floats that move on every MDT recapture; reporting them buries the rest.
    const serialised = JSON.stringify(diffDungeon(withAffix, withoutAffix))
    expect(serialised).not.toMatch(/\d+\.\d{6}/)
  })

  it('reports an added and a removed mob by id and name', () => {
    // Scenario built over a real snapshot: the input's shape is the fixture's, the change is ours.
    const trimmed = { ...withoutAffix, enemies: withoutAffix.enemies.slice(1) }
    const gone = withoutAffix.enemies[0]

    const removed = diffDungeon(withoutAffix, trimmed)
    expect(removed.some((f) => f.subject === `${gone.id} ${gone.name}` && f.what.includes('left'))).toBe(true)

    const added = diffDungeon(trimmed, withoutAffix)
    expect(added.some((f) => f.subject === `${gone.id} ${gone.name}` && f.what.includes('is new'))).toBe(true)
  })

  it('reports a changed force total, and says both values', () => {
    const richer = { ...withoutAffix, totalCount: withoutAffix.totalCount + 30 }
    const findings = diffDungeon(withoutAffix, richer)
    const forces = findings.find((f) => f.what.includes('totalCount'))
    expect(forces.detail).toContain(String(withoutAffix.totalCount))
    expect(forces.detail).toContain(String(withoutAffix.totalCount + 30))
  })

  it('reports a changed textureFolder as the map rebuild it forces', () => {
    const moved = { ...withoutAffix, textureFolder: 'AltarOfFangsRevamp' }
    const findings = diffDungeon(withoutAffix, moved)
    expect(findings.find((f) => f.what.includes('textureFolder')).action).toContain('build:maps')
  })

  it('counts clones without naming where they are', () => {
    const first = withoutAffix.enemies[0]
    const fewer = {
      ...withoutAffix,
      enemies: [{ ...first, clones: first.clones.slice(1) }, ...withoutAffix.enemies.slice(1)],
    }
    const findings = diffDungeon(withoutAffix, fewer)
    const clones = findings.find((f) => f.what.includes('clone'))
    expect(clones.detail).toContain(`${first.clones.length}`)
    expect(clones.detail).toContain(`${first.clones.length - 1}`)
  })

  it('treats a missing base as a brand-new dungeon, in one finding', () => {
    const findings = diffDungeon(null, withoutAffix)
    expect(findings).toHaveLength(1)
    expect(findings[0].what).toContain('new dungeon')
    expect(findings[0].severity).toBe(4)
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run scripts/mdt-diff.test.mjs`
Expected: FAIL — `Failed to resolve import "./mdt-diff.mjs"`.

- [ ] **Step 4: Write the module**

Create `scripts/mdt-diff.mjs`:

```js
// ABOUTME: Compares two snapshots of the generated data and says what changed, semantically.
// ABOUTME: Pure, and deliberately blind to coordinates, which move on every MDT recapture.

/**
 * Comparing two generated snapshots.
 *
 * `git diff` is unusable on these files: clone x/y are floats that MDT rewrites on every
 * recapture, so a textual diff is mostly noise about positions nobody asked about. Everything
 * here is therefore either a set comparison on ids or a scalar comparison on a named field, and
 * no coordinate is ever read.
 */

const META_FIELDS = ['mdtIndex', 'mapID', 'teleportId', 'totalCount', 'sublevelCount', 'englishName']

const finding = (f) => ({ severity: 6, ...f })

/** Set difference on ids, order-independent and hole-tolerant. */
function missing(from, against) {
  const have = new Set(against)
  return [...new Set(from)].filter((id) => !have.has(id))
}

const subjectOf = (enemy) => `${enemy.id} ${enemy.name}`

/** Packs are the distinct `g` values a mob's clones belong to; nulls are ungrouped clones. */
function packsOf(enemy) {
  return new Set((enemy.clones ?? []).map((c) => c.g).filter((g) => g !== null && g !== undefined))
}

function diffOneMob(slug, before, after) {
  const out = []
  const subject = subjectOf(after)

  const beforeSpells = (before.spells ?? []).map((s) => s.id)
  const afterSpells = (after.spells ?? []).map((s) => s.id)
  for (const id of missing(beforeSpells, afterSpells)) {
    out.push(finding({
      dungeon: slug,
      subject,
      what: `lost spell ${id}`,
      action: `check content/${slug}/ for a note on ${id}: it no longer renders`,
    }))
  }
  for (const id of missing(afterSpells, beforeSpells)) {
    out.push(finding({ dungeon: slug, subject, what: `gained spell ${id}` }))
  }

  for (const cc of missing(before.cc ?? [], after.cc ?? [])) {
    out.push(finding({ dungeon: slug, subject, what: `is no longer subject to ${cc}` }))
  }
  for (const cc of missing(after.cc ?? [], before.cc ?? [])) {
    out.push(finding({ dungeon: slug, subject, what: `is now subject to ${cc}` }))
  }

  for (const field of ['count', 'health', 'level', 'isBoss']) {
    if (before[field] !== after[field]) {
      out.push(finding({
        dungeon: slug,
        subject,
        what: `${field} changed`,
        detail: `${before[field]} -> ${after[field]}`,
      }))
    }
  }

  const beforeClones = (before.clones ?? []).length
  const afterClones = (after.clones ?? []).length
  if (beforeClones !== afterClones) {
    out.push(finding({
      dungeon: slug,
      subject,
      what: 'clone count changed',
      detail: `${beforeClones} -> ${afterClones} clones`,
    }))
  }

  const beforePacks = packsOf(before)
  const afterPacks = packsOf(after)
  if (beforePacks.size !== afterPacks.size || [...beforePacks].some((g) => !afterPacks.has(g))) {
    out.push(finding({
      dungeon: slug,
      subject,
      what: 'pack grouping changed',
      detail: `packs ${[...beforePacks].sort((a, b) => a - b).join(',')} -> ${[...afterPacks].sort((a, b) => a - b).join(',')}`,
    }))
  }

  return out
}

/**
 * What changed in one dungeon between two snapshots.
 *
 * A null `before` means the dungeon is new at this revision: one finding says so, and comparing
 * its mobs against nothing would only restate it several hundred times.
 */
export function diffDungeon(before, after) {
  const slug = after.slug
  if (!before) {
    return [finding({
      severity: 4,
      dungeon: slug,
      subject: after.englishName,
      what: 'is a new dungeon: no card exists for any of its mobs',
      detail: `${after.enemies.length} mobs`,
      action: 'run npm run scaffold, then write the cards',
    })]
  }

  const out = []

  for (const field of META_FIELDS) {
    if (before[field] !== after[field]) {
      out.push(finding({
        dungeon: slug,
        subject: after.englishName,
        what: `${field} changed`,
        detail: `${before[field]} -> ${after[field]}`,
      }))
    }
  }

  if (before.textureFolder !== after.textureFolder) {
    out.push(finding({
      dungeon: slug,
      subject: after.englishName,
      what: 'textureFolder changed',
      detail: `${before.textureFolder} -> ${after.textureFolder}`,
      action: 'run npm run build:maps: the committed map no longer matches the tiles',
    }))
  }

  const beforeById = new Map((before.enemies ?? []).map((e) => [e.id, e]))
  const afterById = new Map((after.enemies ?? []).map((e) => [e.id, e]))

  for (const [id, enemy] of beforeById) {
    if (!afterById.has(id)) {
      out.push(finding({
        dungeon: slug,
        subject: subjectOf(enemy),
        what: 'left the dungeon',
        action: `its card in content/${slug}/ is now dead weight`,
      }))
    }
  }
  for (const [id, enemy] of afterById) {
    if (!beforeById.has(id)) {
      out.push(finding({
        severity: 4,
        dungeon: slug,
        subject: subjectOf(enemy),
        what: 'is new in this dungeon',
        action: 'run npm run scaffold, then write the card',
      }))
      continue
    }
    out.push(...diffOneMob(slug, beforeById.get(id), enemy))
  }

  return out
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npx vitest run scripts/mdt-diff.test.mjs`
Expected: PASS, 9 tests.

- [ ] **Step 6: Document the fixtures**

Append to `scripts/__fixtures__/README.md`:

```markdown
## altar-of-fangs.with-affix.json / .without-affix.json

Two real versions of one generated dungeon, taken from both sides of commit `e520646`, which
dropped the seasonal affix from the extraction. Eleven mobs lose spell `1221063` between them.

Both sides are output of the real pipeline, and the change they carry is exactly the case the
report exists for: a spell leaving a mob takes the card's note off the site with it. A
hand-written pair would encode our own idea of what an MDT update does to a dungeon, which is the
one thing a differ must not be tested against.
```

- [ ] **Step 7: Commit**

```bash
git add scripts/mdt-diff.mjs scripts/mdt-diff.test.mjs scripts/__fixtures__/altar-of-fangs.with-affix.json scripts/__fixtures__/altar-of-fangs.without-affix.json scripts/__fixtures__/README.md
git commit -F - <<'MSG'
Diff two snapshots of the generated data semantically

git diff cannot answer what an MDT update changed: clone coordinates are floats
rewritten on every recapture, so the textual diff is almost entirely positions
nobody asked about. This compares ids as sets and named fields as scalars, and
reads no coordinate at all -- a test asserts that no six-decimal float can
appear in the output.

Tested against two real versions of one dungeon, taken from both sides of
e520646, where eleven mobs lose the same spell. That is the real pipeline's
output on both sides, and the change it carries is the case the whole report
exists for.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 3: Diff the spell and creature labels

**Files:**
- Modify: `scripts/mdt-diff.mjs`
- Modify: `scripts/mdt-diff.test.mjs`

**Interfaces:**
- Consumes: `Finding`.
- Produces: `diffSpells(before, after, annotatedIds) -> Finding[]`, where `annotatedIds` is a
  `Set<number>` of spell ids some card annotates. Findings about an annotated spell are severity 3;
  the rest are severity 6.

- [ ] **Step 1: Write the failing test**

Append to `scripts/mdt-diff.test.mjs`:

```js
import { diffSpells } from './mdt-diff.mjs'
import realSpells from '../src/data/generated/spells.json'

describe('diffSpells', () => {
  // The real committed table is the input shape; each case constructs the change it is about.
  // spells.json is 560 KB, so a second copy as a fixture would cost more than it proves.
  const anyId = Number(Object.keys(realSpells)[0])

  it('finds nothing between the real table and itself', () => {
    expect(diffSpells(realSpells, realSpells, new Set())).toEqual([])
  })

  it('raises a changed description to severity 3 when a card annotates the spell', () => {
    const after = structuredClone(realSpells)
    after[anyId].text.en.description = 'Something else entirely.'

    const [finding] = diffSpells(realSpells, after, new Set([anyId]))
    expect(finding.severity).toBe(3)
    expect(finding.what).toContain('description')
    expect(finding.detail).toContain('Something else entirely.')
    expect(finding.action).toMatch(/note/)
  })

  it('leaves a changed description at severity 6 when no card annotates it', () => {
    const after = structuredClone(realSpells)
    after[anyId].text.en.description = 'Something else entirely.'
    expect(diffSpells(realSpells, after, new Set())[0].severity).toBe(6)
  })

  it('reports a changed cast time, which notes quote as often as damage', () => {
    const after = structuredClone(realSpells)
    after[anyId].text.en.castTime = '9 sec cast'
    expect(diffSpells(realSpells, after, new Set([anyId]))[0].what).toContain('castTime')
  })

  it('reports a spell that left the table', () => {
    const after = structuredClone(realSpells)
    delete after[anyId]
    expect(diffSpells(realSpells, after, new Set())[0].what).toContain('left the data')
  })

  it('says nothing about a spell that is merely new: the mob diff already named it', () => {
    const before = structuredClone(realSpells)
    delete before[anyId]
    expect(diffSpells(before, realSpells, new Set())).toEqual([])
  })

  it('names the language a change happened in', () => {
    const after = structuredClone(realSpells)
    after[anyId].text.fr.description = 'Autre chose.'
    expect(diffSpells(realSpells, after, new Set([anyId]))[0].detail).toContain('fr')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run scripts/mdt-diff.test.mjs`
Expected: FAIL — `diffSpells is not a function`.

- [ ] **Step 3: Implement `diffSpells`**

Append to `scripts/mdt-diff.mjs`:

```js
/** The tooltip fields a card's note quotes, and which therefore date it when they move. */
const TEXT_FIELDS = ['name', 'castTime', 'description']

/**
 * What changed in the spell table.
 *
 * A spell **appearing** is not reported: the mob diff already says which mob gained it, which is
 * the actionable half. A spell **leaving** is reported, because a note may still point at it.
 *
 * `annotatedIds` carries the spell ids some card annotates. A tooltip that moves under a note is
 * severity 3 — the note quotes numbers from it — while the same change on an unannotated spell is
 * a fact about the data and nothing more.
 */
export function diffSpells(before, after, annotatedIds) {
  const out = []

  for (const id of Object.keys(before)) {
    const annotated = annotatedIds.has(Number(id))
    const severity = annotated ? 3 : 6

    if (!after[id]) {
      out.push({
        severity,
        dungeon: '',
        subject: `spell ${id}`,
        what: 'left the data',
        action: annotated ? 'a card annotates it: the note no longer renders' : undefined,
      })
      continue
    }

    for (const lang of Object.keys(before[id].text ?? {})) {
      const was = before[id].text[lang] ?? {}
      const is = after[id].text?.[lang] ?? {}
      for (const field of TEXT_FIELDS) {
        if (was[field] === is[field]) continue
        out.push({
          severity,
          dungeon: '',
          subject: `spell ${id}`,
          what: `${field} changed`,
          detail: `[${lang}] ${was[field] ?? '(none)'} -> ${is[field] ?? '(none)'}`,
          action: annotated ? 'reread the note: it may quote numbers from the old text' : undefined,
        })
      }
    }
  }

  return out
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run scripts/mdt-diff.test.mjs`
Expected: PASS, 16 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/mdt-diff.mjs scripts/mdt-diff.test.mjs
git commit -F - <<'MSG'
Report a tooltip that moved under a card's note

Cards quote tooltip numbers -- "29k Nature every 3 s", "145k to everyone". A
rebalance rewrites the Wowhead description and nothing else, so the note goes
quietly wrong and no other signal exists. Comparing description and cast time
across versions is the only way to catch it.

Graded by whether a card actually annotates the spell: under a note it is
severity 3 and asks for a reread, elsewhere it is a fact about the data. A
spell merely appearing is left out, since the mob diff already names the mob
that gained it.

The test reads the real committed spells.json as its input shape and builds
each change over it. A second copy as a fixture would cost 560 KB and prove
nothing the real table does not.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 4: Read a card's facts

**Files:**
- Create: `scripts/card-audit.mjs`
- Create: `scripts/card-audit.test.mjs`

**Interfaces:**
- Consumes: `Finding`.
- Produces:
  - `readCardFacts(text, file) -> { file, npcId, locale, spells: [{id, note, tag}], written }`
  - `cardLocale(fileName) -> string` (the base language for a file with no locale suffix)

- [ ] **Step 1: Write the failing test**

Create `scripts/card-audit.test.mjs`:

```js
// ABOUTME: Tests reading a card's facts and auditing cards against the current MDT data.
// ABOUTME: Runs on the real committed cards under content/__fixtures__/.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { cardLocale, readCardFacts } from './card-audit.mjs'

const FIXTURES = fileURLToPath(new URL('../content/__fixtures__/', import.meta.url))
const read = (name) => fs.readFileSync(path.join(FIXTURES, name), 'utf8')

describe('cardLocale', () => {
  it('reads the locale suffix a translation carries', () => {
    expect(cardLocale('263109-ulateks-chosen.fr.md')).toBe('fr')
  })

  it('calls a file with no suffix the base language', () => {
    expect(cardLocale('263109-ulateks-chosen.md')).toBe('en')
  })

  it('is not fooled by a dot inside the slug', () => {
    expect(cardLocale('1-mob.name.md')).toBe('en')
  })
})

describe('readCardFacts', () => {
  it('reads the npcId and the annotated spells of a real card', () => {
    const facts = readCardFacts(read('263109-ulateks-chosen.md'), 'x.md')
    expect(facts.npcId).toBeGreaterThan(0)
    expect(facts.spells.every((s) => Number.isInteger(s.id))).toBe(true)
  })

  it('counts a card with a threat, a trap, prose or one annotated spell as written', () => {
    // Mirrors src/lib/content.ts:283-288. The two must not drift apart.
    expect(readCardFacts(read('263109-ulateks-chosen.md'), 'x.md').written).toBe(true)
  })

  it('counts a freshly scaffolded card as unwritten', () => {
    const stub = ['---', 'npcId: 1', 'threat:', 'role:', 'trap:', '---', '', '<!-- Free prose -->', ''].join('\n')
    expect(readCardFacts(stub, 'x.md').written).toBe(false)
  })

  it('does not count tag: todo as judgement, which is what the scaffold writes', () => {
    const stub = ['---', 'npcId: 1', 'spells:', '  - id: 5', '    tag: todo', '    note:', '---', ''].join('\n')
    expect(readCardFacts(stub, 'x.md').written).toBe(false)
  })

  it('counts one real tag as judgement even with no note', () => {
    const card = ['---', 'npcId: 1', 'spells:', '  - id: 5', '    tag: kick', '---', ''].join('\n')
    expect(readCardFacts(card, 'x.md').written).toBe(true)
  })

  it('returns null for a file with no npcId rather than throwing', () => {
    expect(readCardFacts('---\nname: "x"\n---\n', 'x.md')).toBeNull()
  })

  it('returns null for unparseable frontmatter rather than throwing', () => {
    // A malformed card must not stop a report about eight dungeons.
    expect(readCardFacts('---\nnpcId: [unclosed\n---\n', 'x.md')).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run scripts/card-audit.test.mjs`
Expected: FAIL — `Failed to resolve import "./card-audit.mjs"`.

- [ ] **Step 3: Write the module**

Create `scripts/card-audit.mjs`:

```js
// ABOUTME: Reads what a content card claims, and audits those claims against the current data.
// ABOUTME: Pure: the caller supplies the file contents, so this is testable without a filesystem.

import { parse as parseYaml } from 'yaml'
import { WOWHEAD_LOCALES } from './config.mjs'

const BASE_LANG = WOWHEAD_LOCALES[0].lang

/** Locales a card may be suffixed with: the same list the fetch is configured for. */
const LOCALES = new Set(WOWHEAD_LOCALES.map((l) => l.lang))

/**
 * The language a card file is written in.
 *
 * `263109-ulateks-chosen.fr.md` is French; the same name without a suffix is the base language.
 * A dot inside the slug is not a locale, which is why the suffix is checked against the list
 * rather than merely being present.
 */
export function cardLocale(fileName) {
  const stem = fileName.replace(/\.md$/, '')
  const cut = stem.lastIndexOf('.')
  if (cut === -1) return BASE_LANG
  const suffix = stem.slice(cut + 1)
  return LOCALES.has(suffix) ? suffix : BASE_LANG
}

/**
 * What a card claims, or null when it claims nothing usable.
 *
 * `written` mirrors `isStub` in `src/lib/content.ts:283-288`, inverted: a card counts as written
 * once a human has put judgement in it — prose, a trap, a threat, or one annotated spell. The
 * rule is duplicated here because the app is TypeScript and this is a script; if one moves, the
 * other has to follow, and the test above says so.
 *
 * A card that cannot be parsed returns null rather than throwing: one malformed file must not
 * stop a report covering eight dungeons.
 */
export function readCardFacts(text, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!match) return null

  let data
  try {
    data = parseYaml(match[1])
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null

  const npcId = Number(data.npcId)
  if (!npcId) return null

  const spells = Array.isArray(data.spells)
    ? data.spells
        .filter((s) => s && Number(s.id))
        .map((s) => ({ id: Number(s.id), note: s.note ?? null, tag: s.tag ?? null }))
    : []

  const prose = text.slice(match[0].length).replace(/<!--[\s\S]*?-->/g, '').trim()
  const written = Boolean(
    prose ||
      data.trap ||
      data.threat ||
      spells.some((s) => s.note || (s.tag && s.tag !== 'todo')),
  )

  return { file, npcId, locale: cardLocale(file), spells, written }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run scripts/card-audit.test.mjs`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/card-audit.mjs scripts/card-audit.test.mjs
git commit -F - <<'MSG'
Read what a content card claims

The audit needs three things out of a card: which mob it is about, which spells
it annotates, and whether a human has put judgement in it. The last one has to
mirror isStub in src/lib/content.ts, which decides the same question for the
site; the rule is duplicated because that file is TypeScript and this is a
script, and a test names the line range so the two can be compared.

A card that will not parse returns null instead of throwing. One malformed file
must not stop a report covering eight dungeons -- the same reason the app warns
and skips rather than failing to render.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 5: Audit the cards against the current data

**Files:**
- Modify: `scripts/card-audit.mjs`
- Modify: `scripts/card-audit.test.mjs`

**Interfaces:**
- Consumes: `readCardFacts`, `Finding`.
- Produces: `auditDungeon(dungeon, cards) -> Finding[]`, where `cards` is the array of non-null
  `readCardFacts` results for that dungeon's folder. Also
  `annotatedSpellIds(cards) -> Set<number>`, taking one flat array of card facts across every
  dungeon and locale, which task 3's `diffSpells` consumes as its third argument.

- [ ] **Step 1: Write the failing test**

Append to `scripts/card-audit.test.mjs`. Merge the first line into the existing
`from './card-audit.mjs'` import at the top of the file rather than leaving two imports of the
same module:

```js
import { annotatedSpellIds, auditDungeon, cardLocale, readCardFacts } from './card-audit.mjs'
import realDungeon from '../src/data/generated/altar-of-fangs.json'

describe('auditDungeon', () => {
  const enemy = realDungeon.enemies.find((e) => e.spells.length >= 2)
  const cardFor = (extra) => ({
    file: `content/altar-of-fangs/${enemy.id}-mob.md`,
    npcId: enemy.id,
    locale: 'en',
    spells: [],
    written: true,
    ...extra,
  })

  it('reports a note on a spell the mob no longer has, at severity 1', () => {
    const cards = [cardFor({ spells: [{ id: 999999, note: 'kick this', tag: 'kick' }] })]
    const [finding] = auditDungeon(realDungeon, cards)
    expect(finding.severity).toBe(1)
    expect(finding.what).toContain('999999')
    expect(finding.file).toBe(cards[0].file)
  })

  it('says nothing about an un-annotated orphan id: there is no writing to lose', () => {
    const cards = [cardFor({ spells: [{ id: 999999, note: null, tag: 'todo' }] })]
    expect(auditDungeon(realDungeon, cards).filter((f) => f.severity === 1)).toEqual([])
  })

  it('reports a written card whose mob left the dungeon, at severity 1', () => {
    const cards = [cardFor({ npcId: 999999, written: true })]
    const [finding] = auditDungeon(realDungeon, cards)
    expect(finding.severity).toBe(1)
    expect(finding.what).toContain('no mob')
  })

  it('demotes the same card to severity 5 when it carries no writing', () => {
    // A stub whose mob left is clutter, not a loss. Severity is what tells the two apart.
    const cards = [cardFor({ npcId: 999999, written: false })]
    const [finding] = auditDungeon(realDungeon, cards)
    expect(finding.severity).toBe(5)
    expect(finding.action).toContain('every other language')
  })

  it('reports a written card that has un-annotated spells, at severity 2', () => {
    const cards = [cardFor({ spells: [{ id: enemy.spells[0].id, note: 'x', tag: 'kick' }] })]
    const findings = auditDungeon(realDungeon, cards).filter((f) => f.severity === 2)
    expect(findings).toHaveLength(1)
    expect(findings[0].detail).toContain(String(enemy.spells[1].id))
  })

  it('leaves an unwritten card alone: it is scaffolding, not incomplete writing', () => {
    const cards = [cardFor({ written: false, spells: [] })]
    expect(auditDungeon(realDungeon, cards).filter((f) => f.severity === 2)).toEqual([])
  })

  it('reports every mob with no card at all, at severity 4', () => {
    const findings = auditDungeon(realDungeon, []).filter((f) => f.severity === 4)
    const mobs = new Set(realDungeon.enemies.map((e) => e.id))
    expect(findings).toHaveLength(mobs.size)
    expect(findings[0].action).toContain('scaffold')
  })

  it('reports a translation whose mob left, so the .fr.md is not forgotten', () => {
    const cards = [
      cardFor({ npcId: 999999 }),
      cardFor({ npcId: 999999, locale: 'fr', file: 'content/altar-of-fangs/999999-mob.fr.md' }),
    ]
    const files = auditDungeon(realDungeon, cards).filter((f) => f.severity === 1).map((f) => f.file)
    expect(files).toContain('content/altar-of-fangs/999999-mob.fr.md')
  })

  it('counts one card per mob, whatever its locale, when looking for missing cards', () => {
    const covered = realDungeon.enemies.map((e) =>
      cardFor({ npcId: e.id, file: `content/altar-of-fangs/${e.id}-mob.md`, spells: [], written: true }),
    )
    expect(auditDungeon(realDungeon, covered).filter((f) => f.severity === 4)).toEqual([])
  })
})

describe('annotatedSpellIds', () => {
  it('collects the ids any card annotates, across dungeons and locales', () => {
    const ids = annotatedSpellIds([
      { file: 'a.md', npcId: 1, locale: 'en', spells: [{ id: 11, note: 'x', tag: null }], written: true },
      { file: 'b.fr.md', npcId: 2, locale: 'fr', spells: [{ id: 22, note: null, tag: 'kick' }], written: true },
      { file: 'c.md', npcId: 3, locale: 'en', spells: [{ id: 33, note: null, tag: 'todo' }], written: false },
    ])
    expect([...ids].sort((a, b) => a - b)).toEqual([11, 22])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run scripts/card-audit.test.mjs`
Expected: FAIL — `auditDungeon is not a function`.

- [ ] **Step 3: Implement the audit**

Append to `scripts/card-audit.mjs`:

```js
/** A spell carries writing when it has a note, or a tag that is not the scaffold's placeholder. */
const isAnnotated = (spell) => Boolean(spell.note || (spell.tag && spell.tag !== 'todo'))

/**
 * Every spell id some card annotates.
 *
 * `diffSpells` grades a moved tooltip by this set: under a note the change dates the writing,
 * elsewhere it is only a fact about the data.
 */
export function annotatedSpellIds(cards) {
  const ids = new Set()
  for (const card of cards) {
    for (const spell of card.spells) if (isAnnotated(spell)) ids.add(spell.id)
  }
  return ids
}

/**
 * What the current data costs the cards of one dungeon.
 *
 * Severity 1 is writing the site has already stopped showing: `MobCard.tsx:49` renders a mob's
 * spells from the MDT data and looks each note up by id, so an id the data dropped takes its note
 * out of the page with no diagnostic anywhere. The same holds for a whole card whose mob left.
 *
 * Severity 2 is the opposite direction: a card a human has written, which the data has since
 * given spells nobody has annotated.
 */
export function auditDungeon(dungeon, cards) {
  const out = []
  const slug = dungeon.slug
  const byId = new Map(dungeon.enemies.map((e) => [e.id, e]))

  for (const card of cards) {
    const enemy = byId.get(card.npcId)

    if (!enemy) {
      // A written card losing its mob is writing lost; a stub losing its mob is only clutter.
      // The design lists the situation at both severities, and `written` is what separates them.
      out.push(
        card.written
          ? {
              severity: 1,
              dungeon: slug,
              subject: `npcId ${card.npcId}`,
              what: 'is claimed by a written card, but no mob in the dungeon carries it',
              action: 'the card never renders: move its writing or delete the file',
              file: card.file,
            }
          : {
              severity: 5,
              dungeon: slug,
              subject: `npcId ${card.npcId}`,
              what: 'is claimed by an unwritten card, and no mob in the dungeon carries it',
              action: 'delete the file, and its sibling in every other language',
              file: card.file,
            },
      )
      continue
    }

    const known = new Set(enemy.spells.map((s) => s.id))
    for (const spell of card.spells) {
      if (known.has(spell.id) || !isAnnotated(spell)) continue
      out.push({
        severity: 1,
        dungeon: slug,
        subject: `${enemy.id} ${enemy.name}`,
        what: `annotates spell ${spell.id}, which the mob no longer has`,
        detail: spell.note ? `note: ${spell.note}` : `tag: ${spell.tag}`,
        action: 'the note no longer renders: move it to the right spell or drop it',
        file: card.file,
      })
    }

    if (!card.written) continue
    const annotated = new Set(card.spells.filter(isAnnotated).map((s) => s.id))
    const bare = enemy.spells.map((s) => s.id).filter((id) => !annotated.has(id))
    if (bare.length) {
      out.push({
        severity: 2,
        dungeon: slug,
        subject: `${enemy.id} ${enemy.name}`,
        what: `is written but leaves ${bare.length} spell(s) un-annotated`,
        detail: `spells ${bare.join(', ')}`,
        action: 'they render with their Wowhead description alone',
        file: card.file,
      })
    }
  }

  const covered = new Set(cards.map((c) => c.npcId))
  for (const enemy of dungeon.enemies) {
    if (covered.has(enemy.id)) continue
    out.push({
      severity: 4,
      dungeon: slug,
      subject: `${enemy.id} ${enemy.name}`,
      what: 'has no card in any language',
      action: 'run npm run scaffold, then write it',
    })
  }

  return out
}
```

Note on the last loop: `dungeon.enemies` can list the same npcId twice (MDT variants), and
`content-stub.mjs` already writes one card per id. Deduplicate before reporting:

```js
  const covered = new Set(cards.map((c) => c.npcId))
  const reported = new Set()
  for (const enemy of dungeon.enemies) {
    if (covered.has(enemy.id) || reported.has(enemy.id)) continue
    reported.add(enemy.id)
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run scripts/card-audit.test.mjs`
Expected: PASS, 20 tests. The "one card per mob" test is what catches a missing deduplication.

- [ ] **Step 5: Commit**

```bash
git add scripts/card-audit.mjs scripts/card-audit.test.mjs
git commit -F - <<'MSG'
Audit the cards against the data they describe

Severity 1 is writing the site has already stopped showing. MobCard renders a
mob's spells from the MDT data and looks each note up by id, so an id the data
dropped takes its note out of the page silently; a card whose mob left the
dungeon never renders at all. Neither leaves a trace anywhere today.

Severity 2 runs the other way: a card a human has written, which the data has
since given spells nobody annotated. An unwritten card is left alone -- it is
scaffolding, not incomplete writing -- and an orphaned id carrying no note is
left alone too, because there is nothing to lose.

Translations are audited as their own files, so a dead .fr.md is named rather
than inferred.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 6: Refresh the `# auto` marker lines

**Files:**
- Create: `scripts/card-auto-fields.mjs`
- Create: `scripts/card-auto-fields.test.mjs`

**Interfaces:**
- Consumes: `Finding`.
- Produces: `refreshAutoFields(text, enemy) -> { text, changes: [{field, before, after}] }`, plus
  `autoFieldFindings(text, enemy, file, slug) -> Finding[]` for the cases it declines to apply.

- [ ] **Step 1: Write the failing test**

Create `scripts/card-auto-fields.test.mjs`:

```js
// ABOUTME: Tests the in-place refresh of a card's `# auto` marker lines.
// ABOUTME: Pins the narrow rule: marked values only, never a line added or removed.

import { describe, expect, it } from 'vitest'
import { autoFieldFindings, refreshAutoFields } from './card-auto-fields.mjs'

const enemy = { id: 270306, name: 'Ritual Chieftain', count: 25, isBoss: false, cc: ['Stun', 'Root'] }

/** The exact shape content-stub.mjs writes, which is the only shape this may touch. */
const card = [
  '---',
  'npcId: 270306',
  'name: "Ritual Cheiftain"   # auto',
  'count: 20   # auto — forces per unit',
  '',
  '# TO FILL IN: low | medium | high | lethal',
  'threat: high',
  '# Applicable CC (auto, from MDT): Stun',
  '---',
  '',
  'Prose that mentions count: 20 and must not be touched.',
  '',
].join('\n')

describe('refreshAutoFields', () => {
  it('corrects a marked name in place, keeping the marker', () => {
    const { text } = refreshAutoFields(card, enemy)
    expect(text).toContain('name: "Ritual Chieftain"   # auto')
    expect(text).not.toContain('Cheiftain')
  })

  it('corrects a marked count, keeping the rest of its comment', () => {
    expect(refreshAutoFields(card, enemy).text).toContain('count: 25   # auto — forces per unit')
  })

  it('rewrites the CC comment when MDT changed what applies', () => {
    expect(refreshAutoFields(card, enemy).text).toContain('# Applicable CC (auto, from MDT): Stun, Root')
  })

  it('reports what it changed, field by field', () => {
    const { changes } = refreshAutoFields(card, enemy)
    expect(changes.map((c) => c.field).sort()).toEqual(['cc', 'count', 'name'])
    expect(changes.find((c) => c.field === 'count')).toMatchObject({ before: '20', after: '25' })
  })

  it('touches nothing outside a marked line', () => {
    const { text } = refreshAutoFields(card, enemy)
    expect(text).toContain('Prose that mentions count: 20 and must not be touched.')
    expect(text).toContain('threat: high')
    expect(text).toContain('# TO FILL IN: low | medium | high | lethal')
  })

  it('is idempotent: a second pass changes nothing', () => {
    const once = refreshAutoFields(card, enemy).text
    const twice = refreshAutoFields(once, enemy)
    expect(twice.text).toBe(once)
    expect(twice.changes).toEqual([])
  })

  it('leaves an unmarked field alone, however wrong it looks', () => {
    const unmarked = '---\nnpcId: 270306\nname: "Wrong"\n---\n'
    expect(refreshAutoFields(unmarked, enemy).text).toBe(unmarked)
  })

  it('leaves a card with no marked lines byte-for-byte identical', () => {
    const plain = '---\nnpcId: 270306\nthreat: high\n---\n\nProse.\n'
    expect(refreshAutoFields(plain, enemy).text).toBe(plain)
  })

  it('preserves CRLF line endings rather than normalising a hand-written file', () => {
    const crlf = card.replace(/\n/g, '\r\n')
    const { text } = refreshAutoFields(crlf, enemy)
    expect(text).toContain('name: "Ritual Chieftain"   # auto\r\n')
    expect(text.includes('\n\n')).toBe(false)
  })
})

describe('autoFieldFindings', () => {
  it('reports an isBoss line that should appear, and does not apply it', () => {
    const promoted = { ...enemy, isBoss: true }
    const findings = autoFieldFindings(card, promoted, 'content/x/1.md', 'x')
    expect(findings.some((f) => f.what.includes('isBoss'))).toBe(true)
    expect(refreshAutoFields(card, promoted).text).not.toContain('isBoss')
  })

  it('reports an isBoss line that should go away', () => {
    const withBoss = card.replace('npcId: 270306', 'npcId: 270306\nisBoss: true   # auto')
    const findings = autoFieldFindings(withBoss, enemy, 'content/x/1.md', 'x')
    expect(findings.some((f) => f.what.includes('isBoss'))).toBe(true)
  })

  it('says nothing when isBoss already agrees with the data', () => {
    expect(autoFieldFindings(card, enemy, 'content/x/1.md', 'x')).toEqual([])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run scripts/card-auto-fields.test.mjs`
Expected: FAIL — `Failed to resolve import "./card-auto-fields.mjs"`.

- [ ] **Step 3: Write the module**

Create `scripts/card-auto-fields.mjs`:

```js
// ABOUTME: Rewrites the `# auto` marker lines of a card in place, and nothing else.
// ABOUTME: Pure, so the narrow rule that keeps it safe is testable without a filesystem.

/**
 * Refreshing the mechanical lines of a hand-written card.
 *
 * `content-stub.mjs` writes some frontmatter with an `# auto` marker: the value came from MDT and
 * no human chose it. Those are the only lines here that may move, and only their value moves --
 * the marker and the rest of the comment survive byte for byte.
 *
 * The gain is small on purpose. `src/lib/content.ts:200-207` shows the app reads none of these
 * fields; a stale `count:` is a false comment, not a bug. What this buys is that the comment
 * stops lying to whoever reads the card next, and the narrow rule is what keeps that from turning
 * into a script editing writing it does not understand.
 *
 * A line that would have to be **added or removed** is never applied, only reported: inserting or
 * deleting a line in a hand-written file is a different act from correcting a value on one.
 */

/**
 * `name: "X"   # auto` and `count: 5   # auto — trailing comment` — value replaced, marker kept.
 *
 * Anchored to column 0 on purpose: `content-stub.mjs` also writes an indented `name:` under each
 * spell (its label from Wowhead), also marked `# auto`. That line is not this mob's name -- it
 * belongs to a spell this function never sees -- so a leading `\s*` here would overwrite every
 * spell's name with the mob's. Only the unindented, top-level `name:`/`count:` may match.
 */
const MARKED = /^((name|count):\s*)(.*?)(\s+#\s*auto\b.*)$/

/** The CC comment the scaffold writes, whose whole payload is the list. */
const CC_COMMENT = /^(\s*#\s*Applicable CC \(auto, from MDT\):\s*)(.*)$/

const quote = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** Splits on newlines while remembering each line's own ending, so CRLF files survive. */
function splitLines(text) {
  return text.split(/(?<=\n)/)
}

export function refreshAutoFields(text, enemy) {
  const changes = []
  const wanted = { name: quote(enemy.name), count: String(enemy.count) }

  const out = splitLines(text).map((raw) => {
    const eol = raw.match(/\r?\n$/)?.[0] ?? ''
    const line = raw.slice(0, raw.length - eol.length)

    const marked = MARKED.exec(line)
    if (marked) {
      const [, head, field, value, tail] = marked
      if (value === wanted[field]) return raw
      changes.push({ field, before: value.replace(/^"|"$/g, ''), after: wanted[field].replace(/^"|"$/g, '') })
      return `${head}${wanted[field]}${tail}${eol}`
    }

    const cc = CC_COMMENT.exec(line)
    if (cc) {
      const [, head, value] = cc
      const next = (enemy.cc ?? []).join(', ')
      if (value === next) return raw
      changes.push({ field: 'cc', before: value, after: next })
      return `${head}${next}${eol}`
    }

    return raw
  })

  return { text: out.join(''), changes }
}

/**
 * The marked lines this module declines to apply.
 *
 * Only `isBoss` can require an insertion or a deletion: the scaffold writes the line when the mob
 * is a boss and omits it otherwise, so a mob changing status needs a structural edit.
 */
export function autoFieldFindings(text, enemy, file, slug) {
  const declared = /^\s*isBoss:\s*true\s+#\s*auto\b/m.test(text)
  const actual = enemy.isBoss === true
  if (declared === actual) return []

  return [{
    severity: 6,
    dungeon: slug,
    subject: `${enemy.id} ${enemy.name}`,
    what: `isBoss disagrees with the data: the card says ${declared}, MDT says ${actual}`,
    action: actual
      ? 'add `isBoss: true   # auto` under npcId'
      : 'remove the `isBoss: true   # auto` line',
    file,
  }]
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run scripts/card-auto-fields.test.mjs`
Expected: PASS, 12 tests. The CRLF test is the one that fails if `splitLines` is replaced with a
plain `split('\n')`.

- [ ] **Step 5: Commit**

```bash
git add scripts/card-auto-fields.mjs scripts/card-auto-fields.test.mjs
git commit -F - <<'MSG'
Refresh a card's `# auto` lines without touching its writing

The scaffold marks the frontmatter no human chose with `# auto`. Those lines,
and only those, may be refreshed after an update, and only their value moves --
marker and trailing comment survive byte for byte, prose is never read.

The gain is deliberately small: content.ts reads none of these fields, so a
stale count is a false comment rather than a bug. The narrow rule is the point.
It is what keeps a convenience from becoming a script that edits writing it
does not understand, which is why isBoss -- the one field whose change needs a
line added or removed -- is reported instead of applied.

Line endings are preserved per line rather than normalised. A checkout with
CRLF working files must not come back as a whole-file diff.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 7: Render the report

**Files:**
- Create: `scripts/mdt-report-md.mjs`
- Create: `scripts/mdt-report-md.test.mjs`

**Interfaces:**
- Consumes: `Finding`.
- Produces:
  - `renderReport({ findings, base, from, to, date, releasesUrl }) -> string`
  - `summariseFindings(findings) -> [{ dungeon, counts: {1..6} }]`
  - `reportFileName({ date, from, to }) -> string`

- [ ] **Step 1: Write the failing test**

Create `scripts/mdt-report-md.test.mjs`:

```js
// ABOUTME: Tests the markdown rendering of a report and the name of the file it lands in.
// ABOUTME: Pins that an empty severity says so, rather than being left out.

import { describe, expect, it } from 'vitest'
import { renderReport, reportFileName, summariseFindings } from './mdt-report-md.mjs'

const findings = [
  { severity: 1, dungeon: 'altar-of-fangs', subject: '1 A', what: 'annotates spell 9 it no longer has', file: 'content/altar-of-fangs/1-a.md', action: 'move the note' },
  { severity: 4, dungeon: 'murder-row', subject: '2 B', what: 'has no card in any language', action: 'run npm run scaffold' },
  { severity: 6, dungeon: 'murder-row', subject: '3 C', what: 'count changed', detail: '4 -> 5' },
]

const context = { findings, base: 'HEAD', from: '6.2.2', to: '6.3.0', date: '2026-08-18', releasesUrl: 'https://github.com/Nnoggie/MythicDungeonTools/releases' }

describe('reportFileName', () => {
  it('names both versions and the date', () => {
    expect(reportFileName({ date: '2026-08-18', from: '6.2.2', to: '6.3.0' })).toBe('2026-08-18-6.2.2-to-6.3.0.md')
  })

  it('says unknown for a version it could not read, rather than leaving a hole', () => {
    expect(reportFileName({ date: '2026-08-18', from: null, to: '6.3.0' })).toBe('2026-08-18-unknown-to-6.3.0.md')
  })
})

describe('summariseFindings', () => {
  it('counts findings per dungeon per severity', () => {
    const rows = summariseFindings(findings)
    expect(rows.find((r) => r.dungeon === 'murder-row').counts[6]).toBe(1)
    expect(rows.find((r) => r.dungeon === 'altar-of-fangs').counts[1]).toBe(1)
  })
})

describe('renderReport', () => {
  const md = renderReport(context)

  it('names the base revision and both versions in the header', () => {
    expect(md).toContain('6.2.2')
    expect(md).toContain('6.3.0')
    expect(md).toContain('HEAD')
  })

  it('links the release notes for the human half of the analysis', () => {
    expect(md).toContain(context.releasesUrl)
  })

  it('writes every finding as a checkbox, so the report is the worklist', () => {
    expect(md).toContain('- [ ] ')
    expect((md.match(/- \[ \] /g) ?? [])).toHaveLength(3)
  })

  it('states that an empty severity is empty rather than leaving it out', () => {
    // A section left out cannot be told apart from a section forgotten.
    expect(md).toMatch(/Nothing/)
    for (const severity of [1, 2, 3, 4, 5, 6]) {
      expect(md).toContain(`## Severity ${severity}`)
    }
  })

  it('orders severities from 1, and groups by dungeon inside each', () => {
    expect(md.indexOf('## Severity 1')).toBeLessThan(md.indexOf('## Severity 4'))
    expect(md.indexOf('### altar-of-fangs')).toBeLessThan(md.indexOf('## Severity 4'))
  })

  it('carries a finding s file, detail and action into the entry', () => {
    expect(md).toContain('content/altar-of-fangs/1-a.md')
    expect(md).toContain('move the note')
    expect(md).toContain('4 -> 5')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run scripts/mdt-report-md.test.mjs`
Expected: FAIL — `Failed to resolve import "./mdt-report-md.mjs"`.

- [ ] **Step 3: Write the module**

Create `scripts/mdt-report-md.mjs`:

```js
// ABOUTME: Renders findings as the markdown report, and names the file it lands in.
// ABOUTME: Pure: every rule that produced a finding lives elsewhere, this only formats.

/** What each severity means, in the order the report presents them. */
const SEVERITIES = [
  [1, 'Writing already lost', 'The site has stopped showing this writing. Nothing else reports it.'],
  [2, 'Writing incomplete', 'A written card whose mob gained spells nobody has annotated.'],
  [3, 'Writing possibly stale', 'A tooltip moved under a note that may quote its numbers.'],
  [4, 'To write', 'New mobs and new dungeons, with no card yet.'],
  [5, 'Dead weight', 'Cards whose mob left MDT. Nothing breaks; the repository misstates itself.'],
  [6, 'Informational', 'What moved in the data. No action implied.'],
]

export function reportFileName({ date, from, to }) {
  return `${date}-${from ?? 'unknown'}-to-${to ?? 'unknown'}.md`
}

export function summariseFindings(findings) {
  const rows = new Map()
  for (const f of findings) {
    const key = f.dungeon || '(index)'
    if (!rows.has(key)) rows.set(key, { dungeon: key, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } })
    rows.get(key).counts[f.severity]++
  }
  return [...rows.values()].sort((a, b) => a.dungeon.localeCompare(b.dungeon))
}

function renderFinding(f) {
  const lines = [`- [ ] **${f.subject}** — ${f.what}`]
  if (f.detail) lines.push(`      ${f.detail}`)
  if (f.action) lines.push(`      → ${f.action}`)
  if (f.file) lines.push(`      \`${f.file}\``)
  return lines.join('\n')
}

export function renderReport({ findings, base, from, to, date, releasesUrl }) {
  const out = [
    `# MDT ${from ?? 'unknown'} → ${to ?? 'unknown'}`,
    '',
    `Generated on ${date}, comparing \`${base}\` against the working tree.`,
    '',
    `Release notes, for the half of the analysis no tool does: ${releasesUrl}`,
    '',
    '## Summary',
    '',
    '| Dungeon | 1 | 2 | 3 | 4 | 5 | 6 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ]

  for (const row of summariseFindings(findings)) {
    const c = row.counts
    out.push(`| ${row.dungeon} | ${c[1]} | ${c[2]} | ${c[3]} | ${c[4]} | ${c[5]} | ${c[6]} |`)
  }
  if (!findings.length) out.push('| — | 0 | 0 | 0 | 0 | 0 | 0 |')
  out.push('')

  for (const [severity, title, gloss] of SEVERITIES) {
    out.push(`## Severity ${severity} — ${title}`, '', gloss, '')

    const mine = findings.filter((f) => f.severity === severity)
    if (!mine.length) {
      out.push('Nothing at this severity.', '')
      continue
    }

    const byDungeon = new Map()
    for (const f of mine) {
      const key = f.dungeon || '(index)'
      if (!byDungeon.has(key)) byDungeon.set(key, [])
      byDungeon.get(key).push(f)
    }

    for (const key of [...byDungeon.keys()].sort((a, b) => a.localeCompare(b))) {
      out.push(`### ${key}`, '')
      for (const f of byDungeon.get(key)) out.push(renderFinding(f))
      out.push('')
    }
  }

  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run scripts/mdt-report-md.test.mjs`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/mdt-report-md.mjs scripts/mdt-report-md.test.mjs
git commit -F - <<'MSG'
Render the update report as a worklist

Findings arrive from four modules in one shape, and this is the only thing that
formats them: severity order, dungeon grouping, one checkbox per finding, so
the report is the list the backport is worked from rather than a document about
it.

An empty severity states that it is empty. A section left out cannot be told
apart from a section forgotten, which is the failure mode of a report nobody
trusts. The header names the base revision and both versions so any comparison
can be audited later, and links the release notes for the half of the analysis
no tool performs.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 8: The command

**Files:**
- Create: `scripts/mdt-report.mjs`
- Modify: `package.json`
- Create: `docs/mdt-updates/.gitkeep`

**Interfaces:**
- Consumes: everything above.
- Produces: `npm run mdt:report [-- --base <rev>] [-- --apply] [-- --force]`.

- [ ] **Step 1: Write the script**

Create `scripts/mdt-report.mjs`:

```js
// ABOUTME: Reports what an MDT update changed and what it costs the cards under content/.
// ABOUTME: Reads git and the filesystem only; every rule lives in the pure modules beside it.

/**
 * What an MDT update changed, and what it costs the codex.
 *
 * The base is git: the repository already requires the generated files to be committed after a
 * `npm run data`, because CI runs no extraction and the live site moves only when they are
 * versioned. `HEAD` is therefore the pre-update state by construction, and no snapshot step can be
 * forgotten. `--base <rev>` compares against anything else.
 *
 * This file reads and writes. Everything it decides was decided in mdt-diff.mjs, card-audit.mjs,
 * card-auto-fields.mjs and mdt-report-md.mjs, where it is tested without WoW and without a
 * filesystem.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { CONTENT_DIR, GENERATED_DIR, ROOT, WOWHEAD_LOCALES } from './config.mjs'
import { diffDungeon, diffSpells } from './mdt-diff.mjs'
import { annotatedSpellIds, auditDungeon, readCardFacts } from './card-audit.mjs'
import { autoFieldFindings, refreshAutoFields } from './card-auto-fields.mjs'
import { renderReport, reportFileName, summariseFindings } from './mdt-report-md.mjs'

const RELEASES_URL = 'https://github.com/Nnoggie/MythicDungeonTools/releases'
const REPORT_DIR = path.join(ROOT, 'docs', 'mdt-updates')
const BASE_LANG = WOWHEAD_LOCALES[0].lang

function parseArgs(argv) {
  const args = { base: 'HEAD', apply: false, force: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i]
    else if (argv[i] === '--apply') args.apply = true
    else if (argv[i] === '--force') args.force = true
    else throw new Error(`Unknown argument: ${argv[i]}`)
  }
  if (!args.base) throw new Error('--base needs a revision')
  return args
}

/** A tracked file as of `rev`, or null when it did not exist there. */
function showAtRev(rev, repoPath) {
  try {
    return execFileSync('git', ['show', `${rev}:${repoPath}`], { cwd: ROOT, encoding: 'utf8' })
  } catch {
    return null
  }
}

const readJsonAtRev = (rev, repoPath) => {
  const raw = showAtRev(rev, repoPath)
  return raw ? JSON.parse(raw) : null
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

/** Every card of one dungeon, base files and translations alike, parsed into facts. */
function readCards(slug) {
  const dir = path.join(CONTENT_DIR, slug)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('_'))
    .map((name) => {
      const facts = readCardFacts(fs.readFileSync(path.join(dir, name), 'utf8'), `content/${slug}/${name}`)
      if (!facts) console.warn(`  ! ${slug}/${name}: no usable npcId, skipped`)
      return facts
    })
    .filter(Boolean)
}

function main() {
  const args = parseArgs(process.argv.slice(2))

  const index = readJson(path.join(GENERATED_DIR, 'dungeons.json'))
  const currentMeta = fs.existsSync(path.join(GENERATED_DIR, 'mdt.json'))
    ? readJson(path.join(GENERATED_DIR, 'mdt.json'))
    : { version: null }
  const baseMeta = readJsonAtRev(args.base, 'src/data/generated/mdt.json') ?? { version: null }

  if (baseMeta.version && baseMeta.version === currentMeta.version) {
    console.warn(
      `  ! ${args.base} and the working tree both report MDT ${currentMeta.version}.\n` +
        `    Either nothing was updated, or ${args.base} is not a pre-update state.`,
    )
  }

  const findings = []
  const allCards = []

  for (const summary of index) {
    const slug = summary.slug
    const after = readJson(path.join(GENERATED_DIR, `${slug}.json`))
    const before = readJsonAtRev(args.base, `src/data/generated/${slug}.json`)
    const cards = readCards(slug)
    allCards.push(...cards)

    findings.push(...diffDungeon(before, after))
    findings.push(...auditDungeon(after, cards))

    const byId = new Map(after.enemies.map((e) => [e.id, e]))
    for (const card of cards) {
      const enemy = byId.get(card.npcId)
      // Only the base-language card carries `# auto` fields; a translation carries text alone.
      if (!enemy || card.locale !== BASE_LANG) continue
      const file = path.join(ROOT, card.file)
      const { text, changes } = refreshAutoFields(fs.readFileSync(file, 'utf8'), enemy)
      findings.push(...autoFieldFindings(text, enemy, card.file, slug))
      if (!changes.length) continue

      if (args.apply) {
        fs.writeFileSync(file, text, 'utf8')
        console.log(`  ~ ${card.file}: ${changes.map((c) => c.field).join(', ')}`)
      } else {
        for (const c of changes) {
          console.log(`  · ${card.file}: ${c.field} ${c.before} -> ${c.after} (use --apply)`)
        }
      }
    }
  }

  const annotated = annotatedSpellIds(allCards)
  const baseSpells = readJsonAtRev(args.base, 'src/data/generated/spells.json')
  if (baseSpells) {
    findings.push(...diffSpells(baseSpells, readJson(path.join(GENERATED_DIR, 'spells.json')), annotated))
  }

  const date = new Date().toISOString().slice(0, 10)
  const name = reportFileName({ date, from: baseMeta.version, to: currentMeta.version })
  const out = path.join(REPORT_DIR, name)

  fs.mkdirSync(REPORT_DIR, { recursive: true })
  if (fs.existsSync(out) && !args.force) {
    throw new Error(
      `${path.relative(ROOT, out)} already exists.\n` +
        `Its ticked checkboxes are a human mark, not derived output. Pass --force to replace it.`,
    )
  }

  fs.writeFileSync(
    out,
    renderReport({
      findings,
      base: args.base,
      from: baseMeta.version,
      to: currentMeta.version,
      date,
      releasesUrl: RELEASES_URL,
    }),
    'utf8',
  )

  console.log(`\nMDT ${baseMeta.version ?? 'unknown'} -> ${currentMeta.version ?? 'unknown'}`)
  console.log('dungeon'.padEnd(22) + ' 1   2   3   4   5   6')
  for (const row of summariseFindings(findings)) {
    const c = row.counts
    console.log(
      row.dungeon.padEnd(22) +
        [1, 2, 3, 4, 5, 6].map((s) => String(c[s]).padStart(3)).join(' '),
    )
  }
  console.log(`\n${findings.length} findings written to ${path.relative(ROOT, out)}`)
}

main()
```

- [ ] **Step 2: Register the command**

In `package.json`, after the `"scaffold"` line:

```json
    "mdt:report": "node scripts/mdt-report.mjs",
```

- [ ] **Step 3: Keep the report directory in git**

```bash
mkdir -p docs/mdt-updates
printf '' > docs/mdt-updates/.gitkeep
```

- [ ] **Step 4: Run it against the current tree**

Run: `npm run mdt:report`

The base is `HEAD`, whose generated data is identical to the working tree's, so the diff half must
find nothing and the audit half must find whatever the cards owe today. Expected:

- a warning that both sides report MDT 6.2.2 — correct, and the check working;
- zero severity-1 findings from `diffDungeon`, since nothing changed;
- an audit that names any card whose spells drifted from the data, and every mob without a card;
- a report file at `docs/mdt-updates/<today>-6.2.2-to-6.2.2.md`.

Read the report. Every finding it makes is a claim about the repository as it stands: spot-check
three of them against the actual files before trusting the tool at all.

- [ ] **Step 5: Prove the refusal and the dry run**

Run: `npm run mdt:report`
Expected: FAIL, saying the file exists and that `--force` replaces it.

Run: `npm run mdt:report -- --force`
Expected: PASS, same output.

Run: `git status --short content/`
Expected: **empty**. Without `--apply`, nothing under `content/` may move.

- [ ] **Step 6: Commit**

```bash
git add scripts/mdt-report.mjs package.json docs/mdt-updates/.gitkeep
git commit -F - <<'MSG'
Add npm run mdt:report

One command answers what an MDT update changed and what it costs the cards. The
base is git rather than a snapshot: the repository already requires the
generated files to be committed after npm run data, so HEAD is the pre-update
state by construction and no snapshot step can be forgotten.

The check it can actually make at the time it runs is the one it makes: when
base and working tree report the same addon version, either nothing was updated
or the base is not a pre-update state, and it says so. An existing report is
refused rather than overwritten, because ticked checkboxes are a human mark.

Nothing under content/ moves without --apply.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 9: The skill

**Files:**
- Create: `.claude/skills/mdt-update/SKILL.md`
- Modify: `CLAUDE.md`
- Modify: `.claude/skills/mdt-pipeline/SKILL.md`

**Interfaces:**
- Consumes: the command from task 8.
- Produces: nothing code depends on.

- [ ] **Step 1: Write the skill**

Create `.claude/skills/mdt-update/SKILL.md`. It must carry, in this order:

1. **Frontmatter**: `name: mdt-update`, and a `description` naming its trigger — "Read before
   installing an MDT update, re-running npm run data, or backporting what an update changed into
   the cards."
2. **The one-way door, first**: `src/data/generated/` must be committed *before* extracting.
   After that, the pre-update data exists nowhere. Nothing later in the procedure can recover it.
3. **The procedure**, as a numbered list with the verification after each step:
   - install the update; read `## Version:` from `MythicDungeonTools.toc` → verify: the version
     differs from `src/data/generated/mdt.json`;
   - `git status --short src/data/generated/` → verify: empty;
   - `npm run data` → verify: force coverage 100% for all eight dungeons, no `unknown
     characteristics` warning (if there is one, add the value to `CC_ORDER` in `mdt-dungeon.mjs`
     before continuing);
   - `npm run mdt:report` → verify: the report names the two versions, not `unknown`;
   - work the report from severity 1 down;
   - `npm test && npm run typecheck` → verify: green, fixture tests not reported as skipped;
   - commit.
4. **How to work each severity**, which is the judgement half:
   - severity 1: the note has to move to the spell that replaced it, or go. Deleting writing is a
     decision to state in the commit message, never a silent tidy-up. Read `codex-content` first.
   - severity 2: annotate the new spells, or leave `tag: todo` deliberately. Both are answers; an
     unread finding is not.
   - severity 3: reread the note against the new tooltip. The numbers in a note are quoted from
     it, so a changed description usually means a changed sentence.
   - severity 4: `npm run scaffold`, then write. `codex-content` owns the threat scale.
   - severity 5: delete the card **and its `.fr.md` sibling**. Missing one leaves a translation of
     nothing.
   - severity 6: read it. Nothing to do, and it is what tells you whether the update was small.
   - For every `.fr.md` touched: read `i18n` first. A translation carries text only — `threat`,
     `role`, `tag` and `prio` stay in the base card.
5. **The traps**, each with why it is not deducible from the code:
   - `mdtIdx` is sparse and is what routes reference. Never renumber.
   - a changed `textureFolder` means the committed WebP no longer matches the tiles: `npm run
     build:maps`.
   - CI runs no extraction, so the generated files must be committed or the live site does not
     move.
   - a game patch may require refreshing `src/lib/mdt/__fixtures__/real-export.txt`, which is
     patched in place by `patch-fixture-name.mjs`, never re-encoded — see `mdt-pipeline`.
   - `--apply` touches only `# auto` lines and never a `.fr.md`; run it without the flag first and
     read what it would do.
6. **Commit granularity**: one commit for the re-extraction and the report, then one per dungeon
   for the backport, matching the existing history.

- [ ] **Step 2: List the skill in CLAUDE.md**

In the Skills Reference table, add a row after `codex-content`:

```markdown
| [`mdt-update`](.claude/skills/mdt-update/SKILL.md) | installing an MDT update, re-running `npm run data`, or backporting what an update changed into the cards |
```

- [ ] **Step 3: Point `mdt-pipeline` at it**

`mdt-pipeline` ends with a "Checklist before committing a pipeline change". Add a line to it:

```markdown
5. If the change came from an MDT update rather than from our own code: follow the `mdt-update`
   skill instead of this checklist. The order of operations matters there, and one step of it
   cannot be undone.
```

- [ ] **Step 4: Verify the skill against its own claims**

Every command the skill names must exist. Check each, and fix the skill rather than the repository
if one does not:

```bash
grep -o 'npm run [a-z:]*' .claude/skills/mdt-update/SKILL.md | sort -u
```

Expected: every name printed appears in `package.json`'s `scripts`.

```bash
grep -o '`[a-zA-Z0-9_./-]*\.\(mjs\|ts\|md\|txt\)`' .claude/skills/mdt-update/SKILL.md | tr -d '`' | sort -u
```

Expected: every path printed exists. A skill that names a file that is not there is the exact
failure the repository's rules call lying.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/mdt-update/SKILL.md .claude/skills/mdt-pipeline/SKILL.md CLAUDE.md
git commit -F - <<'MSG'
Add the mdt-update skill

The report says what an update cost; it cannot say what to write instead. That
half is judgement -- move a note to the spell that replaced it, rate a new mob,
decide a translation is dead -- and it belongs in a procedure rather than in a
script.

The skill leads with the one-way door, because the order of operations is the
only part that cannot be recovered from: the generated files have to be
committed before extracting, or the pre-update data exists nowhere. Everything
after that is checkable, and each step carries what to verify.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 10: Run it for real, on the update

**Files:**
- Create: `scripts/__fixtures__/AltarOfFangs-<new version>.lua`
- Modify: `scripts/mdt-diff.test.mjs`
- Modify: `src/data/generated/*`, `public/maps/*`, `content/**` as the report dictates
- Create: `docs/mdt-updates/<date>-6.2.2-to-<new>.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the first real report, and a differ test running on two real MDT versions.

- [ ] **Step 1: Confirm the base is safe**

Run: `git status --short src/data/generated/`
Expected: **empty**. If it is not, stop and commit first. This is the step that cannot be undone.

- [ ] **Step 2: Install the MDT update**

A human action, outside this repository. Then:

```bash
grep '^## Version:' "$MDT_PATH/MythicDungeonTools.toc"
```

Expected: a version above 6.2.2. Record it; the rest of the task refers to it as `<new>`.

- [ ] **Step 3: Capture the second real dungeon fixture, before extracting**

```bash
cp "$MDT_PATH/Midnight/AltarOfFangs.lua" "scripts/__fixtures__/AltarOfFangs-<new>.lua"
```

If `MDT_EXPANSION` changed with the update, the folder is that one instead — read
`scripts/config.mjs`, do not assume `Midnight`.

- [ ] **Step 4: Extend the differ test to two real MDT versions**

Append to `scripts/mdt-diff.test.mjs`:

```js
import { parseDungeon } from './mdt-dungeon.mjs'

describe('diffDungeon across two real MDT versions', () => {
  // The affix pair proves the differ on real pipeline output; this proves it on a real update,
  // which is the thing it exists for. Both fixtures are captures of the addon's own file.
  const parse = (name) =>
    parseDungeon(
      fs.readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), 'utf8'),
      'AltarOfFangs',
      () => {},
    )

  it('finds what changed between 6.2.2 and the next release', () => {
    const findings = diffDungeon(parse('AltarOfFangs.lua'), parse('AltarOfFangs-<new>.lua'))
    // Assert on what the update actually did, read out of the report in step 7 -- not on a guess
    // made while writing this plan. If the two versions of this dungeon are identical, say so
    // here with an expect([]) and a comment, which is itself a fact worth pinning.
    expect(Array.isArray(findings)).toBe(true)
  })

  it('still never surfaces a coordinate, on real update data', () => {
    const findings = diffDungeon(parse('AltarOfFangs.lua'), parse('AltarOfFangs-<new>.lua'))
    expect(JSON.stringify(findings)).not.toMatch(/\d+\.\d{6}/)
  })
})
```

Replace the placeholder assertion in the first test with the real change once step 7 has shown
what it is. Leaving `expect(Array.isArray(...))` in place is a plan failure, not a test.

- [ ] **Step 5: Run the whole chain**

Run: `npm run data`

Read the output. Expected, and each one is a gate:
- every dungeon at `forces=…/… (100%)`. A `<-- not enough forces` flag means extraction missed
  something in the new files: stop and diagnose before going further.
- no `! unknown characteristics` warning. If there is one, add the value to `CC_ORDER` in
  `scripts/mdt-dungeon.mjs`, re-run, and mention it in the commit.
- `MDT <new> / <expansion>` on the last line.

- [ ] **Step 6: Generate the report**

Run: `npm run mdt:report`
Expected: no same-version warning; a summary table; a file named `<date>-6.2.2-to-<new>.md`.

- [ ] **Step 7: Read the report, and check the tool against reality**

Pick one finding per severity that the report makes and verify it by hand against the files.
A tool's first real run is the only time its output is checked rather than trusted.

- [ ] **Step 8: Run the dry-run, then apply**

Run: `npm run mdt:report -- --force`
Read every `·` line. Each is a marked value the tool would correct.

Run: `npm run mdt:report -- --force --apply`
Then: `git diff --stat content/`
Expected: only `# auto` lines moved. Read the diff. A change on any other line is a bug in
`refreshAutoFields`, to be fixed before committing.

- [ ] **Step 9: Commit the data and the report**

```bash
git add src/data/generated/ public/maps/ scripts/__fixtures__/ docs/mdt-updates/ content/ scripts/mdt-diff.test.mjs
git commit -F - <<'MSG'
Re-extract MDT <new>

<What the report found, in two or three sentences: how many mobs and spells
moved, which dungeons were touched, and whether any card lost writing. Write it
from the report, not from expectation.>

The differ's test gains the second real fixture this update makes available:
AltarOfFangs.lua as 6.2.2 wrote it and as <new> writes it, so the diff is now
proven on an actual update rather than only on our own pipeline's output.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

- [ ] **Step 10: Work the report, committing per dungeon**

For each dungeon with findings at severity 1 through 5, follow the `mdt-update` skill and commit
that dungeon's backport on its own, as the translation history already does. Tick the report's
checkboxes as you go and commit the report along with the last dungeon.

- [ ] **Step 11: Verify the whole thing**

Run: `npm test`
Expected: green. Fixture tests must not be reported as skipped.

Run: `npm run typecheck`
Expected: no errors.

Run: `npm run test:e2e`
Expected: green. It needs Chromium; if it is not installed, say so rather than reporting a pass.

## Notes for whoever executes this

- Tasks 1 through 9 need no new MDT and can be done in one sitting. Task 10 needs a human to
  install the addon.
- **Task 1 is the deadline.** Every hour MDT 6.2.2 stays installed is an hour in which the current
  data's provenance can still be recorded. After the update, it cannot.
- The `Finding` shape is the contract between every module. Adding a field is fine; renaming one
  means touching five files and their tests.
- `readCardFacts`'s `written` rule duplicates `isStub` in `src/lib/content.ts:283-288`. If either
  moves, both must. The test comment names the line range on purpose.
