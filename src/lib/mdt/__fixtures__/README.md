# In-game compatibility fixtures

`real-export.txt` and `real-export-strokes.txt` each hold a string exported from MDT in game.
They are the only thing that proves a string produced here will be accepted by the game — the
other tests only validate our own internal consistency and RFC 8949 conformance.

`real-export-strokes.txt` exists because `real-export.txt` carries notes only: it is the
fixture behind `luaToObjects`'s stroke and arrow tests in `objects.test.ts`. Its `objects`
table holds 11 entries — 8 notes and 3 strokes: one freehand line, drawn with 108 points, and
two 2-point arrows. (Two arrows, not one — the stroke tests check for exactly that.)

The test compares the **decompressed CBOR**, not the final string: two correct deflate
compressors produce different streams for the same input, and the game decompresses both.
The invariant that matters is that the serialized bytes coincide.

## Both fixtures have been anonymized

Only the bytes of the `text` field (the route's own name) and, where present, the
`createdBy` table's `name` and `realm` fields were rewritten, by
`scripts/patch-fixture-name.mjs`. In `real-export.txt`, 958 of the original 982 bytes are
intact, exactly as the game emitted them.

The patch is surgical on purpose. Decoding then re-encoding the whole fixture with our own
encoder would have made the test **circular** — it would have compared our code to itself and
proved nothing about in-game compatibility. By patching in place, the test keeps verifying
that our encoder reproduces MDT's byte layout for maps, arrays, floats, integers, booleans
and sparse indices.

## What this fixture caught

Three divergences only a real export could reveal, all found and fixed thanks to it:

1. **Strings in major 2.** Lua only has byte strings: `C_EncodingUtil.SerializeCBOR` emits
   major 2 (byte string), never major 3 (text string). Our decoder was therefore returning a
   `Uint8Array` where a table key was expected.
2. **Raw deflate.** `Enum.CompressionMethod.Deflate` writes no zlib header.
3. **Empty table.** `{}` goes out as an empty array (`0x80`), not an empty map (`0xa0`). That
   was the last divergence, one byte out of 982.

## Renewing a fixture

If a patch changes the format, export a new route from MDT, replace the contents of the
fixture, then re-anonymize it with `scripts/patch-fixture-name.mjs "weekly route" <path>`
(the path defaults to `real-export.txt`). Both tests are skipped automatically when their
fixture is absent, so the repository stays testable without either.
