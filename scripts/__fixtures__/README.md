# MDT source fixture

`AltarOfFangs.lua` is one of Mythic Dungeon Tools' dungeon files, committed **verbatim**.

> **Licence.** This file is not ours. It comes from
> [Mythic Dungeon Tools](https://github.com/Nnoggie/MythicDungeonTools) and is under
> **GPL-2.0**, like the rest of that addon — which is why keystone-codex is GPL-2.0 too.
> See [NOTICE.md](../../NOTICE.md). Do not edit it: it is only useful unmodified.

## Why it is here

The extraction chain reads the local WoW install. CI has none, and a contributor may not have
one either — yet a regression in the parser corrupts mobs, packs and forces silently, without
failing a single build. So the parsing lives in `mdt-dungeon.mjs`, apart from the file reading,
and is exercised against this fixture instead of against whatever happens to be installed.

## Why the whole file, untouched

Trimming it to "just a few mobs" would mean transforming it, and the interesting cases are
exactly the ones a trim would remove: clone indices with holes in them, patrol paths, locale
lookups (`L["…"]`), string concatenation in `customTextures`, and mobs immune to every crowd
control. The file is 34 KB — smaller than several source files in this repository.

Unlike `src/lib/mdt/__fixtures__/real-export.txt`, nothing is anonymised: this is public data
from an open-source addon, with no player name in it.

## Refreshing it

Copy the file over from a WoW install after an MDT update:

```
cp "<MDT_PATH>/Midnight/AltarOfFangs.lua" scripts/__fixtures__/
```

Then run `npm test`. The tests assert real values read from this dungeon — 21 mobs, 157
clones, 46 packs, 817 required forces — so a patch that changes the dungeon will fail them.
That is the point: the failure tells you the pool moved, and you update the numbers
deliberately rather than discovering the drift months later in the app.

## MythicDungeonTools.toc

The addon's own `.toc`, copied verbatim from a 6.2.2 install. It is the input
`parseTocVersion` claims to read, and the version line's exact spelling — `## Version:`, double
hash, one space — is the whole subject of that parser. A hand-written stand-in would assert our
guess about a file format instead of testing it.

## altar-of-fangs.with-affix.json / .without-affix.json

Two real versions of one generated dungeon, taken from both sides of commit `e520646`, which
dropped the seasonal affix from the extraction. Eleven mobs lose spell `1221063` between them.

Both sides are output of the real pipeline, and the change they carry is exactly the case the
report exists for: a spell leaving a mob takes the card's note off the site with it. A
hand-written pair would encode our own idea of what an MDT update does to a dungeon, which is the
one thing a differ must not be tested against.
