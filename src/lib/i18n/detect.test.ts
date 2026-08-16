import { describe, expect, it } from 'vitest'
import { resolveLocale } from './detect'
import { DEFAULT_LOCALE } from './locales'

describe('resolveLocale', () => {
  it('honours an explicit stored choice over the browser', () => {
    expect(resolveLocale('fr', ['en-US', 'en'])).toBe('fr')
    expect(resolveLocale('en', ['fr-FR'])).toBe('en')
  })

  it('ignores a stored value that is not a language we speak', () => {
    // A stale key, a hand-edited localStorage, or a language we dropped.
    expect(resolveLocale('de', ['fr-FR'])).toBe('fr')
    expect(resolveLocale('', ['fr'])).toBe('fr')
    expect(resolveLocale('null', [])).toBe(DEFAULT_LOCALE)
  })

  it('falls back to the browser when nothing is stored', () => {
    expect(resolveLocale(null, ['fr-FR', 'fr', 'en'])).toBe('fr')
    expect(resolveLocale(undefined, ['en-GB'])).toBe('en')
  })

  it('matches on the primary subtag, so a regional variant still counts', () => {
    expect(resolveLocale(null, ['fr-CA'])).toBe('fr')
    expect(resolveLocale(null, ['FR-be'])).toBe('fr')
  })

  it('scans the browser list in order: the first language we speak wins', () => {
    // `navigator.languages` is already sorted by preference, so the first hit is the answer
    // even when a later entry is also supported.
    expect(resolveLocale(null, ['de', 'fr', 'en'])).toBe('fr')
    expect(resolveLocale(null, ['de', 'en', 'fr'])).toBe('en')
  })

  it('falls back to the default for a browser we do not speak', () => {
    expect(resolveLocale(null, ['de-DE', 'it'])).toBe(DEFAULT_LOCALE)
    expect(resolveLocale(null, [])).toBe(DEFAULT_LOCALE)
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE)
  })
})
