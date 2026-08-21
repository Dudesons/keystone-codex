# Mob tips, and a contributor guide — design

**Goal:** let a card carry a *tip* — a sentence, a YouTube video or Short, or a screenshot —
and show it wherever the mob is shown, above all in the Route tab's left column, where a
router is deciding how to take the pack. Tips are written knowledge, so they live in
`content/` and never reach an MDT string.

**Why now:** the cards already carry everything mechanical and everything textual, but a boss
fight is sometimes explained in fifteen seconds of video and never in a paragraph. There is
today no field that can hold one. The second half of this spec answers the same gap for
people rather than data: the repository documents how to *run* the extraction chain, and
nowhere documents how to *write a card* for someone who does not use an agent.

Nothing has to be generated or fetched for either half. The loader, the hot reload, the
locale suffix and the fallback mark all exist; tips reuse them.

## Scope

Two deliverables, designed together because the second documents the first:

- **A — tips.** A `tips:` list in the mob frontmatter, parsed, translated, rendered.
- **B — the guide.** `CONTRIBUTING.md` and `CONTRIBUTING.fr.md`, plus the edits around them
  that keep every rule in exactly one place.

## The decisions

### 1. A tip lives in the mob card, not beside it

`content/<dungeon>/<npcId>-<slug>.md` already holds everything a human knows about one mob.
A tip is one more thing a human knows about that mob, so it goes in the same file. That buys
the whole loader unchanged: the `import.meta.glob`, the hot reload on save, the `.fr.md`
suffix, the per-card cache. A separate `_tips.md` would split one mob's knowledge across two
files and need its own locale handling for nothing.

Dungeon-wide tips — a route video, a skip — are **not** in this slice. `_dungeon.md` can grow
the same field later; no decision here forecloses it.

### 2. The key names the kind

```yaml
tips:
  - text: "Kick the second cast, not the first — the first is baited."
  - video: https://youtu.be/dQw4w9WgXcQ?t=95
    label: "Beam soak rotation"
  - image: zuljan-beams.webp
    label: "Where the beams land"
```

No `kind:` field, because a `kind:` field can disagree with the value beside it. Here the two
cannot drift: an entry with two kind-keys, or none, is not a mismatch to reconcile but a
malformed entry to reject. It also keeps a tip to two lines, which matters for a format
people type by hand.

### 3. A video is an id we extract, not an embed a contributor pastes

`src/lib/tips.ts` accepts the four forms someone actually has in their clipboard —
`youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `youtube.com/embed/` — with an
optional `t=90` or `t=90s`, and keeps the eleven-character id. Everything else is rejected.

Asking for embed HTML, or for a bare id, would push work onto the contributor that a regex
does for free, and pasted embed HTML is markup we would then have to trust.

The `/shorts/` form sets `portrait: true`. That is the only reason the distinction survives
parsing: a Short rendered in a 16:9 frame is two black bars and a stamp-sized video.

### 4. Nothing reaches Google until the reader clicks

A tip renders as a button we draw — play glyph, label, and a small link out to youtube.com
beside it. The click replaces the button with an iframe pointed at
`youtube-nocookie.com/embed/<id>?start=<n>&autoplay=1&rel=0`.

A YouTube poster image would be prettier and would cost a third-party request per tip on
every card render, on a page that today makes none. The click is consent, and it is also the
moment the reader has decided they want the video. The link beside the button is the escape
hatch for anyone whose browser blocks the frame.

### 5. An image is a bare filename, resolved by us

`image: zuljan-beams.webp` resolves to `${import.meta.env.BASE_URL}tips/<dungeon-slug>/<file>`,
the same construction as `iconUrl` and `mapUrl` in `src/lib/data.ts`. The file is committed
under `public/tips/<dungeon-slug>/`.

A value containing `/`, `\`, `..`, or a scheme is rejected. So the field cannot address a
host we do not control, cannot climb out of its directory, and has no `javascript:` surface —
not because a contributor is hostile, but because the guarantee costs one regex and removes a
class of review question entirely.

Hotlinking was considered and refused: images die silently, and a codex that depends on
strangers' hosting decays without anyone noticing. The YouTube embed is the deliberate
exception, because we cannot host video.

### 6. A malformed tip is dropped and warned, never fatal

The loader already refuses a card with no `npcId` with a `console.warn` and keeps going, and
already filters spell entries with no id. A tip follows: bad entries vanish, the rest of the
list renders, the card renders. The codex must never break over content, which is the same
invariant that lets a mob with no file at all still display.

### 7. Tips translate as a whole list

`translation?.tips ?? base?.tips`. A `.fr.md` that omits the key inherits the base list and
the section shows the existing `EN` mark, beside `trap` and the prose.

Merging per tip would need a stable hand-written key per entry, and that key is exactly the
field a contributor duplicates or mistypes. All-or-nothing also expresses something true: a
French tip is often a different video, not a translated caption.

### 8. A card whose only content is a tip counts as written

`isStub` gains `!tips?.length`. The rule the field encodes is "a human has put something
here", and someone who found the video that explains the fight has. The completion bar
measures whether there is anything to read, and there is.

### 9. Tips render at the bottom of the card, and not at all in compact

`MobTips` mounts in `MobCard` after the prose, behind `!compact`. The trap and the spell list
are what a router reads mid-pull; a tip is what they read once. Compact is the codex's list
view, where prose and CC are already hidden.

`MobPanel` — the Route tab's left column — needs no change at all. It mounts `MobCard`
already, so it inherits the section. That is the whole reason the feature is this small.

### 10. "Never exported to MDT" is structural, and gets recorded rather than tested

`src/lib/mdt/` serialises the route document. It does not import `content.ts` and has no path
to it. There is nothing to prevent, so a test asserting the absence would pass forever
without exercising anything — the kind of test that reports health it never measured.

It is recorded instead as an invariant in `CLAUDE.md`: **nothing under `content/` ever reaches
an MDT string.** A future change that broke it would be breaking a written rule, not slipping
past a green test.

### 11. `CONTRIBUTING.md` owns the format; `codex-content` keeps the judgement

One rule, one home. The split:

| Document | Owns | Example |
| --- | --- | --- |
| `CONTRIBUTING.md` | the format | every field and its allowed values, the three tip kinds, file naming, what a `.fr.md` may contain |
| `.claude/skills/codex-content/SKILL.md` | the judgement | what a threat level *means*, what may be claimed at all, reconciling MDT against another source |

Rules a contributor must follow belong where contributors look, and GitHub surfaces
`CONTRIBUTING.md` in the pull request UI. The skill gains a tips section — when a tip beats a
sentence of prose, why a label is required, why we do not mirror someone else's guide — and
points at `CONTRIBUTING.md` for the format instead of restating it.

### 12. Both languages, one commit

`CONTRIBUTING.md` and `CONTRIBUTING.fr.md` are a translated pair, each linking to the other.
The audience is guildmates; a guide skimmed in a second language is a guide half-followed.

The cost is drift, and nothing tests a document. So `CLAUDE.md` gets the rule that makes it
visible: **the pair lands in the same commit or not at all.**

### 13. The guide documents both ways in, browser first

A contributor editing `content/**.md` through GitHub's web interface needs no clone, no node
and no npm, and can upload a screenshot through the file picker. That is the path most
guildmates will take, so it comes first. The local path — `npm install`, `npm run dev`, the
card hot-reloading as they save — follows for anyone who wants live preview, because the
feedback is far better and the guide should not hide it.

### 14. The guide opens with what cannot be edited

Spell names, icons, descriptions and cast times come from Wowhead; mob names, forces,
positions and applicable CC come from MDT. All of it is regenerated by `npm run data`, and
editing it by hand is work the next extraction erases. What a human writes about a spell is
its `tag`, its `prio` and its `note`.

That boundary is the first thing a newcomer gets wrong — "edit the spell information" reads
as an invitation to fix a wrong spell name — so it is the first thing the document says, and
the wrong-name case gets its own recipe ending in "open an issue".

## What gets built

| File | Change |
| --- | --- |
| `src/lib/tips.ts` | **new.** `parseTip`, YouTube id and timestamp extraction, image filename validation. Pure: no glob, no React. |
| `src/lib/tips.test.ts` | **new.** Every accepted URL form and every rejection. |
| `src/lib/content.ts` | `MobContent.tips?: Tip[]`, `MobFallback.tips: boolean`, the whole-list merge, `isStub`. |
| `src/lib/content.test.ts` | Parse, merge, fallback, `isStub` with tips only. |
| `src/components/codex/MobTips.tsx` | **new.** The three kinds; click-to-load iframe. |
| `src/components/codex/MobTips.test.tsx` | **new.** Rendering, no iframe before the click, one after. |
| `src/components/codex/MobCard.tsx` | Mount `MobTips` after the prose, behind `!compact`. |
| `src/components/codex/MobCard.test.tsx` | Section present, hidden in compact, `EN` mark on fallback. |
| `src/components/route/MobPanel.test.tsx` | A tip is reachable from the Route tab. |
| `src/lib/i18n/*` | `tip.section`, `tip.play`, `tip.openOnYouTube`, in both dictionaries. |
| `src/lib/content.integrity.test.ts` | **new.** Every `image:` in `content/**` names a file under `public/tips/`. |
| `scripts/content-stub.mjs` | A commented `tips:` hint in a fresh card, with `content-stub.test.mjs` updated. |
| `CONTRIBUTING.md`, `CONTRIBUTING.fr.md` | **new.** The guide, as a translated pair. |
| `.claude/skills/codex-content/SKILL.md` | A tips section; the format delegated to `CONTRIBUTING.md`. |
| `README.md` | `tips:` in the example, a pointer to `CONTRIBUTING.md`. |
| `CLAUDE.md` | The MDT invariant; the translated-pair rule. |

Names of new test files are indicative; the plan settles them against the layout each suite
already uses.

## Testing

| Level | What it covers |
| --- | --- |
| Unit | `tips.ts` — the four URL forms, `t=90` and `t=90s`, Shorts to `portrait`, and each rejection: a short id, two kind-keys, no kind-key, a path in `image:`, a remote URL in `image:`. `content.ts` — the whole-list merge, `fallback.tips`, `isStub`. |
| Integration | `MobTips` and `MobCard` in jsdom: each kind renders, **no `iframe` in the DOM before the click and exactly one after**, compact hides the section, the `EN` mark appears on fallback. `MobPanel`: a tip is reachable in the Route tab. |
| Integrity | A node test reading `content/**/*.md` and asserting every `image:` names an existing file under `public/tips/`. A typo there is otherwise a silent 404 in production, visible to no test and no reviewer. It must tolerate `public/tips/` not existing yet. |

No mocks: the tests read the real cards through the real loader, as the suite already does.

## Open question: end-to-end coverage

`CLAUDE.md` forbids declaring a test type not applicable without the exact authorisation
phrase, so this is left open rather than decided.

The argument for skipping: the Playwright suite exists for behaviour only a real browser can
show — a real socket carrying a real `Origin`, two viewports agreeing on a cursor. A tip is
static rendering and one click, both of which jsdom proves at a fraction of the cost.

The argument against: a click-to-load `iframe` pointed at a third-party origin is precisely
the kind of thing jsdom does not really execute, and the deployed sub-path is exactly what an
image `src` gets wrong.

**Resolve before implementation.** If a scenario is wanted, the cheapest honest one asserts
that the `iframe` appears and its `src` names the right video id — not that YouTube loads,
which would put the network in the suite.

## Deliberately not in this slice

- **Dungeon-level tips** in `_dungeon.md`. Nothing here blocks them.
- **A lightbox** for image tips. An image capped to the panel width is enough; a viewer is a
  component with its own keyboard and focus behaviour to get right.
- **Per-tip translation keys.** Decision 7.
- **Any tip in the MDT export.** Decision 10.
- **A validation command** for tips beyond the integrity test. `card-audit.mjs` could grow a
  check later; the test covers the failure that actually happens.
