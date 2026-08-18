// ABOUTME: Reads an MDT preset's `objects` — the notes and strokes drawn over a route — and
// ABOUTME: rebuilds that table on export, re-emitting byte for byte what this app did not edit.

/**
 * The objects an MDT preset carries beside its pulls.
 *
 * The shape is the addon's own, documented at `Modules/PresetObjects.lua:174`:
 *
 *     d: size, lineFactor, sublevel, shown, colorstring, drawLayer, [smooth]
 *     l: x1,y1,x2,y2,…
 *     t: triangle rotation
 *     n: true   →  the object is a note, and d = { x, y, sublevel, shown, text }
 *
 * Positions come out in map pixels: no component should have to know that MDT's Y axis points
 * up. An entry this app did not touch survives a round trip through `objectsToLua` unchanged,
 * which is what keeps `routeToLua` free to hand back everything we cannot edit.
 */

import type { LuaTable, LuaValue } from './cbor'
import { toMdtCoords, toPixels, type Point } from '../geometry'

export interface MdtNote {
  kind: 'note'
  at: Point
  sublevel: number
  text: string
  /**
   * The integer key this object came from in the preset's `objects` table. Absent when the app
   * created it. This is what lets `objectsToLua` hand an untouched entry back byte for byte
   * instead of rebuilding it — see the slice C design, decision 2.
   */
  from?: number
  /**
   * Set once the object is stored in the document (see `useRouteDoc.ts`'s `withObjects`).
   * Bookkeeping for selection and deletion: the encoder never reads it, so it cannot leak into
   * an exported preset.
   */
  id?: string
}

export interface MdtStroke {
  kind: 'stroke'
  points: Point[]
  sublevel: number
  /** MDT's hex colour, without the leading hash. */
  color: string
  /** MDT's brush size; the drawn width is `size * 0.3 * MAP_SCALE`. */
  size: number
  smooth: boolean
  /** `d[6]`, MDT's stacking order. Absent counts as 0, as a nil layerSublevel does in game. */
  layer: number
  isArrow: boolean
  /**
   * The integer key this object came from in the preset's `objects` table. Absent when the app
   * created it. This is what lets `objectsToLua` hand an untouched entry back byte for byte
   * instead of rebuilding it — see the slice C design, decision 2.
   */
  from?: number
  /**
   * Set once the object is stored in the document (see `useRouteDoc.ts`'s `withObjects`).
   * Bookkeeping for selection and deletion: the encoder never reads it, so it cannot leak into
   * an exported preset.
   */
  id?: string
}

export type MdtObject = MdtNote | MdtStroke

const asTable = (v: LuaValue | undefined): LuaTable | undefined => (v instanceof Map ? v : undefined)

const intKeys = (table: LuaTable): number[] =>
  [...table.keys()].filter((k): k is number => typeof k === 'number').sort((a, b) => a - b)

export function luaToObjects(preset: LuaTable): MdtObject[] {
  const raw = asTable(preset.get('objects'))
  if (!raw) return []

  const strokes: MdtStroke[] = []
  const notes: MdtNote[] = []
  for (const key of intKeys(raw)) {
    const obj = asTable(raw.get(key))
    const d = obj ? asTable(obj.get('d')) : undefined
    // An object we cannot read is skipped, never fatal: a route must not stop displaying
    // because one of its decorations is odd.
    if (!obj || !d) continue
    // `false` is what MDT writes when the author undoes a stroke; the object stays in the
    // preset in case they redo it. Drawing it would show what someone erased.
    if (d.get(4) === false) continue

    const sublevel = Number(d.get(3)) || 1

    if (obj.get('n') === true) {
      const x = Number(d.get(1))
      const y = Number(d.get(2))
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      const text = d.get(5)
      notes.push({
        kind: 'note',
        at: toPixels(x, y),
        sublevel,
        text: typeof text === 'string' ? text : '',
        from: key,
      })
      continue
    }

    const l = asTable(obj.get('l'))
    if (!l) continue
    const flat = intKeys(l).map((k) => Number(l.get(k)))
    // `l` is x1,y1,x2,y2,…: an odd tail means a stroke still being drawn when it was saved.
    const points: Point[] = []
    for (let i = 0; i + 1 < flat.length; i += 2) {
      if (!Number.isFinite(flat[i]) || !Number.isFinite(flat[i + 1])) continue
      points.push(toPixels(flat[i], flat[i + 1]))
    }
    if (points.length < 2) continue

    // MDT's own fallbacks (`Modules/PresetObjects.lua:184` and `:187-189`), copied rather
    // than invented: an invalid colour becomes white, a missing size becomes 5.
    const color = d.get(5)
    strokes.push({
      kind: 'stroke',
      points,
      sublevel,
      color: typeof color === 'string' && /^[0-9a-fA-F]{6}$/.test(color) ? color : 'ffffff',
      size: Number(d.get(1)) || 5,
      smooth: d.get(7) === true,
      layer: Number(d.get(6)) || 0,
      isArrow: asTable(obj.get('t')) != null,
      from: key,
    })
  }

  // Strokes first, in MDT's stacking order; notes are drawn by their own layer anyway.
  strokes.sort((a, b) => a.layer - b.layer)
  return [...strokes, ...notes]
}

/**
 * Rebuilds a preset's `objects` table from the objects the app now holds.
 *
 * One rule, applied to the source's entries in key order:
 *
 *   - an entry some object claims through `from` is re-emitted **verbatim** when that object still
 *     equals what `luaToObjects` read from it, and synthesised when it does not;
 *   - an entry nobody claims is **omitted** if `luaToObjects` had parsed it — that is a deletion —
 *     and re-emitted verbatim if it had not, because an entry we never understood is not ours to
 *     rewrite;
 *   - objects with no `from` are synthesised and appended.
 *
 * The output is renumbered `1..n`: MDT walks this table as a Lua array, so a deletion must not
 * leave a hole for `ipairs` to stop at.
 *
 * Both "was it parsed" and "was it modified" are recomputed from `source` here rather than carried
 * as a flag on the object. A flag can go stale between the edit and the export; a comparison
 * cannot, and there are never enough objects for the cost to matter.
 */
export function objectsToLua(source: LuaTable | undefined, objects: MdtObject[]): LuaTable {
  const out: LuaTable = new Map()
  const raw = source ? asTable(source.get('objects')) : undefined

  const claimed = new Map<number, MdtObject>()
  for (const o of objects) if (o.from != null) claimed.set(o.from, o)

  const asRead = new Map<number, MdtObject>()
  if (source) for (const o of luaToObjects(source)) if (o.from != null) asRead.set(o.from, o)

  let next = 1
  if (raw) {
    for (const key of intKeys(raw)) {
      const object = claimed.get(key)
      if (object) {
        const original = asRead.get(key)
        out.set(next++, original && sameObject(object, original) ? raw.get(key)! : objectToLua(object))
        continue
      }
      if (!asRead.has(key)) out.set(next++, raw.get(key)!)
    }
  }

  for (const o of objects) if (o.from == null) out.set(next++, objectToLua(o))
  return out
}

/**
 * Whether an object still says what the preset said, ignoring the two fields the app added. `from`
 * is provenance and the identifier is ours; neither reaches MDT, so neither can make an entry
 * dirty.
 */
function sameObject(a: MdtObject, b: MdtObject): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'note' && b.kind === 'note') {
    return a.at.x === b.at.x && a.at.y === b.at.y && a.sublevel === b.sublevel && a.text === b.text
  }
  if (a.kind === 'stroke' && b.kind === 'stroke') {
    return (
      a.sublevel === b.sublevel &&
      a.color === b.color &&
      a.size === b.size &&
      a.smooth === b.smooth &&
      a.layer === b.layer &&
      a.isArrow === b.isArrow &&
      a.points.length === b.points.length &&
      a.points.every((p, i) => p.x === b.points[i].x && p.y === b.points[i].y)
    )
  }
  return false
}

/**
 * What MDT itself wrote for a fresh object of each kind, read off
 * `__fixtures__/real-export-strokes.txt`. We copy these rather than choose them: `layer` is `-8`
 * on every object in that export and we do not know what the number means, and a freehand stroke
 * is smoothed by default while an arrow carries no `smooth` key at all.
 */
export const MDT_STROKE_DEFAULTS = { size: 5, smooth: true, layer: -8 }
export const MDT_ARROW_DEFAULTS = { size: 13, smooth: false, layer: -8 }

/**
 * The angle MDT stores in an arrow's `t`, in radians and in MDT's own coordinate space.
 *
 * Derived from the two real arrows in `__fixtures__/real-export-strokes.txt`, whose endpoints and
 * stored angle are both known: it is the direction from the arrow's end back to its start, which
 * agrees with both to within the rounding of coordinates stored at one decimal. Computing it in
 * MDT's space rather than in map pixels matters — `toPixels` flips the Y sign, so the same formula
 * on pixels gives the wrong answer.
 */
export function arrowAngle(points: Point[]): number {
  const from = toMdtCoords(points[0].x, points[0].y)
  const to = toMdtCoords(points[points.length - 1].x, points[points.length - 1].y)
  return Math.atan2(from.y - to.y, from.x - to.x)
}

/** A note: two keys and nothing else, with full-precision coordinates. MDT's shape, not ours. */
function noteToLua(note: MdtNote): LuaTable {
  const at = toMdtCoords(note.at.x, note.at.y)
  const d: LuaTable = new Map()
  d.set(1, at.x)
  d.set(2, at.y)
  d.set(3, note.sublevel)
  d.set(4, true)
  d.set(5, note.text)

  const obj: LuaTable = new Map()
  obj.set('n', true)
  obj.set('d', d)
  return obj
}

function strokeToLua(stroke: MdtStroke): LuaTable {
  const d: LuaTable = new Map()
  d.set(1, stroke.size)
  // `d[2]` is MDT's `lineFactor`. We do not know what it does; these are the values the game wrote
  // for each kind, so a stroke we create looks to MDT like one it made itself.
  d.set(2, stroke.isArrow ? 1 : 1.1)
  d.set(3, stroke.sublevel)
  d.set(4, true)
  d.set(5, stroke.color)
  d.set(6, stroke.layer)
  // An arrow carries no `smooth` key in MDT's own output, so absent is not the same as false here.
  if (stroke.smooth) d.set(7, true)

  const l: LuaTable = new Map()
  let i = 1
  for (const p of stroke.points) {
    const m = toMdtCoords(p.x, p.y)
    // Strings at one decimal: what the game writes in `l`, and unlike a note, which stores its
    // position as a full-precision number. The asymmetry is MDT's.
    l.set(i++, m.x.toFixed(1))
    l.set(i++, m.y.toFixed(1))
  }

  const obj: LuaTable = new Map()
  obj.set('d', d)
  obj.set('l', l)
  if (stroke.isArrow) {
    const t: LuaTable = new Map()
    t.set(1, arrowAngle(stroke.points))
    obj.set('t', t)
  }
  return obj
}

function objectToLua(object: MdtObject): LuaTable {
  return object.kind === 'note' ? noteToLua(object) : strokeToLua(object)
}
