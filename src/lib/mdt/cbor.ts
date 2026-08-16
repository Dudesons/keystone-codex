// ABOUTME: A hand-written CBOR codec, the subset MDT's route exports need.
// ABOUTME: Reimplemented rather than taken off the shelf, to control the Lua array/map rule.

/**
 * CBOR (RFC 8949), the subset that MDT exports need.
 *
 * MDT serialises its routes with `C_EncodingUtil.SerializeCBOR` (Transmission.lua:19). We
 * reimplement the format rather than reaching for a library because byte-for-byte fidelity
 * is what matters: a re-encoded string has to stay importable in game, which means
 * controlling exactly how Lua tables become arrays or maps.
 *
 * Representation: a Lua table is a `Map` whose integer keys stay 1-based, exactly as in Lua.
 * A CBOR array therefore decodes to Map {1:…, 2:…}, and re-encodes to an array if and only
 * if its keys are a contiguous 1..n — the exact inverse rule.
 */

export type LuaValue = number | string | boolean | null | Uint8Array | LuaTable
export type LuaTable = Map<number | string, LuaValue>

const MAJOR = {
  UINT: 0,
  NEGINT: 1,
  BYTES: 2,
  TEXT: 3,
  ARRAY: 4,
  MAP: 5,
  TAG: 6,
  SIMPLE: 7,
} as const

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

class Reader {
  private view: DataView
  pos = 0

  constructor(private bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }

  private u8() {
    if (this.pos >= this.bytes.length) throw new Error('CBOR: unexpected end of data')
    return this.bytes[this.pos++]
  }

  /** Reads the argument attached to a header. `null` = indefinite length. */
  private argument(info: number): number | null {
    if (info < 24) return info
    switch (info) {
      case 24:
        return this.u8()
      case 25: {
        const v = this.view.getUint16(this.pos)
        this.pos += 2
        return v
      }
      case 26: {
        const v = this.view.getUint32(this.pos)
        this.pos += 4
        return v
      }
      case 27: {
        const v = this.view.getBigUint64(this.pos)
        this.pos += 8
        if (v > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('CBOR: integer outside the safe range')
        return Number(v)
      }
      case 31:
        return null
      default:
        throw new Error(`CBOR: information additionnelle invalide (${info})`)
    }
  }

  private bytesOf(len: number | null, major: number): Uint8Array {
    if (len !== null) {
      const out = this.bytes.subarray(this.pos, this.pos + len)
      if (out.length !== len) throw new Error('CBOR: truncated string')
      this.pos += len
      return out
    }
    // Indefinite length: fragments concatenated until the break marker.
    const chunks: Uint8Array[] = []
    for (;;) {
      const head = this.u8()
      if (head === 0xff) break
      if (head >> 5 !== major) throw new Error('CBOR: inconsistent fragment type')
      const chunk = this.bytesOf(this.argument(head & 0x1f), major)
      chunks.push(chunk)
    }
    const total = chunks.reduce((n, c) => n + c.length, 0)
    const out = new Uint8Array(total)
    let off = 0
    for (const c of chunks) {
      out.set(c, off)
      off += c.length
    }
    return out
  }

  value(): LuaValue {
    const head = this.u8()
    const major = head >> 5
    const info = head & 0x1f

    switch (major) {
      case MAJOR.UINT:
        return this.argument(info)!
      case MAJOR.NEGINT:
        return -1 - this.argument(info)!
      // Lua only has byte strings, so the game's serialiser emits major 2, never major 3.
      // We accept both and return a string either way, otherwise a table key would end up
      // typed as a Uint8Array.
      case MAJOR.BYTES:
        return new TextDecoder().decode(this.bytesOf(this.argument(info), MAJOR.BYTES))
      case MAJOR.TEXT:
        return new TextDecoder().decode(this.bytesOf(this.argument(info), MAJOR.TEXT))
      case MAJOR.ARRAY: {
        const len = this.argument(info)
        const table: LuaTable = new Map()
        if (len === null) {
          let i = 1
          while (this.bytes[this.pos] !== 0xff) table.set(i++, this.value())
          this.pos++
        } else {
          // A CBOR array becomes a Lua table indexed from 1 again.
          for (let i = 0; i < len; i++) table.set(i + 1, this.value())
        }
        return table
      }
      case MAJOR.MAP: {
        const len = this.argument(info)
        const table: LuaTable = new Map()
        const entry = () => {
          const k = this.value()
          if (typeof k !== 'number' && typeof k !== 'string') {
            throw new Error('CBOR: non-scalar table key')
          }
          table.set(k, this.value())
        }
        if (len === null) {
          while (this.bytes[this.pos] !== 0xff) entry()
          this.pos++
        } else {
          for (let i = 0; i < len; i++) entry()
        }
        return table
      }
      case MAJOR.TAG:
        this.argument(info)
        return this.value() // Tags are transparent for what we handle.
      case MAJOR.SIMPLE:
        switch (info) {
          case 20:
            return false
          case 21:
            return true
          case 22:
          case 23:
            return null
          case 25: {
            const v = readFloat16(this.view, this.pos)
            this.pos += 2
            return v
          }
          case 26: {
            const v = this.view.getFloat32(this.pos)
            this.pos += 4
            return v
          }
          case 27: {
            const v = this.view.getFloat64(this.pos)
            this.pos += 8
            return v
          }
          default:
            throw new Error(`CBOR: unhandled simple value (${info})`)
        }
      default:
        throw new Error(`CBOR: unknown major type (${major})`)
    }
  }
}

function readFloat16(view: DataView, pos: number): number {
  const half = view.getUint16(pos)
  const exp = (half >> 10) & 0x1f
  const frac = half & 0x3ff
  const sign = half & 0x8000 ? -1 : 1
  if (exp === 0) return sign * 2 ** -24 * frac
  if (exp === 31) return frac ? NaN : sign * Infinity
  return sign * 2 ** (exp - 25) * (1024 + frac)
}

export function decodeCbor(bytes: Uint8Array): LuaValue {
  return new Reader(bytes).value()
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

class Writer {
  private chunks: number[] = []

  push(...bytes: number[]) {
    this.chunks.push(...bytes)
  }

  header(major: number, arg: number) {
    const base = major << 5
    if (arg < 24) this.push(base | arg)
    else if (arg < 0x100) this.push(base | 24, arg)
    else if (arg < 0x10000) this.push(base | 25, arg >> 8, arg & 0xff)
    else if (arg < 0x100000000) {
      this.push(base | 26, (arg >>> 24) & 0xff, (arg >>> 16) & 0xff, (arg >>> 8) & 0xff, arg & 0xff)
    } else {
      const buf = new Uint8Array(8)
      new DataView(buf.buffer).setBigUint64(0, BigInt(arg))
      this.push(base | 27, ...buf)
    }
  }

  float64(value: number) {
    const buf = new Uint8Array(8)
    new DataView(buf.buffer).setFloat64(0, value)
    this.push(0xe0 | 27, ...buf)
  }

  raw(bytes: Uint8Array) {
    for (const b of bytes) this.chunks.push(b)
  }

  result() {
    return new Uint8Array(this.chunks)
  }
}

/**
 * A Lua table serialises to a CBOR array if and only if its keys are exactly 1..n.
 *
 * An empty table is ambiguous — `{}` could legitimately become an empty array or an empty
 * map. The game emits an empty array (`0x80`), verified against a real export: it was the
 * one divergence that separated our re-encoding from theirs.
 */
export function isLuaArray(table: LuaTable): boolean {
  if (table.size === 0) return true
  let i = 1
  for (const key of table.keys()) {
    if (key !== i++) return false
  }
  return true
}

function encodeValue(w: Writer, value: LuaValue) {
  if (value === null || value === undefined) {
    w.push(0xf6)
    return
  }
  if (typeof value === 'boolean') {
    w.push(value ? 0xf5 : 0xf4)
    return
  }
  if (typeof value === 'number') {
    // Lua does not distinguish integer from float, but CBOR does: integral values go out
    // as integers, which is what the game's serialiser does too.
    if (Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
      if (value >= 0) w.header(MAJOR.UINT, value)
      else w.header(MAJOR.NEGINT, -1 - value)
    } else {
      w.float64(value)
    }
    return
  }
  if (typeof value === 'string') {
    // Major 2 and not major 3: that is what `C_EncodingUtil.SerializeCBOR` produces,
    // verified against a real export. Emitting text would break byte-for-byte equality.
    const bytes = new TextEncoder().encode(value)
    w.header(MAJOR.BYTES, bytes.length)
    w.raw(bytes)
    return
  }
  if (value instanceof Uint8Array) {
    w.header(MAJOR.BYTES, value.length)
    w.raw(value)
    return
  }
  if (value instanceof Map) {
    if (isLuaArray(value)) {
      w.header(MAJOR.ARRAY, value.size)
      for (const v of value.values()) encodeValue(w, v)
    } else {
      w.header(MAJOR.MAP, value.size)
      for (const [k, v] of value) {
        encodeValue(w, k)
        encodeValue(w, v)
      }
    }
    return
  }
  throw new Error(`CBOR: value cannot be serialised (${typeof value})`)
}

export function encodeCbor(value: LuaValue): Uint8Array {
  const w = new Writer()
  encodeValue(w, value)
  return w.result()
}

// ---------------------------------------------------------------------------
// Confort : passage LuaTable <-> objets JS ordinaires
// ---------------------------------------------------------------------------

/** LuaTable -> readable JS object/array. Tables keyed 1..n become 0-based arrays. */
export function luaToJs(value: LuaValue): unknown {
  if (!(value instanceof Map)) return value
  if (isLuaArray(value)) return [...value.values()].map(luaToJs)
  const out: Record<string, unknown> = {}
  for (const [k, v] of value) out[String(k)] = luaToJs(v)
  return out
}
