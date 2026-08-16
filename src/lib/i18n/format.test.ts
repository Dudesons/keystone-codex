// ABOUTME: Tests interpolation, plural selection and number formatting in both languages.
// ABOUTME: Includes zero, where English and French genuinely disagree.

import { describe, expect, it } from 'vitest'
import { en } from './en'
import { fr } from './fr'
import { formatNumber, formatPercent, interpolate, pluralize, translate } from './format'

describe('interpolate', () => {
  it('substitutes named placeholders', () => {
    expect(interpolate('Pull {n}', { n: 3 })).toBe('Pull 3')
    expect(interpolate('{written}/{total} cards', { written: 2, total: 40 })).toBe('2/40 cards')
  })

  it('leaves an unknown placeholder alone rather than blanking it', () => {
    // A visible `{oops}` points at the dictionary; an empty string hides the mistake.
    expect(interpolate('Pull {oops}', { n: 3 })).toBe('Pull {oops}')
  })

  it('returns the template untouched when there is nothing to substitute', () => {
    expect(interpolate('Legend')).toBe('Legend')
    expect(interpolate('Legend', {})).toBe('Legend')
  })

  it('substitutes every occurrence of the same placeholder', () => {
    expect(interpolate('{n} of {n}', { n: 7 })).toBe('7 of 7')
  })
})

describe('translate', () => {
  it('reads the dictionary of the language it is given', () => {
    expect(translate(en, 'common.close')).toBe('Close')
    expect(translate(fr, 'common.close')).toBe('Fermer')
  })

  it('interpolates the parameters', () => {
    expect(translate(en, 'codex.pack', { n: 12 })).toBe('Pack 12')
    expect(translate(fr, 'mob.unknownSpell', { id: 999 })).toBe('Sort 999')
  })

  it('shows the key itself for an entry that does not exist', () => {
    // Unreachable through the typed API; the guard is for a dynamic cast.
    expect(translate(en, 'nope.missing' as never)).toBe('nope.missing')
  })
})

describe('pluralize', () => {
  it('picks the singular for one', () => {
    expect(pluralize(en, 'en', 'common.units', 1)).toBe('1 unit')
    expect(pluralize(fr, 'fr', 'common.units', 1)).toBe('1 unité')
  })

  it('picks the plural beyond one', () => {
    expect(pluralize(en, 'en', 'common.units', 4)).toBe('4 units')
    expect(pluralize(fr, 'fr', 'common.units', 4)).toBe('4 unités')
  })

  it('disagrees at zero, the way the two languages actually do', () => {
    // English pluralises zero, French does not. This is the whole reason for Intl.PluralRules
    // rather than an `n > 1` test.
    expect(pluralize(en, 'en', 'common.units', 0)).toBe('0 units')
    expect(pluralize(fr, 'fr', 'common.units', 0)).toBe('0 unité')
  })

  it('exposes `n` without it having to be passed, and accepts extra parameters', () => {
    expect(pluralize(en, 'en', 'route.imported', 1, { name: 'k0' })).toBe('“k0” imported: 1 pull.')
    expect(pluralize(en, 'en', 'route.imported', 5, { name: 'k0' })).toBe('“k0” imported: 5 pulls.')
  })
})

describe('formatNumber and formatPercent', () => {
  it('uses the decimal separator of the language', () => {
    expect(formatPercent('en', 82.5, 1)).toBe('82.5%')
    // French puts a narrow no-break space before the percent sign; comparing the digits
    // avoids pinning the exact space codepoint of the ICU build.
    expect(formatPercent('fr', 82.5, 1)).toMatch(/^82,5\s*%$/)
  })

  it('rounds to no decimals by default', () => {
    expect(formatPercent('en', 82.5)).toBe('83%')
    expect(formatPercent('en', 0)).toBe('0%')
    expect(formatPercent('en', 100)).toBe('100%')
  })

  it('groups thousands per language', () => {
    expect(formatNumber('en', 1234)).toBe('1,234')
    expect(formatNumber('fr', 1234)).toMatch(/^1\s*234$/)
  })
})
