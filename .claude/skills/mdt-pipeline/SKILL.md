---
name: mdt-pipeline
description: How keystone-codex reads Mythic Dungeon Tools — extracting the .lua files into versioned JSON, and the share-string codec (CBOR + raw deflate). Read before touching src/lib/mdt/, scripts/, src/data/generated/ or the real-export fixture.
---

# MDT pipeline

Two distinct bridges connect keystone-codex to Mythic Dungeon Tools. Do not confuse them:
they run at different times and are held to different constraints.

| | Extraction | String codec |
| --- | --- | --- |
| When | Offline, on demand (`npm run data`) | At runtime, in the browser |
| Input | `MythicDungeonTools/<Expansion>/*.lua` | A `!~MDT2~…` string pasted by the user |
| Output | `src/data/generated/*.json`, `public/maps/` | An in-memory Lua table, then a route |
| Code | `scripts/*.mjs` | `src/lib/mdt/` |
| Hard constraint | The app **never** reads the WoW install at runtime | **Byte-for-byte** fidelity with the game's serializer |

---

## 1. Extraction (`scripts/`, `npm run data`)

`npm run data` chains four scripts, in this order and for a reason:

| Script | Input → output |
| --- | --- |
| `extract` — [extract-mdt.mjs](../../../scripts/extract-mdt.mjs) | `Midnight/*.lua` → `src/data/generated/*.json` (mobs, clones, packs, forces, spells) |
| `build:maps` — [build-maps.mjs](../../../scripts/build-maps.mjs) | 150 PNG tiles (15×10 of 128 px) → one 1920×1280 WebP per dungeon |
| `fetch:assets` — [fetch-assets.mjs](../../../scripts/fetch-assets.mjs) | Spell IDs from the extraction → names, icons, descriptions (Wowhead), per locale; mob portraits |
| `scaffold` — [scaffold-content.mjs](../../../scripts/scaffold-content.mjs) | The mob list → missing `content/<dungeon>/*.md` entries |

`fetch:assets` and `scaffold` consume what `extract` produced. Re-running them alone after
changing the extraction is legitimate; the reverse is not.

### Configuration: [scripts/config.mjs](../../../scripts/config.mjs)

The **only** file to edit when changing season or machine.

- `MDT_PATH` — the addon root, overridable by environment variable. Defaults to
  `D:\jeux\World of Warcraft\_retail_\Interface\AddOns\MythicDungeonTools`.
- `MDT_EXPANSION` — the expansion subfolder. Defaults to `Midnight`.
- `SEASON_DUNGEONS` — the `.lua` filenames of the current pool. **Everything else** — dungeon
  index, total forces, `mapID` — is read from those files; nothing else is hardcoded.
- `MDT_GEOMETRY` — MDT's coordinate space (840×560, from `MainFrame.lua`) and the tile grid.
  If a map renders offset, the cause is here, not in the React component.
- `WOWHEAD_LOCALES` — the languages spell and creature labels are fetched in. See the `i18n`
  skill before adding one: the Wowhead locale codes were established by probing, not by
  documentation.

### The sparse-index trap

**MDT's mob and clone indices have holes, and must keep them.** Deleting a mob in MDT leaves
a gap (`clones = { [8] = …, [13] = … }`), and those indices are exactly what routes
reference. Renumbering them would silently break every existing route, imported or saved.

`intEntries()` in `extract-mdt.mjs` sorts without ever compacting. If you add a pass that
iterates over mobs, iterate over keys, not over array positions.

The map-tile arithmetic lives in [tile-layout.mjs](../../../scripts/tile-layout.mjs), split
out of `build-maps.mjs` so it can be tested without a WoW install — the same reasoning: a
one-index slip offsets an entire map without failing a build.

### Writing extraction code

The hand-rolled Lua parser is [lua-table.mjs](../../../scripts/lua-table.mjs):
`parseAssignment`, then `toPlain`. Values coming from `L["X"]` arrive wrapped in a `LuaExpr`
carrying their literal — `unwrap()` unfolds them. Do not pull in a third-party Lua parser
without discussing it: the existing file is calibrated on what MDT actually writes.

`readDungeonSource()` throws an explicit error when a `.lua` file is missing, with the full
path and a reminder of the environment variables. Keep that level of diagnostic: this script
runs on someone's machine without the code in front of them.

---

## 2. The string codec (`src/lib/mdt/`)

### Two formats read, one written

[string.ts](../../../src/lib/mdt/string.ts) reads both formats from `Transmission.lua`:

- **MDT2** (current): `!~MDT2~` + standard Base64 + deflate + CBOR;
- **legacy**: `!` + LibDeflate's 6-bit encoding + deflate + AceSerializer rev 1.

Legacy stays read-only and will remain so: many routes published on Wago are still in that
format. We **always** write MDT2, which is what the game produces today.

### Three quirks of the game's serializer

Found through a real export, fixed, and not to be "simplified" away:

1. **Strings are CBOR major 2, not major 3.** Lua only has byte strings, so
   `C_EncodingUtil.SerializeCBOR` emits *byte strings*. A decoder assuming major 3 hands back
   a `Uint8Array` where a table key was expected.
2. **Raw deflate**, with no zlib header — `Enum.CompressionMethod.Deflate` writes none.
   `inflateAuto()` tries raw first and falls back to zlib, and `DecodedMdt.deflate` records
   which variant was seen so the string can be re-encoded identically.
3. **An empty table serializes as an empty array (`0x80`)**, not an empty map (`0xa0`).

### The array/map rule in [cbor.ts](../../../src/lib/mdt/cbor.ts)

A Lua table is a `Map` whose integer keys stay **1-based**, exactly as in Lua. A CBOR array
decodes to `Map {1:…, 2:…}` and re-encodes as an array **if and only if** its keys are a
contiguous `1..n`. That is the exact inverse, and it is what makes the round trip stable. The
CBOR layer is hand-written rather than taken off the shelf precisely to keep that control —
do not replace this module with a library.

### Never lose what we cannot edit

An MDT preset carries drawings, notes, rift offsets, assignments. We only know how to edit
`value.pulls`. [route.ts](../../../src/lib/mdt/route.ts) therefore keeps the original Lua
table in `Route.source`, and `routeToLua()` starts from that table: re-exporting an imported
route hands it back to the game intact.

**Any change to the route model must preserve that property.** If you add a field, write it
into the copy of the source table; do not rebuild the table from scratch.

That is also why `localStorage` stores the route **encoded as an MDT string** rather than as
bespoke JSON: the format already carries everything.

---

## 3. Tests (`npm test`)

[codec.test.ts](../../../src/lib/mdt/codec.test.ts) validates along two axes:

- the vectors from **RFC 8949 appendix A** — CBOR conformance;
- a **route actually exported from the game**, `__fixtures__/real-export.txt` — in-game
  compatibility. It is the only thing proving a string produced here will be accepted by WoW.

The test compares the **decompressed CBOR**, not the final string: two correct deflate
implementations produce different streams for the same input, and the game decompresses both.
The invariant that matters is that the serialized bytes match.

### Do not make the test circular

The route name in the fixture was anonymized **surgically** by
[patch-fixture-name.mjs](../../../scripts/patch-fixture-name.mjs): only the bytes of the
`text` field were rewritten, and 958 of the original 982 bytes are the ones the game emitted.

Decoding and re-encoding the whole fixture with our own encoder would compare our code to
itself and prove nothing. If you must touch the fixture, patch it in place.

Fixture tests are **skipped when the file is absent**, so the repository stays testable
without it. To refresh it after a game patch: export a route from MDT, replace the contents
of `real-export.txt`, re-anonymize. See
[__fixtures__/README.md](../../../src/lib/mdt/__fixtures__/README.md).

---

## Checklist before committing a pipeline change

1. `npm test` — green, fixture tests included (check they are not reported as *skipped*).
2. `npm run typecheck`.
3. If `src/data/generated/` or `public/maps/` changed: **commit the result**. CI runs no
   extraction script — there is no WoW on the runner — so the live site only moves when the
   generated files are versioned.
4. If the codec changed: re-import a real route in game before calling it done. The tests
   prove serialization, not acceptance by the client.
