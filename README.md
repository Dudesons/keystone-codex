# Keystone Codex

Codex and interactive map for World of Warcraft Mythic+ dungeons, currently tuned to the
**Midnight season 2** pool. Every dungeon has three fixed tabs, each its own address:
**Overview**, the briefing — the mobs worth knowing, the traps, and the bosses in encounter
order, drawn straight from the codex cards; **Codex**, the real MDT layout with its packs
clickable and a card per mob; and **Route**, an editor that imports and exports MDT strings —
with other people if you want.

Nothing in the code is tied to an expansion: changing season only takes editing
`SEASON_DUNGEONS` in `scripts/config.mjs`, then re-running `npm run data`.

## Getting started

```bash
npm install
npm run dev
```

## Editing the codex

**Everything that gets written lives in `content/`, one markdown file per mob.** The rest
(names, forces, applicable CC, spells, positions) is extracted from MDT and is not edited by
hand.

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

`threat` and `tag` drive the rendering (colors, spell ordering by kick priority). A spell
without a `note` falls back to its Wowhead description, and a mob without a file is still
displayed with its MDT data alone — the codex fills in gradually without ever breaking the
app.

The dev server hot-reloads: saving a `.md` updates the card immediately.

**Writing your first card?** [CONTRIBUTING.md](CONTRIBUTING.md) walks through it — in the
browser or locally, with a recipe per task ([en français](CONTRIBUTING.fr.md)).

`content/<dungeon>/_dungeon.md` carries the timer, the summary, the route plan, and — where
MDT's own encounter order is not usable — a `bosses:` list of npc ids giving the boss cards
their reading order (King's Rest needs one: its Council of Tribes was re-added with new ids,
so MDT's index alone would put King Dazar in the wrong place).

## Regenerating data after an MDT update

```bash
npm run data
```

Chains the four scripts, which read the WoW installation and write versioned files —
**the app never reads `D:\jeux` at runtime**, which is what makes it shareable.

| Script | Role |
| --- | --- |
| `npm run extract` | `Midnight/*.lua` → `src/data/generated/*.json` (mobs, clones, packs, forces) |
| `npm run build:maps` | 150 PNG tiles → one 1920×1280 WebP image per dungeon |
| `npm run fetch:assets` | spell IDs → names, icons, descriptions (Wowhead); mob portraits |
| `npm run scaffold` | creates the missing `.md` cards — **never overwrites an existing file** |

If WoW is installed elsewhere: `MDT_PATH="D:\other\path\MythicDungeonTools" npm run extract`.
To change the dungeon pool (new season), edit `SEASON_DUNGEONS` in `scripts/config.mjs` —
everything else (MDT index, force totals, mapID) is read from the game files.

## Reading the briefing

Opening a dungeon (`/d/<slug>`) shows its **Overview** rather than the codex: a row per mob
worth knowing with its threat and its prio-1 spells, the traps to remember, the tips written
about the dungeon's mobs, and a card per boss in encounter order with its own spells and,
where the card holds one, its trap sentence. A mob's or boss's name links straight into its
full card in the codex, at `/d/<slug>/codex/mob/<npcId>`.

The mob table is a shortlist, not a census: a row goes to a mob with a `prio: 1` spell that is
also rated `medium` or above — or is a miniboss, marked `MINIBOSS` on its row. An unrated mob
does not appear, which is the price of the shortlist: writing its `threat` is what brings it
back. Tips are the exception and are listed for every mob that carries one, rated or not.

The **Overview / Codex / Route** tabs in the header are fixed and always present, each its own
address (`/d/<slug>`, `/d/<slug>/codex`, `/d/<slug>/route`); the URL follows whichever you
pick, so a link to any of the three can be shared directly.

## Reading the map

Every unit is a circular portrait, like in MDT. The information reads on four levels:

- **The ring** gives the threat level (`threat` in the card): red for lethal, orange for
  dangerous, gold for watch-out, green for harmless, amber for a boss, grey when it has not
  been assessed yet.
- **The size** gives the rank: a boss blip is biggest, a miniboss sits between, everything else
  is trash-sized. Rank comes from `rank` in the card, falling back to what MDT flagged.
- **The pips** above the portrait flag `K` a spell to interrupt, `T` a tank buster, `D` a
  dispellable spell, and `?` something written about this mob — or about this pull.
- **The outlines** surround packs in Codex mode, and pulls (with their number) in Route mode.

`K` and `D` are **derived from MDT** — 75 interruptible spells and 108 dispel types are
already filled in without you writing anything. `T` and the threat level come from the
cards: their absence means "not assessed yet", not "harmless". The *Legend* button on the
map is a reminder of all this.

A `?` sits on the mob when the tip is about the mob, and **on the pack** when the tip names
the pull it is about (`packs:` in the card) — the advice is about taking that group, and the
card it happens to be written on is only where the sentence lives.

Hovering a mob in the codex highlights it on the map and dims the others; clicking a unit on
the map opens its pack and scrolls the panel to its card.

## Routes

A dungeon's **Route** tab lets you:

- paste an MDT string to import it (current `!~MDT2~` and legacy `!` formats);
- click a pack on the map to add it to the current pull (Ctrl+click targets a single mob,
  clicking again removes it);
- reorder and color the pulls, following the cumulative forces;
- unfold a pull's **briefing**: its mobs, what to interrupt there, and their traps;
- hover a mob on the map to read its entry and its worth in a column beside the map, without
  leaving the tab; right-click a mob to hold that entry in place while you compare another;
- **draw on the map**, and read back what an imported route drew;
- copy an MDT string that reimports in game.

When a route exists, the codex cards carry a pip with the pull number, and hovering a pull
highlights its mobs on the map.

### Drawing on the map

The toolbar over the map carries five tools — *Select*, *Note*, *Arrow*, *Draw* and *Erase* —
and draws what MDT itself draws, so everything here survives a round trip through the game.
*Arrow* and *Draw* take one of eight colours and three widths; the choice is yours alone and is
not part of the route, so two people in a session each keep their own. *Note* drops a pin
carrying text. *Select* moves and edits what is already there, *Erase* removes it, and
`Ctrl+Z` / `Ctrl+Shift+Z` undo and redo. `Escape` drops both the selection and the tool.

The current route is saved to `localStorage`, encoded as an MDT string — that format already
carries everything, drawings and notes included, so what an imported route drew comes back out
on re-export whether you touched it or not.

### Editing together

The route is held by a [Y.js](https://docs.yjs.dev/) document **at all times**, even outside
a session: there is therefore only one code path, and opening a session merely attaches a
network provider to it. Changes go through intent operations ("add this pack to pull 3")
rather than a wholesale replacement, which lets two people edit different pulls without
overwriting each other.

The "Edit together" box asks for your name first — it stays empty until you type one, and
*Open a session* / *Join* stay disabled until it is filled in. Once set, it is remembered for
next time, but you can still change it mid-session; everyone else sees the update without a
reconnect. The name travels as typed, in whichever language you wrote it.

*Open a session* generates a six-character code, shown next to a link
(`…#/d/<dungeon>/route?room=<code>`) that carries the same room — read the code out on Discord, or
send the link itself. The code field under *Join* only takes the code: it is six characters
wide and pasting a whole link there just truncates. A link is meant to be opened directly, and
opening it by itself connects nothing: it loads the dungeon on the Route tab and shows a card
asking whether to join, so nobody is pulled into a session by clicking a link someone else
posted; reloading that link asks again rather than reconnecting on its own.

Joining sets your local route aside rather than replacing it — you pick it back up on leaving
the room, or the next time you open the dungeon if you closed the tab first. Moving from one
room to another leaves it exactly where it was. A host has nothing set aside: its document
*is* the room, there and after everyone else leaves.

Every participant's cursor is drawn on the map, as an arrow and a name pill; yours is not
drawn a second time. Positions are shared in the map's own coordinates, so two people zoomed
in differently still point at the same mob.

Sessions meet on a relay the project runs — nothing needs configuring. If you're running your
own relay, point at it in `.env.local` (already ignored by git):

```bash
VITE_COLLAB_URL=ws://127.0.0.1:8787
```

and start it with:

```bash
npx wrangler dev --config relay/wrangler.toml
```

While a join is waiting on the relay, the panel says so alongside the empty pull it seeds in
the meantime, rather than leaving that empty route to speak for itself; if five seconds pass
with no answer, a notice appears on the map saying the relay is not answering and that your
local route is safe, with a button to leave. It clears itself if the sync lands late.

A session that goes quiet pauses itself — the tab hidden for five minutes, or visible but
untouched for fifteen — and disconnects rather than sitting there unattended. Nothing is lost
when it does: the route, the room and whatever you set aside on joining are exactly as you
left them. A *Return to the room* button in the route panel picks the connection back up.

## Tests

| Command | Role |
| --- | --- |
| `npm test` | Unit and integration tests (Vitest) — fast, no browser, nothing to start first |
| `npm run test:e2e` | The same app and relay, exercised in a real Chromium browser (Playwright) |

```bash
npm test
```

The CBOR codec is validated against the RFC 8949 appendix A vectors, and against a route
actually exported from the game: the re-encoded CBOR is byte-for-byte identical to what MDT
produced. See `src/lib/mdt/__fixtures__/README.md` to renew that fixture if a patch changes
the format.

Three quirks of the game's serializer, discovered through this fixture and documented in the
code: strings go out as CBOR major 2 (Lua only has byte strings), the compression is **raw**
deflate, and an empty table becomes an empty array (`0x80`).

```bash
npx playwright install chromium   # once, before the first run — add --with-deps on Linux, as CI does
npm run test:e2e
```

Starts a local relay and serves the real production build itself, so nothing else needs to be
running first, and drives a real two-browser join through a session — the same "Edit together"
flow described above. Ports 4173 and 8787 need to be free: reusing a server already listening on
either is deliberately disabled, so a leftover process there fails the run rather than being
silently reused.

## Continuous integration and deployment

Four separate workflows:

| Workflow | Trigger | Role |
| --- | --- | --- |
| [CI](.github/workflows/ci.yml) | pull requests, push to `main` | types, tests, build (end-to-end runs independently) |
| [Deploy](.github/workflows/deploy.yml) | **manual**, by a maintainer | end-to-end, types, tests, build, tag, publish to Pages |
| [Relay](.github/workflows/relay.yml) | **manual**, by a maintainer | tests, publish to Cloudflare Workers |
| [End-to-end](.github/workflows/e2e.yml) | called by CI and by Deploy, or dispatched by hand | the Chromium suite against a real build and a local relay |

`e2e.yml` is the one definition both CI and Deploy call (`workflow_call`), so there is a single
place that says what an end-to-end run is; manual dispatch stays available for checking it on its
own.

Going live is a deliberate gesture: nothing ships automatically. From the *Actions* tab →
*Deploy* → *Run workflow*, you pick the branch or tag to publish.

The deployment replays the types and the tests rather than relying on CI, and before the build
step can even start, the same Chromium suite CI runs has to pass — a failure there stops the
build from starting rather than being caught afterward. Being manual, it can target any ref —
including a commit CI has never seen — so it cannot inherit any guarantee. What used to be a
minute of checking is now a browser run first and that minute after, in exchange for not being
able to publish a broken build.

Every publication lays down a `vYYYY.MM.DD-<run number>` tag, so you can tell at a glance
which commit is online. The name can be overridden at launch, and tagging can be turned off.
Laying the tag is idempotent: an already-present tag does not interrupt the deployment.

**To do once**, in the repository settings: *Settings → Pages → Source* → **GitHub Actions**.
Without it, the workflow fails at the deployment step.

The workflow runs **no** extraction script: they need a WoW installation, which does not
exist on the runner. Since the data and the assets are versioned, the build stands on its
own. After an `npm run data` locally, the result must therefore be committed for the live
site to update.

For a manual build:

```bash
npm run build
```

Produces a static `dist/` of about 6 MB. Asset paths are relative and routing is hash-based,
so the site works just as well at the root of a domain as in a subpath like
`/keystone-codex/`, with no server-side URL rewriting.

## Licence and sources

keystone-codex is under the **GNU General Public License, version 2** — see
[LICENSE](LICENSE). That is MDT's licence, and this project redistributes MDT material:
mob data, clones, packs and forces are extracted from its dungeon files, and one of them is
committed verbatim as a test fixture.

Mob data, maps and positions come from
[Mythic Dungeon Tools](https://github.com/Nnoggie/MythicDungeonTools). Spell names, icons and
descriptions come via Wowhead.

Maps, icons, portraits and spell text are World of Warcraft material and belong to Blizzard
Entertainment; no licence granted here applies to them. This project is neither affiliated
with nor endorsed by Blizzard Entertainment. [NOTICE.md](NOTICE.md) says which file comes
from where.
