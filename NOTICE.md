# Notices and third-party material

keystone-codex is licensed under the **GNU General Public License, version 2** — see
[LICENSE](LICENSE).

    keystone-codex — codex and interactive map for World of Warcraft Mythic+ dungeons
    Copyright (C) 2026 Dudesons

    This program is free software; you can redistribute it and/or modify it under the terms
    of the GNU General Public License as published by the Free Software Foundation; either
    version 2 of the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
    without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
    See the GNU General Public License for more details.

That licence covers **this project's own source code**. A large part of what this repository
distributes was made by other people. It is listed below so that anyone reusing this work
knows what they are actually reusing — and so that the parts no licence of ours can grant are
named rather than glossed over.

## Mythic Dungeon Tools — GPL-2.0

[Mythic Dungeon Tools](https://github.com/Nnoggie/MythicDungeonTools) is licensed under
GPL-2.0. keystone-codex is licensed the same way because it redistributes MDT material:

| Path | What it is |
| --- | --- |
| `scripts/__fixtures__/AltarOfFangs.lua` | one of MDT's dungeon files, copied **verbatim** as a test fixture |
| `scripts/__fixtures__/MythicDungeonTools.toc` | the addon's own metadata file, copied **verbatim** as a test fixture |
| `src/data/generated/*.json` | mob, clone, pack and force data extracted from MDT's dungeon files |

`src/lib/mdt/` reimplements MDT's share-string format (CBOR over raw deflate) so that routes
can be exchanged with the addon. It is an independent implementation written from the
observed format; it contains no MDT code.

## Blizzard Entertainment — all rights reserved

The following is World of Warcraft material. **No licence granted by this project applies to
it**, and MDT could not license it either — redistributing it here follows the same practice
as every fan tool in this space, on a non-commercial basis:

| Path | What it is |
| --- | --- |
| `public/maps/*.webp` | dungeon maps, recomposed from MDT's texture tiles — which are game art |
| `public/icons/*.jpg` | spell icons |
| `public/portraits/*.webp` | creature portraits |
| `src/data/generated/spells.json` | spell names and descriptions |

Mob names, dungeon names and spell names throughout the codex are likewise Blizzard's.

World of Warcraft and Blizzard Entertainment are trademarks or registered trademarks of
Blizzard Entertainment, Inc. This project is neither affiliated with nor endorsed by Blizzard
Entertainment.

## Wowhead

Spell labels are fetched from `nether.wowhead.com`, icons and portraits from `wow.zamimg.com`
— see `scripts/fetch-assets.mjs`. These are retrieved once at build time and committed; the
published site makes no request to Wowhead.

## Runtime and build dependencies

The npm packages listed in `package.json` keep their own licences. See `node_modules/` after
an install, or `npm ls --long` for the full list.
