/**
 * Remplace le nom de la route dans la fixture d'export MDT.
 *
 * Opération volontairement chirurgicale : on ne touche QUE les octets de la chaîne du champ
 * `text`. Décoder puis ré-encoder la fixture entière avec notre propre encodeur rendrait le
 * test de compatibilité circulaire — il comparerait notre code à lui-même. En patchant sur
 * place, les ~960 autres octets restent ceux que le jeu a produits, et le test continue de
 * prouver que notre encodeur reproduit la mise en octets de MDT.
 *
 *   node scripts/patch-fixture-name.mjs "weekly route"
 */

import fs from 'node:fs'
import path from 'node:path'
import pako from 'pako'

const NEW_NAME = process.argv[2] ?? 'weekly route'
const FIXTURE = path.resolve('src/lib/mdt/__fixtures__/real-export.txt')
const PREFIX = '!~MDT2~'

/** En-tête CBOR d'une chaîne d'octets (major 2), tel que le jeu les émet. */
function byteStringHeader(length) {
  if (length < 24) return Buffer.from([0x40 | length])
  if (length < 0x100) return Buffer.from([0x58, length])
  if (length < 0x10000) return Buffer.from([0x59, length >> 8, length & 0xff])
  throw new Error('chaîne trop longue pour ce patch')
}

const raw = fs.readFileSync(FIXTURE, 'utf8').trim()
const original = Buffer.from(pako.inflateRaw(Buffer.from(raw.slice(PREFIX.length), 'base64')))

// Repère la clé "text" puis lit la chaîne qui la suit.
const keyBytes = Buffer.concat([byteStringHeader(4), Buffer.from('text', 'utf8')])
const keyAt = original.indexOf(keyBytes)
if (keyAt === -1) throw new Error("champ 'text' introuvable dans la fixture")

const valueAt = keyAt + keyBytes.length
const head = original[valueAt]
if (head >> 5 !== 2) throw new Error(`la valeur de 'text' n'est pas une chaîne d'octets (major ${head >> 5})`)

let oldLength = head & 0x1f
let valueStart = valueAt + 1
if (oldLength === 24) {
  oldLength = original[valueAt + 1]
  valueStart = valueAt + 2
} else if (oldLength > 24) {
  throw new Error('longueur de chaîne non gérée par ce patch')
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
console.log(`« ${oldName} » -> « ${NEW_NAME} »`)
console.log(`${original.length} octets d'origine, ${patched.length} après patch`)
console.log(`${untouched} octets laissés intacts, tels que le jeu les a émis`)
