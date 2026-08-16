import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LuaExpr } from './lua-table.mjs'
import {
  CC_ORDER,
  extractTextureFolder,
  intEntries,
  normaliseCharacteristics,
  normaliseClones,
  normaliseSpells,
  parseDungeon,
  readLocalNumber,
  summarise,
  unwrap,
} from './mdt-dungeon.mjs'

/**
 * A real MDT dungeon file, committed verbatim — see __fixtures__/README.md. Testing against
 * the installed addon would tie the suite to whatever WoW happens to be on the machine, and
 * CI has none at all.
 */
const source = fs.readFileSync(
  fileURLToPath(new URL('./__fixtures__/AltarOfFangs.lua', import.meta.url)),
  'utf8',
)

/** Warnings are collected rather than printed: test output has to stay pristine. */
const warnings = []
const dungeon = parseDungeon(source, 'AltarOfFangs', (w) => warnings.push(w))

describe('Dungeon identity', () => {
  it('reads the index MDT routes reference', () => {
    expect(dungeon.mdtIndex).toBe(164)
  })

  it('resolves the name through the locale lookup and slugifies it', () => {
    expect(dungeon.englishName).toBe('Altar of Fangs')
    expect(dungeon.slug).toBe('altar-of-fangs')
  })

  it('keeps the source filename, so every record stays traceable', () => {
    expect(dungeon.file).toBe('AltarOfFangs')
  })

  it('reads the forces the dungeon requires', () => {
    expect(dungeon.totalCount).toBe(817)
  })

  it('pulls the texture folder out of a concatenated path', () => {
    // customTextures = 'Interface\\AddOns\\'..addonName..'\\Midnight\\Textures\\AltarOfFangs'
    expect(dungeon.textureFolder).toBe('AltarOfFangs')
  })

  it('reports a single floor, which is all the map handles', () => {
    expect(dungeon.sublevelCount).toBe(1)
    expect(warnings).toEqual([])
  })
})

describe('Mobs', () => {
  it('extracts every mob', () => {
    expect(dungeon.enemies).toHaveLength(21)
  })

  it('marks the bosses and leaves the others undefined rather than false', () => {
    // `isBoss: undefined` drops out of the JSON entirely; `false` would bloat every record.
    expect(dungeon.enemies.filter((e) => e.isBoss).length).toBe(3)
    expect(dungeon.enemies.every((e) => e.isBoss === true || e.isBoss === undefined)).toBe(true)
  })

  it('carries the fields the codex renders', () => {
    const chieftain = dungeon.enemies.find((e) => e.id === 270306)
    expect(chieftain).toBeDefined()
    expect(chieftain.name).toBe('Ritual Chieftain')
    expect(chieftain.count).toBe(25)
    expect(chieftain.scale).toBeGreaterThan(0)
  })

  it('defaults a missing scale to 1 rather than leaving it undefined', () => {
    expect(dungeon.enemies.every((e) => typeof e.scale === 'number' && e.scale > 0)).toBe(true)
  })
})

describe('Clones', () => {
  const allClones = dungeon.enemies.flatMap((e) => e.clones)

  it('extracts every clone', () => {
    expect(allClones).toHaveLength(157)
  })

  it('preserves the sparse indices routes reference, without renumbering', () => {
    // High Evolutionist has holes at 5, 6 and 7 — deleting clones in MDT leaves gaps, and
    // compacting them would silently break every saved route.
    const evolutionist = dungeon.enemies.find((e) => e.mdtIdx === 3)
    const indices = evolutionist.clones.map((c) => c.mdtIdx)
    expect(indices).toEqual([1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15])
  })

  it('keeps every clone index ascending', () => {
    for (const enemy of dungeon.enemies) {
      const indices = enemy.clones.map((c) => c.mdtIdx)
      expect([...indices].sort((a, b) => a - b), enemy.name).toEqual(indices)
    }
  })

  it('reads the MDT coordinates, which are negative on the Y axis', () => {
    expect(allClones.every((c) => typeof c.x === 'number' && typeof c.y === 'number')).toBe(true)
    expect(allClones.some((c) => c.y < 0)).toBe(true)
  })

  it('turns a missing pack into an explicit null, not undefined', () => {
    // `g: null` means "pulls on its own"; undefined would be indistinguishable from a bug.
    expect(allClones.every((c) => c.g === null || typeof c.g === 'number')).toBe(true)
    expect(allClones.some((c) => c.g === null)).toBe(true)
  })

  it('omits the patrol field entirely when a clone does not patrol', () => {
    // Altar of Fangs has no patrolling clone — across the whole season pool there is exactly
    // one, in Temple of Sethraliss. The extraction of a patrol is unit-tested below instead.
    expect(allClones.every((c) => c.patrol === undefined)).toBe(true)
  })
})

describe('Spells and crowd control', () => {
  it('marks interruptible spells and omits the flag elsewhere', () => {
    const spells = dungeon.enemies.flatMap((e) => e.spells)
    expect(spells.some((s) => s.interruptible === true)).toBe(true)
    expect(spells.every((s) => s.interruptible === true || s.interruptible === undefined)).toBe(true)
  })

  it('collects dispel types as a list', () => {
    const dispellable = dungeon.enemies.flatMap((e) => e.spells).filter((s) => s.dispel)
    expect(dispellable.length).toBeGreaterThan(0)
    expect(dispellable.every((s) => s.dispel.length > 0)).toBe(true)
  })

  it('keeps spell ids numeric, as the app looks them up', () => {
    expect(dungeon.enemies.flatMap((e) => e.spells).every((s) => Number.isInteger(s.id))).toBe(true)
  })

  it('lists crowd control in the codex display order', () => {
    for (const enemy of dungeon.enemies) {
      const positions = enemy.cc.map((cc) => CC_ORDER.indexOf(cc)).filter((i) => i >= 0)
      expect([...positions].sort((a, b) => a - b), enemy.name).toEqual(positions)
    }
  })
})

describe('summarise', () => {
  it('counts what the extraction prints', () => {
    expect(summarise(dungeon)).toEqual({ clones: 157, packs: 46, bosses: 3, forces: 963 })
  })

  it('reaches the forces the dungeon requires', () => {
    // Below 100% the extraction missed something; MDT pools always leave slack above it.
    expect(summarise(dungeon).forces).toBeGreaterThanOrEqual(dungeon.totalCount)
  })
})

describe('Helpers', () => {
  it('readLocalNumber finds a declaration and reports a missing one', () => {
    expect(readLocalNumber('local dungeonIndex = 164\n', 'dungeonIndex')).toBe(164)
    expect(readLocalNumber('local other = 1\n', 'dungeonIndex')).toBeUndefined()
    expect(readLocalNumber('local n = -12\n', 'n')).toBe(-12)
  })

  it('unwrap prefers a literal, then an identifier, then the raw text', () => {
    const localised = new LuaExpr('L["Name"]')
    localised.literal = 'Name'
    expect(unwrap(localised)).toBe('Name')

    const bare = new LuaExpr('addonName')
    bare.identifier = 'addonName'
    expect(unwrap(bare)).toBe('addonName')

    expect(unwrap(new LuaExpr('MDT.field'))).toBe('MDT.field')
    expect(unwrap('plain')).toBe('plain')
  })

  it('intEntries sorts numerically and drops non-integer keys', () => {
    expect(intEntries({ 10: 'b', 2: 'a', color: 'x' })).toEqual([[2, 'a'], [10, 'b']])
    expect(intEntries(undefined)).toEqual([])
  })

  it('normaliseSpells omits an absent flag rather than denying it', () => {
    expect(normaliseSpells({ 42: { interruptible: true, magic: true } })).toEqual([
      { id: 42, interruptible: true, dispel: ['magic'] },
    ])
    expect(normaliseSpells({ 42: {} })).toEqual([{ id: 42, interruptible: undefined, dispel: undefined }])
    expect(normaliseSpells(undefined)).toEqual([])
  })

  it('normaliseCharacteristics warns about a crowd control it does not know', () => {
    const seen = []
    const cc = normaliseCharacteristics({ Stun: true, Levitate: true }, (w) => seen.push(w))
    expect(cc).toEqual(['Stun', 'Levitate'])
    expect(seen[0]).toContain('Levitate')
  })

  it('normaliseClones defaults the sublevel and keeps the index', () => {
    expect(normaliseClones({ 4: { x: 1, y: -2, g: 5 } })).toEqual([
      { mdtIdx: 4, x: 1, y: -2, g: 5, sublevel: 1, patrol: undefined },
    ])
  })

  it('normaliseClones turns a patrol into a point list, dropping MDT extras', () => {
    // The shape MDT writes: an integer-keyed table of points, each with more fields than the
    // map draws. Only x and y survive.
    const [clone] = normaliseClones({
      1: { x: 0, y: 0, g: null, patrol: { 1: { x: 10, y: -20, sublevel: 1 }, 2: { x: 30, y: -40 } } },
    })
    expect(clone.patrol).toEqual([
      { x: 10, y: -20 },
      { x: 30, y: -40 },
    ])
  })

  it('extractTextureFolder gives up cleanly when there is nothing to read', () => {
    expect(extractTextureFolder(undefined)).toBeNull()
    expect(extractTextureFolder({ 1: {} })).toBeNull()
  })
})

describe('Refusing a source it cannot read', () => {
  it('names the file when dungeonIndex is missing', () => {
    expect(() => parseDungeon('-- nothing here', 'Broken')).toThrow(/Broken/)
  })
})
