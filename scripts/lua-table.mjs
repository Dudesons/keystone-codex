/**
 * Parser for Lua table literals.
 *
 * MDT's dungeon files are machine-generated, so their syntax is very regular: nested tables
 * only, with `["str"]`, `[number]` or bare keys, and string / number / boolean / nil / table
 * values. The only exotic cases are string concatenation
 * (`'Interface\\AddOns\\'..addonName..'\\Textures'`) and locale lookups (`L["Name"]`), which
 * we hand back as raw expressions for the caller to post-process.
 */

const WHITESPACE = new Set([' ', '\t', '\r', '\n'])

/** Marker for a value we could not reduce to a primitive. */
export class LuaExpr {
  constructor(raw) {
    this.raw = raw
  }
}

class Parser {
  constructor(src, pos) {
    this.src = src
    this.pos = pos
  }

  error(msg) {
    const line = this.src.slice(0, this.pos).split('\n').length
    return new Error(`${msg} (line ${line}, offset ${this.pos})`)
  }

  skipTrivia() {
    while (this.pos < this.src.length) {
      const c = this.src[this.pos]
      if (WHITESPACE.has(c)) {
        this.pos++
      } else if (c === '-' && this.src[this.pos + 1] === '-') {
        // Line comment (MDT files do not use long comments).
        const nl = this.src.indexOf('\n', this.pos)
        this.pos = nl === -1 ? this.src.length : nl
      } else {
        return
      }
    }
  }

  parseString() {
    const quote = this.src[this.pos]
    this.pos++
    let out = ''
    while (this.pos < this.src.length) {
      const c = this.src[this.pos]
      if (c === '\\') {
        const next = this.src[this.pos + 1]
        const simple = { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"', "'": "'", a: '\x07', b: '\b', f: '\f', v: '\v' }
        if (next in simple) {
          out += simple[next]
          this.pos += 2
        } else if (/[0-9]/.test(next)) {
          const m = /^[0-9]{1,3}/.exec(this.src.slice(this.pos + 1))
          out += String.fromCharCode(parseInt(m[0], 10))
          this.pos += 1 + m[0].length
        } else {
          out += next
          this.pos += 2
        }
      } else if (c === quote) {
        this.pos++
        return out
      } else {
        out += c
        this.pos++
      }
    }
    throw this.error('unterminated string')
  }

  /** Reads a value, absorbing a `..` concatenation if there is one. */
  parseValue() {
    this.skipTrivia()
    const start = this.pos
    let first = this.parseAtom()

    // Concatenation: keep the raw expression, remembering the literal segments.
    this.skipTrivia()
    if (this.src[this.pos] === '.' && this.src[this.pos + 1] === '.') {
      const parts = [first]
      while (this.src[this.pos] === '.' && this.src[this.pos + 1] === '.') {
        this.pos += 2
        parts.push(this.parseAtom())
        this.skipTrivia()
      }
      const expr = new LuaExpr(this.src.slice(start, this.pos).trim())
      expr.parts = parts
      return expr
    }
    return first
  }

  parseAtom() {
    this.skipTrivia()
    const c = this.src[this.pos]

    if (c === '{') return this.parseTable()
    if (c === '"' || c === "'") return this.parseString()

    if (c === '-' || c === '.' || (c >= '0' && c <= '9')) {
      const m = /^-?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/.exec(this.src.slice(this.pos))
      if (m) {
        this.pos += m[0].length
        return Number(m[0])
      }
    }

    // Identifier, keyword, or an indexed access such as `L["Name"]`.
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.src.slice(this.pos))
    if (m) {
      this.pos += m[0].length
      if (m[0] === 'true') return true
      if (m[0] === 'false') return false
      if (m[0] === 'nil') return null

      // `L["Name"]` or `MDT.foo`: capture the expression and keep the last string seen.
      const startExpr = this.pos - m[0].length
      let literal = null
      for (;;) {
        this.skipTrivia()
        if (this.src[this.pos] === '[') {
          this.pos++
          const inner = this.parseValue()
          this.skipTrivia()
          if (this.src[this.pos] !== ']') throw this.error("expected ']'")
          this.pos++
          if (typeof inner === 'string') literal = inner
        } else if (this.src[this.pos] === '.' && this.src[this.pos + 1] !== '.') {
          this.pos++
          const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.src.slice(this.pos))
          if (!id) throw this.error('expected an identifier after "."')
          this.pos += id[0].length
        } else {
          break
        }
      }
      if (this.pos === startExpr + m[0].length && literal === null) {
        const expr = new LuaExpr(m[0])
        expr.identifier = m[0]
        return expr
      }
      const expr = new LuaExpr(this.src.slice(startExpr, this.pos))
      expr.literal = literal
      return expr
    }

    throw this.error(`unexpected value: ${JSON.stringify(this.src.slice(this.pos, this.pos + 24))}`)
  }

  parseTable() {
    if (this.src[this.pos] !== '{') throw this.error("expected '{'")
    this.pos++

    const entries = new Map()
    let arrayIndex = 1

    for (;;) {
      this.skipTrivia()
      if (this.src[this.pos] === '}') {
        this.pos++
        return entries
      }
      if (this.pos >= this.src.length) throw this.error('unterminated table')

      let key = null
      if (this.src[this.pos] === '[') {
        this.pos++
        key = this.parseValue()
        this.skipTrivia()
        if (this.src[this.pos] !== ']') throw this.error("expected ']'")
        this.pos++
        this.skipTrivia()
        if (this.src[this.pos] !== '=') throw this.error("expected '='")
        this.pos++
      } else {
        // Bare key `foo = ...`, or a positional value.
        const save = this.pos
        const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.src.slice(this.pos))
        if (m) {
          const after = this.pos + m[0].length
          let probe = after
          while (probe < this.src.length && WHITESPACE.has(this.src[probe])) probe++
          if (this.src[probe] === '=' && this.src[probe + 1] !== '=') {
            key = m[0]
            this.pos = probe + 1
          } else {
            this.pos = save
          }
        }
      }

      const value = this.parseValue()
      entries.set(key === null ? arrayIndex++ : key, value)

      this.skipTrivia()
      if (this.src[this.pos] === ',' || this.src[this.pos] === ';') this.pos++
    }
  }
}

/** Parses the Lua table literal starting at the first `{` at or after `from`. */
export function parseTableAt(src, from) {
  const open = src.indexOf('{', from)
  if (open === -1) throw new Error('no table found')
  const p = new Parser(src, open)
  const value = p.parseTable()
  return { value, end: p.pos }
}

/**
 * Parses the expression following `MDT.<field>[dungeonIndex] = ` in the source.
 * Returns `undefined` when the assignment is absent.
 */
export function parseAssignment(src, field) {
  const re = new RegExp(`MDT\\.${field}\\[dungeonIndex\\]\\s*=\\s*`, 'g')
  const m = re.exec(src)
  if (!m) return undefined
  const p = new Parser(src, m.index + m[0].length)
  return p.parseValue()
}

/** Converts a Map produced by the parser into a plain JS object or array. */
export function toPlain(value, { arrays = true } = {}) {
  if (value instanceof LuaExpr) return value
  if (!(value instanceof Map)) return value

  const keys = [...value.keys()]
  const allInts = keys.length > 0 && keys.every((k) => typeof k === 'number' && Number.isInteger(k))
  const contiguousFromOne = allInts && keys.every((k, i) => k === i + 1)

  if (arrays && contiguousFromOne) {
    return keys.map((k) => toPlain(value.get(k), { arrays }))
  }
  const out = {}
  for (const [k, v] of value) out[String(k)] = toPlain(v, { arrays })
  return out
}
