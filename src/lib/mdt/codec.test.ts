import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import pako from 'pako'
import { decodeCbor, encodeCbor, isLuaArray, luaToJs, type LuaTable, type LuaValue } from './cbor'
import { decodeMdtString, deserializeAce, encodeMdtString } from './string'
import { luaToRoute, routeToLua } from './route'
import { MdtUserError } from './errors'

const hex = (s: string) => new Uint8Array(s.match(/../g)!.map((b) => parseInt(b, 16)))
const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

/** A Lua table literal, to keep the tests light. */
const lua = (...entries: [number | string, LuaValue][]): LuaTable => new Map(entries)
/** A Lua sequence 1..n. */
const seq = (...values: LuaValue[]): LuaTable => new Map(values.map((v, i) => [i + 1, v]))

describe('CBOR — RFC 8949 vectors', () => {
  // These vectors come from appendix A of the RFC. They validate our implementation
  // independently of MDT: if the game conforms and so do we, the two agree.
  const vectors: [string, LuaValue][] = [
    ['00', 0],
    ['01', 1],
    ['0a', 10],
    ['17', 23],
    ['1818', 24],
    ['1819', 25],
    ['1864', 100],
    ['1903e8', 1000],
    ['1a000f4240', 1000000],
    ['20', -1],
    ['29', -10],
    ['3863', -100],
    ['3903e7', -1000],
    ['f4', false],
    ['f5', true],
    ['f6', null],
  ]

  it.each(vectors)('decodes %s', (encoded, expected) => {
    expect(decodeCbor(hex(encoded))).toEqual(expected)
  })

  it.each(vectors)('re-encodes %s identically', (encoded, expected) => {
    expect(toHex(encodeCbor(expected))).toBe(encoded)
  })

  it('decodes text strings (major 3) as readily as byte strings (major 2)', () => {
    expect(decodeCbor(hex('60'))).toBe('')
    expect(decodeCbor(hex('6161'))).toBe('a')
    expect(decodeCbor(hex('6449455446'))).toBe('IETF')
    expect(decodeCbor(hex('40'))).toBe('')
    expect(decodeCbor(hex('4161'))).toBe('a')
    expect(decodeCbor(hex('4449455446'))).toBe('IETF')
  })

  it("encodes strings as major 2, like the game's serializer", () => {
    // Lua only has byte strings: `C_EncodingUtil.SerializeCBOR` emits major 2. Verified on a
    // real export — emitting major 3 would break byte-for-byte equality.
    expect(toHex(encodeCbor(''))).toBe('40')
    expect(toHex(encodeCbor('a'))).toBe('4161')
    expect(toHex(encodeCbor('IETF'))).toBe('4449455446')
  })

  it('decodes floats at every precision', () => {
    expect(decodeCbor(hex('fb3ff199999999999a'))).toBeCloseTo(1.1, 12)
    expect(decodeCbor(hex('f93e00'))).toBeCloseTo(1.5, 6) // half precision
    expect(decodeCbor(hex('fa47c35000'))).toBeCloseTo(100000, 6) // single precision
  })

  it('encodes non-integers in double precision', () => {
    expect(toHex(encodeCbor(1.1))).toBe('fb3ff199999999999a')
  })

  it('decodes a CBOR array into a Lua table indexed from 1', () => {
    expect(decodeCbor(hex('83010203'))).toEqual(seq(1, 2, 3))
  })

  it('decodes an integer-keyed map while preserving the keys', () => {
    expect(decodeCbor(hex('a201020304'))).toEqual(lua([1, 2], [3, 4]))
  })

  it('handles nested structures', () => {
    // ["a", {"b": "c"}]
    expect(decodeCbor(hex('826161a161626163'))).toEqual(seq('a', lua(['b', 'c'])))
  })

  it('handles indefinite lengths', () => {
    expect(decodeCbor(hex('9f018202039f0405ffff'))).toEqual(seq(1, seq(2, 3), seq(4, 5)))
  })
})

describe('CBOR — Lua table semantics', () => {
  it('serializes as an array only when the keys are a contiguous 1..n', () => {
    expect(isLuaArray(seq('a', 'b'))).toBe(true)
    expect(isLuaArray(lua([1, 'a'], [3, 'b']))).toBe(false) // sparse: stays a map
    expect(isLuaArray(lua([1, 'a'], ['color', 'ff0000']))).toBe(false) // mixed keys
  })

  it('encodes an empty table as an empty array, like the game', () => {
    // `enemyAssignments = {}` goes out as 0x80 on the game side, not 0xa0.
    expect(toHex(encodeCbor(new Map()))).toBe('80')
    expect(decodeCbor(hex('80'))).toEqual(new Map())
    expect(decodeCbor(hex('a0'))).toEqual(new Map())
  })

  it('preserves sparse indices, as MDT uses them for clones', () => {
    // A real pull looks like this: sparse integer keys plus a text key.
    const pull = lua([3, seq(8, 13)], [7, seq(2)], ['color', 'ff3eff'])
    const round = decodeCbor(encodeCbor(pull))
    expect(round).toEqual(pull)
  })

  it('round-trips a preset structure byte for byte', () => {
    const preset = lua(
      ['text', 'My route'],
      ['difficulty', 23],
      [
        'value',
        lua(
          ['currentDungeonIdx', 164],
          ['currentSublevel', 1],
          ['currentPull', 1],
          ['pulls', seq(lua([1, seq(1, 2)], ['color', 'ff3eff']))],
        ),
      ],
    )
    const once = encodeCbor(preset)
    const twice = encodeCbor(decodeCbor(once))
    expect(toHex(twice)).toBe(toHex(once))
  })

  it('converts to readable JS', () => {
    expect(luaToJs(seq('a', 'b'))).toEqual(['a', 'b'])
    expect(luaToJs(lua(['color', 'red']))).toEqual({ color: 'red' })
  })
})

describe('AceSerializer (legacy format)', () => {
  it('deserializes the basic types', () => {
    expect(deserializeAce('^1^Shello^^')).toBe('hello')
    expect(deserializeAce('^1^N42^^')).toBe(42)
    expect(deserializeAce('^1^B^^')).toBe(true)
    expect(deserializeAce('^1^b^^')).toBe(false)
  })

  it('deserializes a table with mixed keys', () => {
    // { [1] = "a", color = "ff0000" }
    expect(deserializeAce('^1^T^N1^Sa^Scolor^Sff0000^t^^')).toEqual(
      lua([1, 'a'], ['color', 'ff0000']),
    )
  })

  it('unescapes the special characters', () => {
    expect(deserializeAce('^1^Sa~}b^^')).toBe('a^b') // ~} -> ^
    expect(deserializeAce('^1^Sa~|b^^')).toBe('a~b') // ~| -> ~
  })

  it('rebuilds a float from mantissa and exponent', () => {
    // ^F<m>^f<e> is m * 2^e, the mantissa having been multiplied by 2^53.
    expect(deserializeAce('^1^F4953959590107546^f-52^^')).toBeCloseTo(1.1, 10)
  })
})

describe('MDT route', () => {
  const preset = lua(
    ['text', 'k0'],
    ['difficulty', 23],
    [
      'value',
      lua(
        ['currentDungeonIdx', 164], // Altar of Fangs
        ['currentSublevel', 1],
        ['currentPull', 1],
        [
          'pulls',
          seq(
            lua([1, seq(1, 2)], ['color', 'ff3eff']),
            lua([2, seq(5)], [4, seq(1, 3)], ['color', '3eb0ff']),
          ),
        ],
      ),
    ],
  )

  it('reads the pulls with their MDT indices', () => {
    const route = luaToRoute(preset)
    expect(route.name).toBe('k0')
    expect(route.slug).toBe('altar-of-fangs')
    expect(route.pulls).toHaveLength(2)
    expect(route.pulls[0].clones).toEqual([
      { enemyIdx: 1, cloneIdx: 1 },
      { enemyIdx: 1, cloneIdx: 2 },
    ])
    expect(route.pulls[1].color).toBe('3eb0ff')
    expect(route.pulls[1].clones).toHaveLength(3)
  })

  it('refuses a dungeon outside the season pool', () => {
    const other = lua(['value', lua(['currentDungeonIdx', 999])])
    // Assert on the code, not the sentence: the sentence is translated in the UI, the code is
    // the contract between the codec and the route panel.
    expect(() => luaToRoute(other)).toThrow(MdtUserError)
    try {
      luaToRoute(other)
      expect.unreachable('luaToRoute should have thrown')
    } catch (err) {
      expect((err as MdtUserError).code).toBe('notInPool')
      expect((err as MdtUserError).params).toEqual({ mdtIndex: 999 })
    }
  })

  it('refuses a preset with no `value` field', () => {
    try {
      luaToRoute(lua(['text', 'no value']))
      expect.unreachable('luaToRoute should have thrown')
    } catch (err) {
      expect((err as MdtUserError).code).toBe('noValue')
    }
  })

  it('round-trips preset -> route -> preset without loss', () => {
    const round = luaToRoute(routeToLua(luaToRoute(preset)))
    expect(round.pulls).toEqual(luaToRoute(preset).pulls)
    expect(round.name).toBe('k0')
  })

  it('preserves the preset fields it does not understand on re-export', () => {
    const withExtras = new Map(preset)
    withExtras.set('objects', seq(lua(['t', 'note'])))
    withExtras.set('wagoID', 'hH8oS8VqB')
    const out = routeToLua(luaToRoute(withExtras))
    expect(out.get('wagoID')).toBe('hH8oS8VqB')
    expect(out.get('objects')).toEqual(seq(lua(['t', 'note'])))
  })
})

describe('Full MDT string', () => {
  it('round-trips string -> table -> string', () => {
    const preset = lua(
      ['text', 'Test'],
      ['value', lua(['currentDungeonIdx', 164], ['pulls', seq(lua([1, seq(1)], ['color', 'ff3eff']))])],
    )
    const encoded = encodeMdtString(preset)
    expect(encoded.startsWith('!~MDT2~')).toBe(true)

    const decoded = decodeMdtString(encoded)
    expect(decoded.format).toBe('mdt2')
    expect(decoded.table).toEqual(preset)

    // Re-encoding has to be stable.
    expect(encodeMdtString(decoded.table, decoded.deflate)).toBe(encoded)
  })

  it('rejects a string that is not MDT, with a code the UI can translate', () => {
    const codes = ['hello', ''].map((input) => {
      try {
        decodeMdtString(input)
        return 'no error'
      } catch (err) {
        return err instanceof MdtUserError ? err.code : `untranslatable error: ${err}`
      }
    })
    expect(codes).toEqual(['unknownFormat', 'emptyString'])
  })
})

/**
 * Validation against a string actually exported by the game.
 *
 * This is the only test proving in-game compatibility: the others merely validate our own
 * internal consistency. Paste an MDT export into the file below to enable it.
 */
describe('In-game compatibility', () => {
  const fixture = path.join(__dirname, '__fixtures__', 'real-export.txt')
  const raw = fs.existsSync(fixture) ? fs.readFileSync(fixture, 'utf8').trim() : ''
  const run = raw ? it : it.skip

  run('decodes a string exported from MDT', () => {
    const decoded = decodeMdtString(raw)
    expect(decoded.table.has('value')).toBe(true)
    const route = luaToRoute(decoded.table)
    expect(route.pulls.length).toBeGreaterThan(0)
    console.log(
      `Route "${route.name}": ${route.pulls.length} pulls, format ${decoded.format}, deflate ${decoded.deflate}`,
    )
  })

  run("re-encodes CBOR byte for byte identical to the game's", () => {
    const decoded = decodeMdtString(raw)
    if (decoded.format !== 'mdt2') return

    // We compare the CBOR payload, not the final string: two correct deflate implementations
    // produce different streams for the same input, and the game decompresses both. The
    // invariant proving compatibility is that the serialized bytes coincide.
    const original = pako.inflateRaw(
      Uint8Array.from(atob(raw.slice('!~MDT2~'.length)), (c) => c.charCodeAt(0)),
    )
    expect(toHex(encodeCbor(decoded.table))).toBe(toHex(original))
  })

  run('produces a string our own decoder reads back identically', () => {
    const decoded = decodeMdtString(raw)
    const reencoded = encodeMdtString(decoded.table, decoded.deflate)
    expect(decodeMdtString(reencoded).table).toEqual(decoded.table)
  })
})
