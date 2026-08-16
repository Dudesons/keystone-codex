import { describe, expect, it } from 'vitest'
import { LuaExpr, parseAssignment, parseTableAt, toPlain } from './lua-table.mjs'

/** A backslash, built rather than written, so escape sequences stay readable below. */
const BS = String.fromCharCode(92)

const parse = (src) => parseTableAt(src, 0).value

describe('Table literals', () => {
  it('reads an empty table', () => {
    expect(parse('{}')).toEqual(new Map())
  })

  it('keys positional values from 1, as Lua does', () => {
    expect(parse('{ "a", "b", "c" }')).toEqual(new Map([[1, 'a'], [2, 'b'], [3, 'c']]))
  })

  it('reads bracketed string and integer keys', () => {
    expect(parse('{ ["name"] = "Mob", [3] = true }')).toEqual(
      new Map([['name', 'Mob'], [3, true]]),
    )
  })

  it('reads bare keys', () => {
    expect(parse('{ name = "Mob", count = 25 }')).toEqual(
      new Map([['name', 'Mob'], ['count', 25]]),
    )
  })

  it('mixes keyed and positional entries', () => {
    expect(parse('{ "first", name = "Mob", [9] = "ninth" }')).toEqual(
      new Map([[1, 'first'], ['name', 'Mob'], [9, 'ninth']]),
    )
  })

  it('nests tables', () => {
    const table = parse('{ enemy = { clones = { { x = 1 } } } }')
    const clones = table.get('enemy').get('clones')
    expect(clones.get(1)).toEqual(new Map([['x', 1]]))
  })

  it('accepts both separators, and a trailing one', () => {
    expect(parse('{ 1, 2, }')).toEqual(new Map([[1, 1], [2, 2]]))
    expect(parse('{ 1; 2; 3 }')).toEqual(new Map([[1, 1], [2, 2], [3, 3]]))
  })

  it('skips line comments', () => {
    expect(parse('{ -- a note\n 1, -- another\n 2 }')).toEqual(new Map([[1, 1], [2, 2]]))
  })

  it('lets an explicit key win over the positional slot it collides with', () => {
    // MDT never writes this, but the resolution has to be defined: last assignment wins.
    expect(parse('{ "positional", [1] = "explicit" }')).toEqual(new Map([[1, 'explicit']]))
    expect(parse('{ [1] = "explicit", "positional" }')).toEqual(new Map([[1, 'positional']]))
  })
})

describe('Sparse integer keys', () => {
  /**
   * This is the invariant the whole extraction rests on. Deleting a clone in MDT leaves a
   * hole, and routes reference those indices: compacting them would silently break every
   * saved route.
   */
  it('preserves holes instead of renumbering', () => {
    expect(parse('{ [8] = "a", [13] = "b" }')).toEqual(new Map([[8, 'a'], [13, 'b']]))
  })

  it('keeps a lone clone at its original index', () => {
    // Real shape: kings-rest has a mob whose only clone carries index 4.
    const clones = parse('{ clones = { [4] = { x = 1.5 } } }').get('clones')
    expect([...clones.keys()]).toEqual([4])
    expect(clones.has(1)).toBe(false)
  })
})

describe('Strings', () => {
  it('accepts both quote styles', () => {
    expect(parse('{ "double", ' + "'single'" + ' }')).toEqual(
      new Map([[1, 'double'], [2, 'single']]),
    )
  })

  it('resolves named escapes', () => {
    expect(parse('{ "a' + BS + 'nb' + BS + 'tc" }').get(1)).toBe('a\nb\tc')
  })

  it('resolves an escaped quote and an escaped backslash', () => {
    expect(parse('{ "say ' + BS + '"hi' + BS + '"" }').get(1)).toBe('say "hi"')
    expect(parse('{ "Interface' + BS + BS + 'AddOns" }').get(1)).toBe('Interface' + BS + 'AddOns')
  })

  it('resolves decimal escapes', () => {
    expect(parse('{ "' + BS + '65' + BS + '66" }').get(1)).toBe('AB')
  })

  it('keeps the character behind an unknown escape', () => {
    expect(parse('{ "a' + BS + 'qb" }').get(1)).toBe('aqb')
  })

  it('refuses an unterminated string', () => {
    expect(() => parse('{ "abc }')).toThrow()
  })
})

describe('Numbers', () => {
  it('reads integers, negatives and decimals', () => {
    expect(parse('{ 42, -7, 3.5, -3.5 }')).toEqual(
      new Map([[1, 42], [2, -7], [3, 3.5], [4, -3.5]]),
    )
  })

  it('reads a leading-dot decimal', () => {
    expect(parse('{ .5 }').get(1)).toBe(0.5)
  })

  it('reads exponents in both cases', () => {
    expect(parse('{ 1e3, 2E-2 }')).toEqual(new Map([[1, 1000], [2, 0.02]]))
  })

  it('reads hexadecimal literals', () => {
    expect(parse('{ 0xFF }').get(1)).toBe(255)
  })
})

describe('Booleans and nil', () => {
  it('reads booleans', () => {
    expect(parse('{ true, false }')).toEqual(new Map([[1, true], [2, false]]))
  })

  it('reads nil as null, keeping the slot', () => {
    const table = parse('{ nil }')
    expect(table.get(1)).toBeNull()
    expect(table.has(1)).toBe(true)
  })
})

describe('Expressions we do not reduce', () => {
  it('captures the localized string behind L["Name"]', () => {
    const expr = parse('{ L["Altar of Fangs"] }').get(1)
    expect(expr).toBeInstanceOf(LuaExpr)
    expect(expr.literal).toBe('Altar of Fangs')
  })

  it('captures a dotted access without inventing a value for it', () => {
    const expr = parse('{ MDT.someField }').get(1)
    expect(expr).toBeInstanceOf(LuaExpr)
    expect(expr.literal).toBeNull()
    expect(expr.raw).toContain('MDT.someField')
  })

  it('keeps a concatenation whole, with its literal segments', () => {
    const expr = parse('{ ' + "'Interface" + BS + BS + "AddOns" + BS + BS + "'..addonName.." + "'" + BS + BS + "Textures'" + ' }').get(1)
    expect(expr).toBeInstanceOf(LuaExpr)
    expect(expr.parts).toHaveLength(3)
    expect(expr.parts[0]).toBe('Interface' + BS + 'AddOns' + BS)
    expect(expr.parts[2]).toBe(BS + 'Textures')
  })

  it('gives a bare identifier the same shape whatever the surrounding whitespace', () => {
    // The parser looks past whitespace for a `[` or a `.`; when neither follows it has to
    // give that whitespace back, otherwise `raw` carries it and the `identifier` branch is
    // never reached. unwrap() in extract-mdt.mjs falls through to `raw`, so the difference
    // would surface as a trailing space in the generated data.
    for (const src of ['{addonName}', '{ addonName }', '{ addonName , 1 }', '{addonName,1}']) {
      const expr = parse(src).get(1)
      expect(expr.identifier, src).toBe('addonName')
      expect(expr.raw, src).toBe('addonName')
    }
  })

  it('leaves no trailing whitespace on any captured expression', () => {
    expect(parse('{ L["Name"] }').get(1).raw).toBe('L["Name"]')
    expect(parse('{ MDT.someField }').get(1).raw).toBe('MDT.someField')
  })

  it('still reads a concatenation that follows whitespace', () => {
    // Giving the trivia back must not hide the `..` from parseValue.
    const expr = parse("{ addonName .. 'suffix' }").get(1)
    expect(expr.parts).toHaveLength(2)
    expect(expr.parts[1]).toBe('suffix')
  })
})

describe('Parser boundaries', () => {
  it('starts at the first brace and reports where it stopped', () => {
    const { value, end } = parseTableAt('prefix = { 1, 2 } suffix', 0)
    expect(value).toEqual(new Map([[1, 1], [2, 2]]))
    expect('prefix = { 1, 2 } suffix'.slice(end)).toBe(' suffix')
  })

  it('refuses a source with no table at all', () => {
    expect(() => parseTableAt('nothing here', 0)).toThrow()
  })

  it('refuses an unterminated table', () => {
    expect(() => parse('{ 1, 2')).toThrow()
  })

  it('locates the problem by line and offset', () => {
    let message = ''
    try {
      parse('{ 1,\n 2,\n @ }')
    } catch (err) {
      message = err.message
    }
    expect(message).toMatch(/offset \d+/)
    expect(message).toMatch(/\b3\b/) // the offending line
  })
})

describe('parseAssignment', () => {
  const source = [
    'MDT.dungeonEnemies[dungeonIndex] = {',
    '  [1] = { name = "Mob", clones = { [8] = { x = 1 } } },',
    '}',
    'MDT.dungeonTotalCount[dungeonIndex] = { normal = 817 }',
    'MDT.mapPOIs[dungeonIndex] = nil',
  ].join('\n')

  it('reads a table assignment', () => {
    const enemies = parseAssignment(source, 'dungeonEnemies')
    expect(enemies.get(1).get('name')).toBe('Mob')
    expect([...enemies.get(1).get('clones').keys()]).toEqual([8])
  })

  it('reads a second assignment in the same source', () => {
    expect(parseAssignment(source, 'dungeonTotalCount')).toEqual(new Map([['normal', 817]]))
  })

  it('distinguishes an assignment to nil from a missing one', () => {
    expect(parseAssignment(source, 'mapPOIs')).toBeNull()
    expect(parseAssignment(source, 'noSuchField')).toBeUndefined()
  })
})

describe('toPlain', () => {
  it('turns a contiguous 1..n table into an array', () => {
    expect(toPlain(parse('{ "a", "b" }'))).toEqual(['a', 'b'])
  })

  it('keeps a sparse table as an object, so the indices survive', () => {
    expect(toPlain(parse('{ [8] = "a", [13] = "b" }'))).toEqual({ 8: 'a', 13: 'b' })
  })

  it('turns string keys into an object', () => {
    expect(toPlain(parse('{ name = "Mob" }'))).toEqual({ name: 'Mob' })
  })

  it('renders an empty table as an object, not an array', () => {
    expect(toPlain(parse('{}'))).toEqual({})
  })

  it('recurses', () => {
    expect(toPlain(parse('{ enemy = { name = "Mob", cc = { "Stun", "Fear" } } }'))).toEqual({
      enemy: { name: 'Mob', cc: ['Stun', 'Fear'] },
    })
  })

  it('never produces arrays when asked not to', () => {
    expect(toPlain(parse('{ "a", "b" }'), { arrays: false })).toEqual({ 1: 'a', 2: 'b' })
  })

  it('passes primitives and unreduced expressions through untouched', () => {
    expect(toPlain(42)).toBe(42)
    expect(toPlain('text')).toBe('text')
    expect(toPlain(null)).toBeNull()
    const expr = new LuaExpr('addonName')
    expect(toPlain(expr)).toBe(expr)
  })
})

describe('A realistic MDT extract', () => {
  // Shaped like the dungeon files: sparse clone indices, localized names, nested tables.
  const source = [
    'local dungeonIndex = 164',
    'MDT.dungeonEnemies[dungeonIndex] = {',
    '  [1] = {',
    '    ["name"] = L["Ritual Chieftain"],',
    '    ["id"] = 270306,',
    '    ["count"] = 25,',
    '    ["isBoss"] = false,',
    '    ["clones"] = {',
    '      [4] = { ["x"] = -712.5, ["y"] = -430.25, ["g"] = 5, ["sublevel"] = 1 },',
    '      [9] = { ["x"] = -700.0, ["y"] = -420.0, ["sublevel"] = 1 },',
    '    },',
    '  },',
    '}',
  ].join('\n')

  const enemies = toPlain(parseAssignment(source, 'dungeonEnemies'), { arrays: false })
  const mob = enemies['1']

  it('reads the scalar fields', () => {
    expect(mob.id).toBe(270306)
    expect(mob.count).toBe(25)
    expect(mob.isBoss).toBe(false)
  })

  it('exposes the localized name as an expression carrying its literal', () => {
    expect(mob.name).toBeInstanceOf(LuaExpr)
    expect(mob.name.literal).toBe('Ritual Chieftain')
  })

  it('preserves the sparse clone indices through toPlain', () => {
    expect(Object.keys(mob.clones)).toEqual(['4', '9'])
  })

  it('reads negative coordinates, as MDT stores them', () => {
    expect(mob.clones['4'].x).toBe(-712.5)
    expect(mob.clones['4'].y).toBe(-430.25)
  })

  it('leaves a lone clone without a pack rather than inventing one', () => {
    expect(mob.clones['4'].g).toBe(5)
    expect(mob.clones['9'].g).toBeUndefined()
  })
})
