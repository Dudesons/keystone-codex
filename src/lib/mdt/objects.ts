// ABOUTME: Reads an MDT preset's `objects` — the notes and strokes drawn over a route.
// ABOUTME: Read-only, so a re-export still hands the game back its own table untouched.

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
 * up. Nothing here writes, which is what keeps `routeToLua` free to hand the original table
 * back with everything we cannot edit still inside it.
 */

import type { LuaTable, LuaValue } from './cbor'
import { toPixels, type Point } from '../geometry'

export interface MdtNote {
  kind: 'note'
  at: Point
  sublevel: number
  text: string
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
    })
  }

  // Strokes first, in MDT's stacking order; notes are drawn by their own layer anyway.
  strokes.sort((a, b) => a.layer - b.layer)
  return [...strokes, ...notes]
}
