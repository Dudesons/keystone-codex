/**
 * Encoding and decoding MDT share strings.
 *
 * Two formats coexist (Transmission.lua):
 *
 *   - Current : `!~MDT2~` + standard Base64 + Deflate + CBOR.
 *   - Legacy  : `!` + LibDeflate 6-bit encoding + Deflate + AceSerializer.
 *
 * We always write MDT2 (what the game produces today), but we can read both: plenty of
 * routes published on Wago are still in the legacy format.
 */

import pako from 'pako'
import { decodeCbor, encodeCbor, type LuaTable, type LuaValue } from './cbor'
import { MdtUserError } from './errors'

const MDT2_PREFIX = '!~MDT2~'

export type MdtFormat = 'mdt2' | 'legacy'

export interface DecodedMdt {
  format: MdtFormat
  table: LuaTable
  /** The deflate variant observed, to reuse so the re-encoding is identical. */
  deflate: 'zlib' | 'raw'
}

// ---------------------------------------------------------------------------
// Base64 / bytes
// ---------------------------------------------------------------------------

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, '')
  const bin = atob(clean)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}

/**
 * `Enum.CompressionMethod.Deflate` produces **raw** deflate, with no zlib header — verified
 * against a real export from the game. We still try zlib as a fallback, in case an earlier
 * version of MDT produced something else.
 */
function inflateAuto(bytes: Uint8Array): { data: Uint8Array; deflate: 'zlib' | 'raw' } {
  try {
    return { data: pako.inflateRaw(bytes), deflate: 'raw' }
  } catch {
    return { data: pako.inflate(bytes), deflate: 'zlib' }
  }
}

// ---------------------------------------------------------------------------
// LibDeflate 6-bit encoding (legacy format)
// ---------------------------------------------------------------------------

const SIX_BIT_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()'

const SIX_BIT_LOOKUP = (() => {
  const map = new Map<string, number>()
  for (let i = 0; i < SIX_BIT_ALPHABET.length; i++) map.set(SIX_BIT_ALPHABET[i], i)
  return map
})()

/** Inverse of `LibDeflate:EncodeForPrint`: 4 six-bit characters -> 3 bytes. */
export function decodeForPrint(input: string): Uint8Array {
  const s = input.trim()
  const out: number[] = []
  let i = 0

  while (i + 4 <= s.length) {
    const c = [0, 1, 2, 3].map((k) => SIX_BIT_LOOKUP.get(s[i + k]))
    if (c.some((v) => v === undefined)) throw new Error('Legacy string: character outside the alphabet')
    const [x1, x2, x3, x4] = c as number[]
    const cache = x1 + x2 * 64 + x3 * 4096 + x4 * 262144
    out.push(cache % 256, Math.floor(cache / 256) % 256, Math.floor(cache / 65536) % 256)
    i += 4
  }

  // The remaining characters encode 1 or 2 trailing bytes.
  const rest = s.length - i
  if (rest > 0) {
    let cache = 0
    let mult = 1
    for (let k = 0; k < rest; k++) {
      const v = SIX_BIT_LOOKUP.get(s[i + k])
      if (v === undefined) throw new Error('Legacy string: character outside the alphabet')
      cache += v * mult
      mult *= 64
    }
    for (let k = 0; k < rest - 1; k++) {
      out.push(cache % 256)
      cache = Math.floor(cache / 256)
    }
  }

  return new Uint8Array(out)
}

// ---------------------------------------------------------------------------
// AceSerializer (legacy format)
// ---------------------------------------------------------------------------

/** Inverse of `SerializeStringHelper`: `~` is the escape character. */
function unescapeAce(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '~') {
      out += s[i]
      continue
    }
    const n = s.charCodeAt(++i)
    if (n === 122) out += String.fromCharCode(30) // ~z
    else if (n === 125) out += '^' // ~}
    else if (n === 124) out += '~' // ~|
    else if (n === 123) out += String.fromCharCode(127) // ~{
    else out += String.fromCharCode(n - 64)
  }
  return out
}

/**
 * Deserialises the AceSerializer rev 1 format.
 * Codes: ^S string, ^N number, ^F/^f float, ^T/^t table, ^B/^b booleans, ^Z nil, ^^ end.
 */
export function deserializeAce(input: string): LuaValue {
  if (!input.startsWith('^1')) throw new Error('AceSerializer: missing ^1 header')
  const parts = input.split('^')
  let pos = 1 // parts[0] is empty, parts[1] is "1"

  const readValue = (): LuaValue => {
    const token = parts[++pos]
    if (token === undefined) throw new Error('AceSerializer: truncated data')
    const code = token[0]
    const payload = token.slice(1)

    switch (code) {
      case 'S':
        return unescapeAce(payload)
      case 'N': {
        const n = Number(payload)
        if (Number.isNaN(n)) throw new Error(`AceSerializer: invalid number "${payload}"`)
        return n
      }
      case 'F': {
        // ^F<mantissa>^f<exponent>: the mantissa was multiplied by 2^53.
        const mantissa = Number(payload)
        const next = parts[++pos]
        if (next?.[0] !== 'f') throw new Error('AceSerializer: expected ^f after ^F')
        return mantissa * 2 ** Number(next.slice(1))
      }
      case 'B':
        return true
      case 'b':
        return false
      case 'Z':
        return null
      case 'T': {
        const table: LuaTable = new Map()
        for (;;) {
          const peek = parts[pos + 1]
          if (peek === undefined) throw new Error('AceSerializer: unterminated table')
          if (peek[0] === 't') {
            pos++
            return table
          }
          const key = readValue()
          if (typeof key !== 'number' && typeof key !== 'string') {
            throw new Error('AceSerializer: non-scalar table key')
          }
          table.set(key, readValue())
        }
      }
      default:
        throw new Error(`AceSerializer: unknown code "^${token.slice(0, 4)}"`)
    }
  }

  return readValue()
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function decodeMdtString(input: string): DecodedMdt {
  const s = input.trim()
  if (!s) throw new MdtUserError('emptyString')

  if (s.startsWith(MDT2_PREFIX)) {
    const bytes = base64ToBytes(s.slice(MDT2_PREFIX.length))
    const { data, deflate } = inflateAuto(bytes)
    const table = decodeCbor(data)
    if (!(table instanceof Map)) throw new Error('MDT2: the decoded root is not a table')
    return { format: 'mdt2', table, deflate }
  }

  // Legacy: the leading "!" signals LibDeflate rather than the older LibCompress.
  if (!s.startsWith('!')) throw new MdtUserError('unknownFormat')
  const bytes = decodeForPrint(s.slice(1))
  const { data, deflate } = inflateAuto(bytes)
  const table = deserializeAce(new TextDecoder('latin1').decode(data))
  if (!(table instanceof Map)) throw new Error('Legacy: the decoded root is not a table')
  return { format: 'legacy', table, deflate }
}

export function encodeMdtString(table: LuaTable, deflate: 'zlib' | 'raw' = 'raw'): string {
  const cbor = encodeCbor(table)
  const compressed = deflate === 'zlib' ? pako.deflate(cbor) : pako.deflateRaw(cbor)
  return MDT2_PREFIX + bytesToBase64(compressed)
}
