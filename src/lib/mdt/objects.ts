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

export type MdtObject = MdtNote

const asTable = (v: LuaValue | undefined): LuaTable | undefined => (v instanceof Map ? v : undefined)

const intKeys = (table: LuaTable): number[] =>
  [...table.keys()].filter((k): k is number => typeof k === 'number').sort((a, b) => a - b)

export function luaToObjects(preset: LuaTable): MdtObject[] {
  const raw = asTable(preset.get('objects'))
  if (!raw) return []

  const out: MdtObject[] = []
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
      out.push({
        kind: 'note',
        at: toPixels(x, y),
        sublevel,
        text: typeof text === 'string' ? text : '',
      })
    }
  }
  return out
}
