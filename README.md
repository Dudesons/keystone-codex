# Keystone Codex

Codex and interactive map for World of Warcraft Mythic+ dungeons, currently tuned to the
**Midnight season 2** pool. Every dungeon gets its MDT map with the real, clickable packs, a
card per mob, and a route editor that imports and exports MDT strings — with other people if
you want.

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
role: melee               # caster | melee | patrol | miniboss | add
spells:
  - id: 1306911
    tag: tank             # kick | dodge | dispel | tank | soak | ignore
    prio: 1
    note: "581k physical on the current target."
trap: "Immune to every CC: you have to burst it."
---

Free-form prose: positioning, focus order, cooldowns.
```

`threat` and `tag` drive the rendering (colors, spell ordering by kick priority). A spell
without a `note` falls back to its Wowhead description, and a mob without a file is still
displayed with its MDT data alone — the codex fills in gradually without ever breaking the
app.

The dev server hot-reloads: saving a `.md` updates the card immediately.

`content/<dungeon>/_dungeon.md` carries the timer, the summary and the route plan of the
dungeon.

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

## Reading the map

Every unit is a circular portrait, like in MDT. The information reads on three levels:

- **The ring** gives the threat level (`threat` in the card): red for lethal, orange for
  dangerous, gold for watch-out, green for harmless, amber for a boss, grey when it has not
  been assessed yet.
- **The pips** above the portrait flag `K` a spell to interrupt, `T` a tank buster, `D` a
  dispellable spell.
- **The outlines** surround packs in Codex mode, and pulls (with their number) in Route mode.

`K` and `D` are **derived from MDT** — 75 interruptible spells and 108 dispel types are
already filled in without you writing anything. `T` and the threat level come from the
cards: their absence means "not assessed yet", not "harmless". The *Legend* button on the
map is a reminder of all this.

Hovering a mob in the codex highlights it on the map and dims the others; clicking a unit on
the map opens its pack and scrolls the panel to its card.

## Routes

A dungeon's **Route** tab lets you:

- paste an MDT string to import it (current `!~MDT2~` and legacy `!` formats);
- click a pack on the map to add it to the current pull (Ctrl+click targets a single mob,
  clicking again removes it);
- reorder and color the pulls, following the cumulative forces;
- unfold a pull's **briefing**: its mobs, what to interrupt there, and their traps;
- copy an MDT string that reimports in game.

When a route exists, the codex cards carry a pip with the pull number, and hovering a pull
highlights its mobs on the map.

The current route is saved to `localStorage`, encoded as an MDT string — that format already
carries everything, including the drawings and notes of an imported route that we cannot
edit and hand back untouched on re-export.

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
(`…#/d/<dungeon>?room=<code>`) that carries the same room — read the code out on Discord, or
send the link itself. The code field under *Join* only takes the code: it is six characters
wide and pasting a whole link there just truncates. A link is meant to be opened directly, and
opening it by itself connects nothing: it loads the dungeon in route mode and shows a card
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

## Tests

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

## Continuous integration and deployment

Two separate workflows:

| Workflow | Trigger | Role |
| --- | --- | --- |
| [CI](.github/workflows/ci.yml) | pull requests, push to `main` | types, tests, build |
| [Deploy](.github/workflows/deploy.yml) | **manual**, by a maintainer | types, tests, build, tag, publish to Pages |

Going live is a deliberate gesture: nothing ships automatically. From the *Actions* tab →
*Deploy* → *Run workflow*, you pick the branch or tag to publish.

The deployment replays the types and the tests rather than relying on CI. Being manual, it
can target any ref — including a commit CI has never seen — so it cannot inherit any
guarantee. One minute of checking in exchange for not being able to publish a broken build.

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
