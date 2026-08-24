# Contributing to Keystone Codex

Keystone Codex is a codex and an interactive map for World of Warcraft Mythic+ dungeons: every
mob has a card saying what it does, what to interrupt, and what wipes the group. The map, the
forces and the spell lists are extracted from the game; the cards are written by the people who
run the dungeons. If you play them, you can improve one. A corrected sentence is as welcome as
a whole card, and neither asks you to be a developer — [the browser path](#in-the-browser)
needs no clone and no tooling.

*Ce guide existe en français : [CONTRIBUTING.fr.md](CONTRIBUTING.fr.md).*

## What you can edit, and what you can't

Half of what a card shows was never written by hand, and must not be edited by hand. Every
change to the right-hand column is work the next `npm run data` erases.

| Yours to write — `content/<dungeon>/*.md` | Generated — rewritten by `npm run data` |
| --- | --- |
| `threat`: how much this mob changes the pull | Spell names, icons, descriptions, cast times and ranges — fetched from Wowhead |
| `role`: what shape of mob it is | Mob names, forces, positions on the map, applicable CC — extracted from MDT |
| `rank`: whether it is a boss or a miniboss, when the game disagrees with the players | Which mobs the game itself flags as bosses |
| A spell's `tag`, `prio` and `note` | Which spells a mob has at all, and their ids |
| `trap`: the sentence that avoids the wipe | The dungeon maps under `public/maps/` |
| The prose under the frontmatter | Everything under `src/data/generated/` |
| `tips`: a sentence, a video or a screenshot | |

A fresh card also carries a few lines the scaffold copied out of the generated data as a
reminder: `name:`, `count:` and `isBoss:`, each marked `# auto`; a spell's `name:`, marked the
same way; and a bare comment under it giving that spell's cast time and range. The app reads
none of them, and changing one changes nothing on screen.

**A wrong spell name, a wrong cast time or a missing spell is a data problem, not a card
problem.** No edit to `content/` can fix it, so do not try: [open an
issue](https://github.com/Dudesons/keystone-codex/issues/new/choose) instead.

## Two ways to edit

### In the browser

Nothing to install, and enough for any text change.

1. Open the file on GitHub — the cards are under `content/<dungeon>/`.
2. Click the pencil icon (*Edit this file*).
3. Make your change, then click **Commit changes…** and pick **Create a new branch for this
   commit and start a pull request**. GitHub calls that button *Propose changes* on some
   screens; it is the same thing.
4. Fill in the title, open the pull request. That is it — CI takes over.

To add a screenshot, open `public/tips/<dungeon>/` and use **Add file → Upload files**; the
file picker uploads it into the same pull request. If the folder does not exist yet, use **Add
file → Create new file** and type `public/tips/<dungeon>/` in the name box: GitHub creates the
folder when you create the first file in it.

### On your machine

More setup, far better feedback: the card redraws as you save.

```bash
npm install
npm run dev
```

Open the dungeon, find the mob, and edit its `.md`. The dev server hot-reloads `content/`, so
the card updates without a rebuild. Before pushing:

```bash
npm test
npm run typecheck
```

You need neither World of Warcraft nor MDT for any of this. The extraction scripts read a local
WoW installation, but their output is committed — the app only ever reads the committed files.

## Anatomy of a card

One file per mob, at `content/<dungeon-slug>/<npcId>-<name-slug>.md`. YAML frontmatter between
the `---` lines, free prose after it.

```markdown
---
npcId: 270306
threat: high              # low | medium | high | lethal
role: melee               # caster | melee | patrol | add
rank: miniboss            # optional: boss | miniboss — overrides what MDT says
spells:
  - id: 1306911
    tag: tank             # kick | frontal | dodge | dispel | tank | soak | ignore
    prio: 1
    note: "581k physical on the current target."
trap: "Immune to every CC: you have to burst it."
tips:
  - text: "Pull it into the corridor — the frontal has nowhere to reach the healer."
---

Free-form prose: positioning, focus order, cooldowns.
```

| Field | What it holds |
| --- | --- |
| `npcId` | The mob's id. Written by the scaffold; never change it — the card is matched to the map by this number alone. |
| `threat` | `low`, `medium`, `high` or `lethal`. Colours the ring on the map. See [Rate a mob's threat](#rate-a-mobs-threat). |
| `role` | `caster`, `melee`, `patrol` or `add`. What shape of mob it is. |
| `rank` | `boss` or `miniboss`. Leave it out and the mob is whatever MDT flagged it. Write it when the game disagrees with the players: a flagged unit that is really a miniboss, or an unflagged one that everybody treats as a boss fight. A value outside those two is ignored, and a test names the file. |
| `spells[].id` | A spell id that already exists in the generated data. Do not invent one. |
| `spells[].tag` | `kick`, `frontal`, `dodge`, `dispel`, `tank`, `soak` or `ignore`. A fresh card says `tag: todo`, which shows no badge and means "not looked at yet". |
| `spells[].prio` | A number. Within a card it orders spells carrying the same tag; `prio: 1` can also reach the dungeon's Overview tab. See [Annotate a spell](#annotate-a-spell). |
| `spells[].note` | One sentence, shown **instead of** Wowhead's description. Leave it out and Wowhead's own text is shown. |
| `trap` | The one sentence that avoids the wipe. Leave it empty if the mob is harmless. |
| `tips` | See [Add a tip](#add-a-tip). |
| The prose | Everything the sentences above have no room for. |

`note` and `trap` are markdown, rendered inline: emphasis and links work, headings and lists do
not. The prose is full markdown.

A mob with no file still renders, with its MDT data alone. Nothing you leave out breaks
anything.

## Recipes

Each of these is one small pull request. None of them requires the others.

### Add or change a trap

The trap is the sentence someone reads mid-pull, so it says what to *do*, not what the mob *is*.
From `content/the-blinding-vale/254850-sporeblight-belcher.md`:

```yaml
trap: "Twenty-five forces a body and 291k when each one dies. Do not let several die on top of the group at once — stagger the kills or spread them out."
```

If the mob is genuinely harmless, leave `trap:` empty. An empty field is information; a padded
one is noise.

### Annotate a spell

Find the spell in the `spells:` list — the scaffold already wrote its id, its name and its cast
time — and give it a `tag`, a `prio` if it deserves one, and a `note`:

```yaml
  - id: 1263636
    name: "Belch Spores"   # auto
    # 1.5 sec cast
    tag: dodge
    prio: 1
    note: "291k Nature per impact, one every 1.5 sec for 3 sec. Ground damage — the whole cast is avoidable by moving."
```

Replace `tag: todo` rather than adding a second `tag:` line. Do not touch the `# auto` lines
around it.

`prio: 1` is a promotion: the spell becomes a chip on the dungeon's Overview tab, which is a
shortlist and stops being useful once everything is on it. Two or three per mob at most. The
Overview only lists mobs rated `medium` or above (and minibosses), so a `prio: 1` on an unrated
mob shows up on its card and nowhere else — rate the mob and it appears.

### Rate a mob's threat

`threat` is not "how big is the number", it is how much of the pull this mob changes. The scale,
the three rules that follow from it and two worked examples live in
[`docs/writing-cards.md`](docs/writing-cards.md#the-threat-scale)
— **read it before rating.** It also tells you when to leave the field empty instead of filling
it, and which mobs carry no `threat` at all.

That page is the one place those answers live, which is why this one does not repeat them: a
rule written twice is a rule that will disagree with itself.

### Write the prose

Everything below the closing `---`. Full markdown. It is where a mob stops being a list of
abilities: which of its spells actually decides the pull, what the pack does together, what a
group gets wrong the first time.

Write it for someone who has the card open and is about to pull. Bold the sentence that matters;
do not restate the spell notes above it.

### Add a tip

A tip is what a card cannot say in a sentence: a positioning trick, fifteen seconds of video, or
a screenshot of where the beams land. It sits at the bottom of the card, in the codex and in the
Route tab's mob column alike.

Three kinds. The key names the kind, so an entry carries exactly one of `text:`, `video:` or
`image:`:

```yaml
tips:
  - text: "Kick the second cast, not the first — the first is baited."
  - video: https://www.youtube.com/shorts/9D0gCU8Tp5Y
    label: "Naowh — the pull after the first boss"
  - image: zuljan-beams.webp
    label: "Where the beams land"
```

The rules:

- **Always give a `label:` on a video and on an image.** Without one the button reads only
  "Play video" and the image gets no caption — nothing tells the reader what they are about to
  open. A text tip needs none: the sentence is the tip.
- **Credit the creator in the label.** If the video is someone else's work, their name goes in
  front of the description, as above.
- **Accepted video URLs** are the four forms you actually have in your clipboard:
  `youtube.com/watch?v=…`, `youtu.be/…`, `youtube.com/shorts/…` and `youtube.com/embed/…`, with
  an optional `?t=90` (or `t=90s`) to start partway in. Anything else is rejected and the tip
  disappears. Paste the link, not embed HTML.
- **An image is a bare filename**, committed to `public/tips/<dungeon-slug>/`. No path, no URL
  from another site — a value containing `/` is rejected. `.webp` is preferred; `.png`, `.jpg`,
  `.jpeg` and `.gif` also work, `.svg` does not. Name the file after what it shows, not after
  your screenshot tool.
- **Nothing is loaded from YouTube until a reader clicks.** The card draws its own button; the
  click is the consent and the moment someone actually wants the video.

A malformed tip is dropped with a warning in the browser console and the rest of the card still
renders — so if your tip is not showing up, open the console. A missing image file is caught by
the test suite, not by production: `npm test` fails if an `image:` names a file that is not
there.

### Say which pull a tip is about

A tip with no `packs:` is about the mob, wherever you meet it, and the map marks every one of its
blips. Most tips are like that. But a tip about *one pull* — where to stand, what to pull it with,
which corner to fight it in — should say so:

```yaml
tips:
  - text: "Pull it into the corridor — the frontal has nowhere to reach the healer."
    packs: [44]
```

`packs:` takes the numbers the map's tooltip shows when you hover a mob. Name several when the pull
takes several groups at once: `packs: [44, 45]`. The map then puts the `?` **on those pulls** rather
than on any mob — the advice is about taking that group, and the card it is written on is only where
the sentence lives. The card says which pull, so a reader who followed the mark knows what they
found.

The Sporeblight Belcher is why this key exists: it stands in eleven packs, and a video about the
pull after the first boss used to put a `?` on all eleven of its blips.

**A `.fr.md` that restates `tips:` must restate `packs:` too.** The translated list replaces the
base list whole, so a missing `packs:` there means French readers see the badge on every blip of the
mob while English readers see it on the pull. A test checks this, along with the pack existing in
that dungeon and the mob actually standing in it.

### Translate a card into French

A translation is a sibling file: `254850-sporeblight-belcher.md` gets
`254850-sporeblight-belcher.fr.md` beside it. It carries **text only**, and it is merged over
the base card field by field — anything you leave out keeps the English.

What belongs in a `.fr.md`: `npcId` (so the file is matched), a spell's `note` keyed by its
`id`, `trap`, the prose — and `tips`, with one caveat below. What does not: `threat`, `role`,
`tag`, `prio`, `rank`. Those are judgements, not language; duplicating them across two files would only
let them drift.

```yaml
---
npcId: 245346

spells:
  - id: 1237855
    note: "533k Physique sur le tank, et ça laisse de la Terre fissurée en dessous."

trap: "Chaque tank buster laisse une flaque ralentissante là où se tenait le tank."
---
```

**Tips translate as a whole list or not at all.** A `.fr.md` that names `tips:` replaces the
base list entirely — there is no per-tip merge, so a partial list silently drops the tips you
did not restate. Leaving `tips:` out is the normal case and is perfectly fine: the reader gets
the base list with a small `EN` mark on the section, saying plainly which language they are
being served. That mark is also why a half-finished translation is honest rather than broken.

You can translate one sentence and stop. The fallback is per field.

### A mob has no file yet

Cards are not written from scratch — the scaffold generates them from the extracted data, with
the id, the name, the forces and the whole spell list already filled in:

```bash
npm run scaffold
```

It **never overwrites an existing file**; it only adds the missing ones. It needs no WoW
installation, because it reads the committed data under `src/data/generated/`. Commit the new
file along with what you wrote in it.

If you are working in the browser and cannot run it, say so in an issue and someone will
generate the card. Do not hand-write the frontmatter: an invented `npcId` or spell id attaches
the card to nothing.

### A spell name is wrong

You cannot fix it in `content/`. Spell names, icons, descriptions and cast times come from
Wowhead; mob names, forces and applicable CC come from MDT. Both are rewritten wholesale by
`npm run data`, so an edit by hand survives exactly until the next extraction — and in the
meantime it makes the card disagree with the game.

[Open an issue](https://github.com/Dudesons/keystone-codex/issues/new/choose) naming the dungeon,
the mob and what is wrong. The fix is either an extraction re-run or a change to the scripts, and
both are somebody's separate pull request.

## Before you open a pull request

- **One card per pull request** where you can. It is easier to review, easier to argue with, and
  a disagreement about one sentence does not hold up four other mobs.
- **Run the checks** if you have the repository locally: `npm test` and `npm run typecheck`. If
  you are working in the browser, open the pull request and let CI say it — it runs the same two
  commands, plus a build and the end-to-end suite.
- **CI cannot check whether what you wrote is true.** It typechecks, runs the tests and builds
  the site: it catches an `image:` naming a file that is not there, and anything your edit broke
  elsewhere. It has never played the dungeon. A claim the data does not support passes every
  check and is still wrong, which is why the next section exists.

## House rules

- **Write what the data holds and nothing more.** It is the easiest rule to break by accident,
  and it has more edges than a bullet can carry: a tooltip that names no radius, an unscaled
  figure,
  two sources that disagree, something you know only from having played it. All of them are
  answered in
  [`docs/writing-cards.md`](docs/writing-cards.md#what-may-be-written-at-all).
  Read it before writing a sentence the card cannot source.
- **Do not paste someone else's guide.** A route write-up, a video script, a wiki page — link it
  as a tip with their name in the label. Mirroring text into this repository is both a licensing
  problem and a maintenance one: their guide gets updated, our copy does not.
- **No raw HTML.** `note:`, `trap:` and a text tip are rendered as inline markdown, and a tag
  written into one of them is **escaped**: `<b>bold</b>` reaches the reader as those exact
  characters, visible on the card. Markdown covers what a card needs — emphasis and links — so
  write that instead. The escaping is a safety rule rather than a style one: without it a
  `<script>` in one of those fields would run in the browser of every reader of that card.
- **Links go to `http`, `https` or `mailto`, or nowhere.** A link with any other scheme keeps
  its text and loses its link, for the same reason: `[click](javascript:…)` is valid markdown
  that reads as an ordinary link in a diff. Relative paths and the in-app `#/d/…` cross-links
  are unaffected.

## Where to ask

[Open an issue](https://github.com/Dudesons/keystone-codex/issues/new/choose). A question about a
mob is as good a reason as a bug — if a card is unclear enough to ask about, it is unclear enough
to fix.

If what you found is a card that gets script to run rather than a card that is wrong, read
[`.github/SECURITY.md`](.github/SECURITY.md) first — it says what to include and what to leave
out.

The reference for the app itself — how to read the map, the routes, how the data is regenerated
— is in [README.md](README.md).
