/**
 * Picking a language from what the browser and the stored preference say.
 *
 * Kept pure and parameterised rather than reading `navigator` and `localStorage` directly:
 * that is what makes the priority rules testable without mocking a browser.
 */

import { DEFAULT_LOCALE, isLocale, type Locale } from './locales'

/**
 * An explicit choice wins over the browser, which wins over the default.
 *
 * Browser tags are matched on their primary subtag, so `fr-CA` resolves to `fr`, and the
 * list is scanned in order — `navigator.languages` is already sorted by preference.
 */
export function resolveLocale(
  stored: string | null | undefined,
  preferred: readonly string[] = [],
): Locale {
  if (isLocale(stored)) return stored

  for (const tag of preferred) {
    const primary = tag.toLowerCase().split('-')[0]
    if (isLocale(primary)) return primary
  }

  return DEFAULT_LOCALE
}
