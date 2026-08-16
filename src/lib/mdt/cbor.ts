/**
 * CBOR (RFC 8949), sous-ensemble suffisant pour les exports de MDT.
 *
 * MDT sérialise ses routes avec `C_EncodingUtil.SerializeCBOR` (Transmission.lua:19). On
 * réimplémente le format plutôt que de prendre une librairie parce que la fidélité octet à
 * octet compte : une string ré-encodée doit rester importable en jeu, ce qui impose de
 * contrôler exactement comment les tables Lua deviennent des tableaux ou des maps.
 *
 * Représentation : une table Lua est une `Map` dont les clés entières restent 1-based,
 * exactement comme en Lua. Un tableau CBOR se décode donc en Map {1:…, 2:…}, et se ré-encode
 * en tableau si et seulement si ses clés sont 1..n contiguës — la règle inverse exacte.
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
// Décodage
// ---------------------------------------------------------------------------

class Reader {
  private view: DataView
  pos = 0

  constructor(private bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }

  private u8() {
    if (this.pos >= this.bytes.length) throw new Error('CBOR: fin de données inattendue')
    return this.bytes[this.pos++]
  }

  /** Lit l'argument associé à un en-tête. `null` = longueur indéfinie. */
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
        if (v > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('CBOR: entier hors plage sûre')
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
      if (out.length !== len) throw new Error('CBOR: chaîne tronquée')
      this.pos += len
      return out
    }
    // Longueur indéfinie : concaténation de fragments jusqu'au marqueur de fin.
    const chunks: Uint8Array[] = []
    for (;;) {
      const head = this.u8()
      if (head === 0xff) break
      if (head >> 5 !== major) throw new Error('CBOR: fragment de type incohérent')
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
      // Lua ne connaît que des chaînes d'octets : le sérialiseur du jeu émet donc du
      // major 2, jamais du major 3. On accepte les deux et on rend une chaîne dans les
      // deux cas, sinon une clé de table se retrouverait typée Uint8Array.
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
          // Un tableau CBOR redevient une table Lua indexée à partir de 1.
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
            throw new Error('CBOR: clé de table non scalaire')
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
        return this.value() // Les tags sont transparents pour ce qu'on manipule.
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
            throw new Error(`CBOR: valeur simple non gérée (${info})`)
        }
      default:
        throw new Error(`CBOR: type majeur inconnu (${major})`)
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
// Encodage
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
 * Une table Lua se sérialise en tableau CBOR si ses clés sont exactement 1..n.
 *
 * Une table vide est ambiguë — `{}` peut légitimement devenir un tableau vide ou une map
 * vide. Le jeu émet un tableau vide (`0x80`), vérifié sur un export réel : c'est la seule
 * divergence qui séparait notre ré-encodage du sien.
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
    // Lua ne distingue pas entier et flottant, mais CBOR si : les valeurs intégrales
    // partent en entier, ce que fait aussi le sérialiseur du jeu.
    if (Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
      if (value >= 0) w.header(MAJOR.UINT, value)
      else w.header(MAJOR.NEGINT, -1 - value)
    } else {
      w.float64(value)
    }
    return
  }
  if (typeof value === 'string') {
    // Major 2 et non major 3 : c'est ce que produit `C_EncodingUtil.SerializeCBOR`, vérifié
    // sur un export réel du jeu. Émettre du texte casserait l'égalité octet à octet.
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
  throw new Error(`CBOR: valeur non sérialisable (${typeof value})`)
}

export function encodeCbor(value: LuaValue): Uint8Array {
  const w = new Writer()
  encodeValue(w, value)
  return w.result()
}

// ---------------------------------------------------------------------------
// Confort : passage LuaTable <-> objets JS ordinaires
// ---------------------------------------------------------------------------

/** LuaTable -> objet/tableau JS lisible. Les tables 1..n deviennent des tableaux 0-based. */
export function luaToJs(value: LuaValue): unknown {
  if (!(value instanceof Map)) return value
  if (isLuaArray(value)) return [...value.values()].map(luaToJs)
  const out: Record<string, unknown> = {}
  for (const [k, v] of value) out[String(k)] = luaToJs(v)
  return out
}
