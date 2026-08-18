// ABOUTME: Tests reading a preset's drawn objects, against the real in-game export fixture.
// ABOUTME: That export carries five notes; strokes wait for a fixture that has some.

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MAP_SCALE, toPixels } from '../geometry'
import { decodeMdtString } from './string'
import { arrowAngle, luaToObjects, MDT_ARROW_DEFAULTS, MDT_STROKE_DEFAULTS, objectsToLua } from './objects'
import type { MdtNote, MdtStroke } from './objects'
import type { LuaTable, LuaValue } from './cbor'

/** A second, local copy of `objects.ts`'s module-private helper — see the file's own note on why. */
const asTable = (v: LuaValue | undefined): LuaTable | undefined => (v instanceof Map ? v : undefined)

/** Skipped rather than failed when absent, so the repository stays testable without it. */
const fixture = path.join(__dirname, '__fixtures__', 'real-export.txt')
const raw = fs.existsSync(fixture) ? fs.readFileSync(fixture, 'utf8').trim() : ''
const run = raw ? it : it.skip

/** The export carrying drawn strokes; the first fixture holds notes only. */
const drawings = path.join(__dirname, '__fixtures__', 'real-export-strokes.txt')
const drawn = fs.existsSync(drawings) ? fs.readFileSync(drawings, 'utf8').trim() : ''
const runDrawn = drawn ? it : it.skip

describe('luaToObjects — notes, from a real export', () => {
  const notes = () =>
    luaToObjects(decodeMdtString(raw).table).filter((o): o is MdtNote => o.kind === 'note')

  run('reads every note the author left', () => {
    const objects = notes()
    expect(objects).toHaveLength(5)
    expect(objects.every((o) => o.kind === 'note')).toBe(true)
    expect(objects.map((o) => o.text)).toContain('Lust, a lot of kicks to do')
  })

  run('places a note in map pixels, not in MDT coordinates', () => {
    const [first] = notes()
    // d = [72.20766293212073, -236.4934240889332, 1, true, "Lust, a lot of kicks to do"]
    expect(first.at.x).toBeCloseTo(72.20766293212073 * MAP_SCALE, 6)
    expect(first.at.y).toBeCloseTo(236.4934240889332 * MAP_SCALE, 6)
    expect(first.sublevel).toBe(1)
  })

  run('skips what the author undid', () => {
    const table = decodeMdtString(raw).table
    const objects = table.get('objects') as LuaTable
    // The fixture's own first note, with its `shown` flag flipped: MDT keeps an undone object
    // in the preset in case it is redone, and `PresetObjectStepBack` is what sets this false.
    const hidden = objects.get(1) as LuaTable
    ;((hidden.get('d') as LuaTable)).set(4, false)
    expect(luaToObjects(table)).toHaveLength(4)
  })
})

describe('luaToObjects — strokes, from a real export', () => {
  const strokes = () =>
    luaToObjects(decodeMdtString(drawn).table).filter((o): o is MdtStroke => o.kind === 'stroke')

  runDrawn('reads every stroke as a list of at least two points', () => {
    expect(strokes().length).toBeGreaterThan(0)
    expect(strokes().every((s) => s.points.length >= 2)).toBe(true)
  })

  runDrawn('reads a colour MDT could have written, never the fallback', () => {
    expect(strokes().every((s) => /^[0-9a-f]{6}$/i.test(s.color))).toBe(true)
  })

  // The fixture carries two arrows (`t` present on two of its three strokes), not one — a
  // single-arrow export would have made this indistinguishable from an off-by-one.
  runDrawn('reads exactly two arrows among them', () => {
    expect(strokes().filter((s) => s.isArrow)).toHaveLength(2)
  })

  runDrawn('returns the strokes before the notes', () => {
    const kinds = luaToObjects(decodeMdtString(drawn).table).map((o) => o.kind)
    expect(kinds.lastIndexOf('stroke')).toBeLessThan(kinds.indexOf('note'))
  })

  runDrawn('returns them in MDT stacking order', () => {
    const layers = strokes().map((s) => s.layer)
    expect([...layers].sort((a, b) => a - b)).toEqual(layers)
  })

  runDrawn('pins the first stroke, so a codec regression cannot pass silently', () => {
    const [first] = strokes()
    // The fixture's own first stroke: d = [5, 1.1, 1, true, "ff365c", -8, true], l starting
    // "746.1", "-486.1", from `probe.test.ts` against `real-export-strokes.txt`.
    const FIXTURE_FIRST_X = 746.1
    const FIXTURE_FIRST_Y = -486.1
    const FIXTURE_FIRST_COLOR = 'ff365c'
    expect(first.points[0].x).toBeCloseTo(FIXTURE_FIRST_X * MAP_SCALE, 6)
    expect(first.points[0].y).toBeCloseTo(-FIXTURE_FIRST_Y * MAP_SCALE, 6)
    expect(first.color).toBe(FIXTURE_FIRST_COLOR)
  })
})

describe('luaToObjects — what it refuses to break on', () => {
  /** A Lua table, spelled out: `Map<number | string, LuaValue>` needs the annotation to infer. */
  const table = (entries: [number | string, LuaValue][]): LuaTable => new Map(entries)
  const preset = (objects: LuaTable) => table([['objects', objects]])

  it('returns nothing when the preset has no objects at all', () => {
    expect(luaToObjects(new Map())).toEqual([])
  })

  it('skips an object with no details table instead of throwing', () => {
    expect(luaToObjects(preset(table([[1, table([['n', true]])]])))).toEqual([])
  })

  it('skips a note whose position is not a number', () => {
    const d = table([[1, 'nope'], [2, -10], [3, 1], [4, true], [5, 'text']])
    expect(luaToObjects(preset(table([[1, table([['d', d], ['n', true]])]])))).toEqual([])
  })
})

describe('objectsToLua — what it refuses to touch', () => {
  const preset = () => decodeMdtString(drawn).table

  runDrawn('records where every object came from', () => {
    const objects = luaToObjects(preset())
    // Eleven entries, every one of them parseable in this fixture.
    expect(objects.every((o) => typeof o.from === 'number')).toBe(true)
    expect(new Set(objects.map((o) => o.from)).size).toBe(objects.length)
  })

  runDrawn('re-emits an untouched preset identically', () => {
    const source = preset()
    const before = asTable(source.get('objects'))!
    const out = objectsToLua(source, luaToObjects(source))
    expect(out).toEqual(before)
    // By reference, entry by entry. `toEqual` is the weaker half of this guard: most of these
    // entries survive a round trip through the synthesiser without changing shape, so equality
    // would go on passing over a verbatim branch that had stopped running. Handing back the same
    // table object is the invariant the design states.
    const emitted = [...out.values()]
    for (const entry of before.values()) expect(emitted).toContain(entry)
  })

  runDrawn('omits an object that no longer claims its entry', () => {
    const source = preset()
    const objects = luaToObjects(source)
    const dropped = objects.find((o) => o.kind === 'note')!
    const out = objectsToLua(
      source,
      objects.filter((o) => o !== dropped),
    )
    const before = asTable(source.get('objects'))!
    expect(out.size).toBe(before.size - 1)
    // Every surviving entry is the original object, not a copy of one.
    const survivors = [...out.values()]
    expect(survivors).not.toContain(before.get(dropped.from!))
  })

  runDrawn('keeps an entry it never understood, even though nothing claims it', () => {
    // MDT writes `shown: false` for a stroke its author undid, and keeps the object in case they
    // redo it. `luaToObjects` skips it, so no object can claim it — and it must survive anyway.
    const source = preset()
    const raw = asTable(source.get('objects'))!
    const hiddenKey = [...raw.keys()].find((k): k is number => typeof k === 'number')!
    const hidden = asTable(raw.get(hiddenKey))!
    asTable(hidden.get('d'))!.set(4, false)

    const objects = luaToObjects(source)
    expect(objects.some((o) => o.from === hiddenKey)).toBe(false)

    const out = objectsToLua(source, objects)
    expect([...out.values()]).toContain(hidden)
  })

  it('is empty for a preset with no objects at all', () => {
    expect(objectsToLua(undefined, []).size).toBe(0)
    expect(objectsToLua(new Map(), []).size).toBe(0)
  })
})

describe('arrowAngle — MDT’s own convention, derived from two real arrows', () => {
  /**
   * These two angles are what the game wrote. The convention was derived from them and from their
   * endpoints: `atan2(y1 - y2, x1 - x2)` in MDT's coordinate space. The reverse convention is
   * wrong by π on both, so a sign slip cannot pass this test.
   *
   * The tolerance is the rounding of coordinates MDT stores to one decimal, not slack.
   */
  runDrawn.each([
    ['objects[6]', 1.543530772997453],
    ['objects[7]', 2.795456914547873],
  ])('reproduces the angle MDT stored for %s', (_label, expected) => {
    const source = decodeMdtString(drawn).table
    const arrows = luaToObjects(source).filter(
      (o): o is MdtStroke => o.kind === 'stroke' && o.isArrow,
    )
    const match = arrows.find((a) => Math.abs(arrowAngle(a.points) - expected) < 0.002)
    expect(match, `no arrow reproduced ${expected}`).toBeDefined()
  })

  it('is not symmetric: reversing an arrow turns it around', () => {
    const forward = arrowAngle([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
    const backward = arrowAngle([
      { x: 100, y: 0 },
      { x: 0, y: 0 },
    ])
    expect(Math.abs(Math.abs(forward - backward) - Math.PI)).toBeLessThan(1e-9)
  })
})

describe('objectsToLua — synthesising', () => {
  it('writes a created note the way MDT writes one: two keys, numbers, shown', () => {
    const note: MdtNote = { kind: 'note', at: toPixels(700, -480), sublevel: 1, text: 'kick this' }
    const out = objectsToLua(undefined, [note])
    const obj = asTable(out.get(1))!
    expect([...obj.keys()].sort()).toEqual(['d', 'n'])
    expect(obj.get('n')).toBe(true)
    const d = asTable(obj.get('d'))!
    expect(d.get(1)).toBeCloseTo(700, 6)
    expect(d.get(2)).toBeCloseTo(-480, 6)
    expect(d.get(3)).toBe(1)
    expect(d.get(4)).toBe(true)
    expect(d.get(5)).toBe('kick this')
  })

  it('writes a created stroke’s coordinates as strings at one decimal', () => {
    const stroke: MdtStroke = {
      kind: 'stroke',
      points: [toPixels(100, -200), toPixels(110.26, -205.44)],
      sublevel: 1,
      color: 'ff365c',
      isArrow: false,
      ...MDT_STROKE_DEFAULTS,
    }
    const out = objectsToLua(undefined, [stroke])
    const obj = asTable(out.get(1))!
    const l = asTable(obj.get('l'))!
    expect(l.get(1)).toBe('100.0')
    expect(l.get(2)).toBe('-200.0')
    expect(l.get(3)).toBe('110.3')
    expect(l.get(4)).toBe('-205.4')
    expect(obj.has('t')).toBe(false)
    const d = asTable(obj.get('d'))!
    expect(d.get(2)).toBe(1.1)
    expect(d.get(7)).toBe(true)
  })

  it('gives a created arrow a `t`, and a different lineFactor', () => {
    const arrow: MdtStroke = {
      kind: 'stroke',
      points: [toPixels(0, 0), toPixels(0, -100)],
      sublevel: 1,
      color: 'ff365c',
      isArrow: true,
      ...MDT_ARROW_DEFAULTS,
    }
    const obj = asTable(objectsToLua(undefined, [arrow]).get(1))!
    const t = asTable(obj.get('t'))!
    expect(Number(t.get(1))).toBeCloseTo(arrowAngle(arrow.points), 9)
    expect(asTable(obj.get('d'))!.get(2)).toBe(1)
    // MDT writes no `smooth` key at all on an arrow.
    expect(asTable(obj.get('d'))!.has(7)).toBe(false)
  })

  runDrawn('synthesises an entry whose object was modified, and only that entry', () => {
    const source = decodeMdtString(drawn).table
    const raw = asTable(source.get('objects'))!
    const objects = luaToObjects(source)
    const edited = objects.find((o): o is MdtNote => o.kind === 'note')!
    const changed = objects.map((o) => (o === edited ? { ...edited, text: 'rewritten' } : o))

    const out = objectsToLua(source, changed)
    const emitted = [...out.values()]
    // The edited entry is a new table…
    expect(emitted).not.toContain(raw.get(edited.from!))
    // …and every other one is still the original object.
    for (const o of objects) {
      if (o === edited) continue
      expect(emitted).toContain(raw.get(o.from!))
    }
  })

  it('round-trips a created note back through the reader', () => {
    const note: MdtNote = { kind: 'note', at: toPixels(300, -250), sublevel: 1, text: 'here' }
    const preset: LuaTable = new Map()
    preset.set('objects', objectsToLua(undefined, [note]))
    const [read] = luaToObjects(preset)
    expect(read).toMatchObject({ kind: 'note', sublevel: 1, text: 'here' })
    expect(read.kind === 'note' && read.at.x).toBeCloseTo(note.at.x, 6)
  })
})
