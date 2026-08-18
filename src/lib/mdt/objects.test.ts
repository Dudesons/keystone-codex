// ABOUTME: Tests reading a preset's drawn objects, against the real in-game export fixture.
// ABOUTME: That export carries five notes; strokes wait for a fixture that has some.

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MAP_SCALE } from '../geometry'
import { decodeMdtString } from './string'
import { luaToObjects } from './objects'
import type { MdtNote, MdtStroke } from './objects'
import type { LuaTable, LuaValue } from './cbor'

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
