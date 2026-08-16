// ABOUTME: Rewrites only the route-name bytes inside the real MDT export fixture.
// ABOUTME: Surgical on purpose: re-encoding the whole fixture would make the codec test circular.

/**
 * Replaces the route name inside the MDT export fixture.
 *
 * Deliberately surgical: it touches ONLY the bytes of the `text` field's string. Decoding
 * and re-encoding the whole fixture with our own encoder would make the compatibility test
 * circular — it would compare our code to itself. By patching in place, the other ~960 bytes
 * stay the ones the game produced, and the test keeps proving that our encoder reproduces
 * MDT's byte layout.
 *
 *   node scripts/patch-fixture-name.mjs "weekly route"
 */

import fs from 'node:fs'
import path from 'node:path'
import pako from 'pako'

const NEW_NAME = process.argv[2] ?? 'weekly route'
const FIXTURE = path.resolve('src/lib/mdt/__fixtures__/real-export.txt')
const PREFIX = '!~MDT2~'

/** CBOR header for a byte string (major 2), the way the game emits them. */
function byteStringHeader(length) {
  if (length < 24) return Buffer.from([0x40 | length])
  if (length < 0x100) return Buffer.from([0x58, length])
  if (length < 0x10000) return Buffer.from([0x59, length >> 8, length & 0xff])
  throw new Error('string too long for this patch')
}

const raw = fs.readFileSync(FIXTURE, 'utf8').trim()
const original = Buffer.from(pako.inflateRaw(Buffer.from(raw.slice(PREFIX.length), 'base64')))

// Locate the "text" key, then read the string that follows it.
const keyBytes = Buffer.concat([byteStringHeader(4), Buffer.from('text', 'utf8')])
const keyAt = original.indexOf(keyBytes)
if (keyAt === -1) throw new Error("no 'text' field found in the fixture")

const valueAt = keyAt + keyBytes.length
const head = original[valueAt]
if (head >> 5 !== 2) throw new Error(`the 'text' value is not a byte string (major ${head >> 5})`)

let oldLength = head & 0x1f
let valueStart = valueAt + 1
if (oldLength === 24) {
  oldLength = original[valueAt + 1]
  valueStart = valueAt + 2
} else if (oldLength > 24) {
  throw new Error('string length not handled by this patch')
}

const oldName = original.subarray(valueStart, valueStart + oldLength).toString('utf8')

const replacement = Buffer.from(NEW_NAME, 'utf8')
const patched = Buffer.concat([
  original.subarray(0, valueAt),
  byteStringHeader(replacement.length),
  replacement,
  original.subarray(valueStart + oldLength),
])

fs.writeFileSync(
  FIXTURE,
  `${PREFIX}${Buffer.from(pako.deflateRaw(patched)).toString('base64')}\n`,
  'utf8',
)

const untouched = original.length - (valueStart + oldLength - valueAt)
console.log(`"${oldName}" -> "${NEW_NAME}"`)
console.log(`${original.length} bytes originally, ${patched.length} after the patch`)
console.log(`${untouched} bytes left untouched, exactly as the game emitted them`)
