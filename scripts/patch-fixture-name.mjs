// ABOUTME: Rewrites only the identifying bytes inside an MDT export fixture: the route name
// ABOUTME: and its author's name/realm. Surgical on purpose: re-encoding the whole fixture
// ABOUTME: would make the codec test circular.

/**
 * Replaces the identifying strings inside an MDT export fixture — the route's `text` and its
 * `createdBy` author's `name` and `realm`.
 *
 * Deliberately surgical: it touches ONLY the bytes of those three string values. Decoding
 * and re-encoding the whole fixture with our own encoder would make the compatibility test
 * circular — it would compare our code to itself. By patching in place, the other bytes stay
 * the ones the game produced, and the test keeps proving that our encoder reproduces MDT's
 * byte layout.
 *
 *   node scripts/patch-fixture-name.mjs "weekly route" [fixture path]
 *
 * The fixture path defaults to `src/lib/mdt/__fixtures__/real-export.txt`. `createdBy.name`
 * and `createdBy.realm` — when the fixture has a `createdBy` table at all — are always
 * replaced with `Anon`, since nothing downstream reads them for anything but display.
 */

import fs from 'node:fs'
import path from 'node:path'
import pako from 'pako'

const NEW_NAME = process.argv[2] ?? 'weekly route'
const FIXTURE = path.resolve(process.argv[3] ?? 'src/lib/mdt/__fixtures__/real-export.txt')
const ANON = 'Anon'
const PREFIX = '!~MDT2~'

/** CBOR header for a byte string (major 2), the way the game emits them. */
function byteStringHeader(length) {
  if (length < 24) return Buffer.from([0x40 | length])
  if (length < 0x100) return Buffer.from([0x58, length])
  if (length < 0x10000) return Buffer.from([0x59, length >> 8, length & 0xff])
  throw new Error('string too long for this patch')
}

/**
 * Replaces the byte-string value that follows a given key's bytes, wherever it occurs in
 * `buffer`. Returns the patched buffer, and logs what changed.
 *
 * `required` controls whether a missing key is an error (the route name always exists) or a
 * silent no-op (an older export may carry no `createdBy` table at all).
 */
function patchStringValue(buffer, key, replacement, { required }) {
  const keyBytes = Buffer.concat([byteStringHeader(key.length), Buffer.from(key, 'utf8')])
  const keyAt = buffer.indexOf(keyBytes)
  if (keyAt === -1) {
    if (required) throw new Error(`no '${key}' field found in the fixture`)
    console.log(`no '${key}' field in this fixture, left untouched`)
    return buffer
  }

  const valueAt = keyAt + keyBytes.length
  const head = buffer[valueAt]
  if (head >> 5 !== 2) throw new Error(`the '${key}' value is not a byte string (major ${head >> 5})`)

  let oldLength = head & 0x1f
  let valueStart = valueAt + 1
  if (oldLength === 24) {
    oldLength = buffer[valueAt + 1]
    valueStart = valueAt + 2
  } else if (oldLength > 24) {
    throw new Error('string length not handled by this patch')
  }

  const oldValue = buffer.subarray(valueStart, valueStart + oldLength).toString('utf8')
  const replacementBytes = Buffer.from(replacement, 'utf8')
  const patched = Buffer.concat([
    buffer.subarray(0, valueAt),
    byteStringHeader(replacementBytes.length),
    replacementBytes,
    buffer.subarray(valueStart + oldLength),
  ])

  console.log(`'${key}': "${oldValue}" -> "${replacement}"`)
  return patched
}

const raw = fs.readFileSync(FIXTURE, 'utf8').trim()
const original = Buffer.from(pako.inflateRaw(Buffer.from(raw.slice(PREFIX.length), 'base64')))

let patched = original
patched = patchStringValue(patched, 'text', NEW_NAME, { required: true })
patched = patchStringValue(patched, 'name', ANON, { required: false })
patched = patchStringValue(patched, 'realm', ANON, { required: false })

fs.writeFileSync(
  FIXTURE,
  `${PREFIX}${Buffer.from(pako.deflateRaw(patched)).toString('base64')}\n`,
  'utf8',
)

console.log(`${original.length} bytes originally, ${patched.length} after the patch`)
