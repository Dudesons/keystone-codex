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

/** Table Lua littérale, pour alléger les tests. */
const lua = (...entries: [number | string, LuaValue][]): LuaTable => new Map(entries)
/** Séquence Lua 1..n. */
const seq = (...values: LuaValue[]): LuaTable => new Map(values.map((v, i) => [i + 1, v]))

describe('CBOR — vecteurs de la RFC 8949', () => {
  // Ces vecteurs viennent de l'annexe A de la RFC. Ils valident notre implémentation
  // indépendamment de MDT : si le jeu est conforme et nous aussi, les deux s'accordent.
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

  it.each(vectors)('décode %s', (encoded, expected) => {
    expect(decodeCbor(hex(encoded))).toEqual(expected)
  })

  it.each(vectors)('ré-encode %s à l’identique', (encoded, expected) => {
    expect(toHex(encodeCbor(expected))).toBe(encoded)
  })

  it('décode aussi bien les chaînes texte (major 3) que les chaînes d’octets (major 2)', () => {
    expect(decodeCbor(hex('60'))).toBe('')
    expect(decodeCbor(hex('6161'))).toBe('a')
    expect(decodeCbor(hex('6449455446'))).toBe('IETF')
    expect(decodeCbor(hex('40'))).toBe('')
    expect(decodeCbor(hex('4161'))).toBe('a')
    expect(decodeCbor(hex('4449455446'))).toBe('IETF')
  })

  it('encode les chaînes en major 2, comme le sérialiseur du jeu', () => {
    // Lua n'a que des chaînes d'octets : `C_EncodingUtil.SerializeCBOR` émet du major 2.
    // Vérifié sur un export réel — émettre du major 3 casserait l'égalité octet à octet.
    expect(toHex(encodeCbor(''))).toBe('40')
    expect(toHex(encodeCbor('a'))).toBe('4161')
    expect(toHex(encodeCbor('IETF'))).toBe('4449455446')
  })

  it('décode les flottants en double précision', () => {
    expect(decodeCbor(hex('fb3ff199999999999a'))).toBeCloseTo(1.1, 12)
    expect(decodeCbor(hex('f93e00'))).toBeCloseTo(1.5, 6) // demi-précision
    expect(decodeCbor(hex('fa47c35000'))).toBeCloseTo(100000, 6) // simple précision
  })

  it('encode les non-entiers en double précision', () => {
    expect(toHex(encodeCbor(1.1))).toBe('fb3ff199999999999a')
  })

  it('décode un tableau CBOR en table Lua indexée depuis 1', () => {
    expect(decodeCbor(hex('83010203'))).toEqual(seq(1, 2, 3))
  })

  it('décode une map à clés entières en préservant les clés', () => {
    expect(decodeCbor(hex('a201020304'))).toEqual(lua([1, 2], [3, 4]))
  })

  it('gère les structures imbriquées', () => {
    // ["a", {"b": "c"}]
    expect(decodeCbor(hex('826161a161626163'))).toEqual(seq('a', lua(['b', 'c'])))
  })

  it('gère les longueurs indéfinies', () => {
    expect(decodeCbor(hex('9f018202039f0405ffff'))).toEqual(seq(1, seq(2, 3), seq(4, 5)))
  })
})

describe('CBOR — sémantique des tables Lua', () => {
  it('sérialise en tableau uniquement les clés 1..n contiguës', () => {
    expect(isLuaArray(seq('a', 'b'))).toBe(true)
    expect(isLuaArray(lua([1, 'a'], [3, 'b']))).toBe(false) // sparse : reste une map
    expect(isLuaArray(lua([1, 'a'], ['color', 'ff0000']))).toBe(false) // clé mixte
  })

  it('encode une table vide en tableau vide, comme le jeu', () => {
    // `enemyAssignments = {}` part en 0x80 côté jeu, pas en 0xa0.
    expect(toHex(encodeCbor(new Map()))).toBe('80')
    expect(decodeCbor(hex('80'))).toEqual(new Map())
    expect(decodeCbor(hex('a0'))).toEqual(new Map())
  })

  it('préserve les index sparses, tels que MDT les utilise pour les clones', () => {
    // Un pull réel ressemble à ça : clés entières éparses + une clé texte.
    const pull = lua([3, seq(8, 13)], [7, seq(2)], ['color', 'ff3eff'])
    const round = decodeCbor(encodeCbor(pull))
    expect(round).toEqual(pull)
  })

  it('fait un aller-retour octet à octet sur une structure de preset', () => {
    const preset = lua(
      ['text', 'Ma route'],
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

  it('convertit vers du JS lisible', () => {
    expect(luaToJs(seq('a', 'b'))).toEqual(['a', 'b'])
    expect(luaToJs(lua(['color', 'red']))).toEqual({ color: 'red' })
  })
})

describe('AceSerializer (format legacy)', () => {
  it('désérialise les types de base', () => {
    expect(deserializeAce('^1^Shello^^')).toBe('hello')
    expect(deserializeAce('^1^N42^^')).toBe(42)
    expect(deserializeAce('^1^B^^')).toBe(true)
    expect(deserializeAce('^1^b^^')).toBe(false)
  })

  it('désérialise une table à clés mixtes', () => {
    // { [1] = "a", color = "ff0000" }
    expect(deserializeAce('^1^T^N1^Sa^Scolor^Sff0000^t^^')).toEqual(
      lua([1, 'a'], ['color', 'ff0000']),
    )
  })

  it('déséchappe les caractères spéciaux', () => {
    expect(deserializeAce('^1^Sa~}b^^')).toBe('a^b') // ~} -> ^
    expect(deserializeAce('^1^Sa~|b^^')).toBe('a~b') // ~| -> ~
  })

  it('reconstitue un flottant depuis mantisse et exposant', () => {
    // ^F<m>^f<e> vaut m * 2^e, la mantisse ayant été multipliée par 2^53.
    expect(deserializeAce('^1^F4953959590107546^f-52^^')).toBeCloseTo(1.1, 10)
  })
})

describe('Route MDT', () => {
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

  it('lit les pulls avec leurs index MDT', () => {
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

  it('refuse un donjon hors du pool de la saison', () => {
    const other = lua(['value', lua(['currentDungeonIdx', 999])])
    // On assert sur le code, pas sur la phrase : la phrase est traduite dans l'UI, le code
    // est le contrat entre le codec et le panneau de route.
    expect(() => luaToRoute(other)).toThrow(MdtUserError)
    try {
      luaToRoute(other)
      expect.unreachable('luaToRoute aurait dû lever')
    } catch (err) {
      expect((err as MdtUserError).code).toBe('notInPool')
      expect((err as MdtUserError).params).toEqual({ mdtIndex: 999 })
    }
  })

  it('refuse un preset sans champ `value`', () => {
    try {
      luaToRoute(lua(['text', 'sans value']))
      expect.unreachable('luaToRoute aurait dû lever')
    } catch (err) {
      expect((err as MdtUserError).code).toBe('noValue')
    }
  })

  it('fait un aller-retour preset -> route -> preset sans perte', () => {
    const round = luaToRoute(routeToLua(luaToRoute(preset)))
    expect(round.pulls).toEqual(luaToRoute(preset).pulls)
    expect(round.name).toBe('k0')
  })

  it('préserve les champs inconnus du preset au ré-export', () => {
    const withExtras = new Map(preset)
    withExtras.set('objects', seq(lua(['t', 'note'])))
    withExtras.set('wagoID', 'hH8oS8VqB')
    const out = routeToLua(luaToRoute(withExtras))
    expect(out.get('wagoID')).toBe('hH8oS8VqB')
    expect(out.get('objects')).toEqual(seq(lua(['t', 'note'])))
  })
})

describe('String MDT complète', () => {
  it("fait un aller-retour string -> table -> string", () => {
    const preset = lua(
      ['text', 'Test'],
      ['value', lua(['currentDungeonIdx', 164], ['pulls', seq(lua([1, seq(1)], ['color', 'ff3eff']))])],
    )
    const encoded = encodeMdtString(preset)
    expect(encoded.startsWith('!~MDT2~')).toBe(true)

    const decoded = decodeMdtString(encoded)
    expect(decoded.format).toBe('mdt2')
    expect(decoded.table).toEqual(preset)

    // Le ré-encodage doit être stable.
    expect(encodeMdtString(decoded.table, decoded.deflate)).toBe(encoded)
  })

  it('rejette clairement une string qui n’est pas du MDT', () => {
    const codes = ['coucou', ''].map((input) => {
      try {
        decodeMdtString(input)
        return 'aucune erreur'
      } catch (err) {
        return err instanceof MdtUserError ? err.code : `erreur non traduisible: ${err}`
      }
    })
    expect(codes).toEqual(['unknownFormat', 'emptyString'])
  })
})

/**
 * Validation contre une string réellement exportée par le jeu.
 *
 * C'est le seul test qui prouve la compatibilité in-game : les autres ne valident que notre
 * cohérence interne. Colle un export MDT dans le fichier ci-dessous pour l'activer.
 */
describe('Compatibilité in-game', () => {
  const fixture = path.join(__dirname, '__fixtures__', 'real-export.txt')
  const raw = fs.existsSync(fixture) ? fs.readFileSync(fixture, 'utf8').trim() : ''
  const run = raw ? it : it.skip

  run('décode une string exportée depuis MDT', () => {
    const decoded = decodeMdtString(raw)
    expect(decoded.table.has('value')).toBe(true)
    const route = luaToRoute(decoded.table)
    expect(route.pulls.length).toBeGreaterThan(0)
    console.log(
      `Route « ${route.name} » : ${route.pulls.length} pulls, format ${decoded.format}, deflate ${decoded.deflate}`,
    )
  })

  run('ré-encode un CBOR identique octet à octet à celui du jeu', () => {
    const decoded = decodeMdtString(raw)
    if (decoded.format !== 'mdt2') return

    // On compare la charge CBOR, pas la string finale : deux compresseurs deflate corrects
    // produisent des flux différents pour la même entrée, et le jeu décompresse les deux.
    // L'invariant qui prouve la compatibilité, c'est que les octets sérialisés coïncident.
    const original = pako.inflateRaw(
      Uint8Array.from(atob(raw.slice('!~MDT2~'.length)), (c) => c.charCodeAt(0)),
    )
    expect(toHex(encodeCbor(decoded.table))).toBe(toHex(original))
  })

  run('produit une string que notre propre décodeur relit à l’identique', () => {
    const decoded = decodeMdtString(raw)
    const reencoded = encodeMdtString(decoded.table, decoded.deflate)
    expect(decodeMdtString(reencoded).table).toEqual(decoded.table)
  })
})
