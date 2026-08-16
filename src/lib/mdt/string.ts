/**
 * Encodage et décodage des strings de partage de MDT.
 *
 * Deux formats coexistent (Transmission.lua) :
 *
 *   - Actuel  : `!~MDT2~` + Base64 standard + Deflate + CBOR.
 *   - Legacy  : `!` + encodage 6 bits de LibDeflate + Deflate + AceSerializer.
 *
 * On écrit toujours en MDT2 (ce que le jeu produit aujourd'hui), mais on sait lire les
 * deux : beaucoup de routes publiées sur Wago sont encore au format legacy.
 */

import pako from 'pako'
import { decodeCbor, encodeCbor, type LuaTable, type LuaValue } from './cbor'

const MDT2_PREFIX = '!~MDT2~'

export type MdtFormat = 'mdt2' | 'legacy'

export interface DecodedMdt {
  format: MdtFormat
  table: LuaTable
  /** Variante de deflate observée, à réutiliser pour ré-encoder à l'identique. */
  deflate: 'zlib' | 'raw'
}

// ---------------------------------------------------------------------------
// Base64 / octets
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
 * `Enum.CompressionMethod.Deflate` produit du deflate **brut**, sans en-tête zlib — vérifié
 * sur un export réel du jeu. On tente quand même le zlib en repli, au cas où une version
 * antérieure de MDT aurait produit autre chose.
 */
function inflateAuto(bytes: Uint8Array): { data: Uint8Array; deflate: 'zlib' | 'raw' } {
  try {
    return { data: pako.inflateRaw(bytes), deflate: 'raw' }
  } catch {
    return { data: pako.inflate(bytes), deflate: 'zlib' }
  }
}

// ---------------------------------------------------------------------------
// Encodage 6 bits de LibDeflate (format legacy)
// ---------------------------------------------------------------------------

const SIX_BIT_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()'

const SIX_BIT_LOOKUP = (() => {
  const map = new Map<string, number>()
  for (let i = 0; i < SIX_BIT_ALPHABET.length; i++) map.set(SIX_BIT_ALPHABET[i], i)
  return map
})()

/** Inverse de `LibDeflate:EncodeForPrint` : 4 caractères 6 bits -> 3 octets. */
export function decodeForPrint(input: string): Uint8Array {
  const s = input.trim()
  const out: number[] = []
  let i = 0

  while (i + 4 <= s.length) {
    const c = [0, 1, 2, 3].map((k) => SIX_BIT_LOOKUP.get(s[i + k]))
    if (c.some((v) => v === undefined)) throw new Error('String legacy : caractère hors alphabet')
    const [x1, x2, x3, x4] = c as number[]
    const cache = x1 + x2 * 64 + x3 * 4096 + x4 * 262144
    out.push(cache % 256, Math.floor(cache / 256) % 256, Math.floor(cache / 65536) % 256)
    i += 4
  }

  // Les caractères restants encodent 1 ou 2 octets de queue.
  const rest = s.length - i
  if (rest > 0) {
    let cache = 0
    let mult = 1
    for (let k = 0; k < rest; k++) {
      const v = SIX_BIT_LOOKUP.get(s[i + k])
      if (v === undefined) throw new Error('String legacy : caractère hors alphabet')
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
// AceSerializer (format legacy)
// ---------------------------------------------------------------------------

/** Inverse de `SerializeStringHelper` : `~` est le caractère d'échappement. */
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
 * Désérialise le format AceSerializer rev 1.
 * Codes : ^S string, ^N nombre, ^F/^f flottant, ^T/^t table, ^B/^b booléens, ^Z nil, ^^ fin.
 */
export function deserializeAce(input: string): LuaValue {
  if (!input.startsWith('^1')) throw new Error('AceSerializer : en-tête ^1 absent')
  const parts = input.split('^')
  let pos = 1 // parts[0] est vide, parts[1] vaut "1"

  const readValue = (): LuaValue => {
    const token = parts[++pos]
    if (token === undefined) throw new Error('AceSerializer : données tronquées')
    const code = token[0]
    const payload = token.slice(1)

    switch (code) {
      case 'S':
        return unescapeAce(payload)
      case 'N': {
        const n = Number(payload)
        if (Number.isNaN(n)) throw new Error(`AceSerializer : nombre invalide "${payload}"`)
        return n
      }
      case 'F': {
        // ^F<mantisse>^f<exposant> : la mantisse a été multipliée par 2^53.
        const mantissa = Number(payload)
        const next = parts[++pos]
        if (next?.[0] !== 'f') throw new Error('AceSerializer : ^f attendu après ^F')
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
          if (peek === undefined) throw new Error('AceSerializer : table non terminée')
          if (peek[0] === 't') {
            pos++
            return table
          }
          const key = readValue()
          if (typeof key !== 'number' && typeof key !== 'string') {
            throw new Error('AceSerializer : clé de table non scalaire')
          }
          table.set(key, readValue())
        }
      }
      default:
        throw new Error(`AceSerializer : code inconnu "^${token.slice(0, 4)}"`)
    }
  }

  return readValue()
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

export function decodeMdtString(input: string): DecodedMdt {
  const s = input.trim()
  if (!s) throw new Error('String vide')

  if (s.startsWith(MDT2_PREFIX)) {
    const bytes = base64ToBytes(s.slice(MDT2_PREFIX.length))
    const { data, deflate } = inflateAuto(bytes)
    const table = decodeCbor(data)
    if (!(table instanceof Map)) throw new Error('MDT2 : la racine décodée n\'est pas une table')
    return { format: 'mdt2', table, deflate }
  }

  // Legacy : le "!" initial signale LibDeflate plutôt que l'ancien LibCompress.
  if (!s.startsWith('!')) {
    throw new Error(
      "Format non reconnu. Colle une string exportée par MDT (elle commence par « !~MDT2~ » ou « ! »).",
    )
  }
  const bytes = decodeForPrint(s.slice(1))
  const { data, deflate } = inflateAuto(bytes)
  const table = deserializeAce(new TextDecoder('latin1').decode(data))
  if (!(table instanceof Map)) throw new Error('Legacy : la racine décodée n\'est pas une table')
  return { format: 'legacy', table, deflate }
}

export function encodeMdtString(table: LuaTable, deflate: 'zlib' | 'raw' = 'raw'): string {
  const cbor = encodeCbor(table)
  const compressed = deflate === 'zlib' ? pako.deflate(cbor) : pako.deflateRaw(cbor)
  return MDT2_PREFIX + bytesToBase64(compressed)
}
