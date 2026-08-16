// ABOUTME: The set of languages the app speaks, and the default it falls back to.
// ABOUTME: Adding one also needs a dictionary and a probed Wowhead locale code.

/**
 * The set of languages the app speaks.
 *
 * Adding one means: a value here, a dictionary file, and a probe of the Wowhead locale code
 * for the spell pipeline (see `SPELL_LOCALES` in `scripts/config.mjs`).
 */

export const LOCALES = ['en', 'fr'] as const

export type Locale = (typeof LOCALES)[number]

/** The language the app falls back to: what an unrecognised browser gets. */
export const DEFAULT_LOCALE: Locale = 'en'

export const STORAGE_KEY = 'keystone-locale'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
