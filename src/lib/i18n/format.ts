/**
 * Turning a dictionary entry into a string: interpolation, plural selection, numbers.
 *
 * Everything here takes its dictionary and locale as arguments rather than reading a
 * context, so the rules are testable on their own. `context.tsx` binds them.
 */

import type { Dictionary, PluralKey, TranslationKey } from './en'
import type { Locale } from './locales'

export type Params = Record<string, string | number>

const PLACEHOLDER = /\{(\w+)\}/g

/** `{n}` is replaced by `params.n`. An unknown placeholder is left alone rather than blanked. */
export function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(PLACEHOLDER, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

export function translate(dict: Dictionary, key: TranslationKey, params?: Params): string {
  const template = (dict as Record<string, string | undefined>)[key]
  // Unreachable through the typed API; the key itself is the most useful thing to show.
  if (template === undefined) return key
  return interpolate(template, params)
}

/**
 * Picks between `<key>.one` and `<key>.other` through `Intl.PluralRules`.
 *
 * Not over-engineering for two languages: English and French disagree at zero — "0 units"
 * against « 0 unité » — and `Intl` already knows that. `n` is available as a placeholder
 * without being passed explicitly.
 */
export function pluralize(
  dict: Dictionary,
  locale: Locale,
  key: PluralKey,
  n: number,
  params?: Params,
): string {
  const entries = dict as Record<string, string | undefined>
  const category = new Intl.PluralRules(locale).select(n)
  // Locales with `few`/`many` fall back to `other`, which is the only form we always write.
  const template = entries[`${key}.${category}`] ?? entries[`${key}.other`]
  if (template === undefined) return `${key}.other`
  return interpolate(template, { n, ...params })
}

export const formatNumber = (locale: Locale, value: number): string =>
  new Intl.NumberFormat(locale).format(value)

/** `value` is a percentage, 0–100, the way the route stats compute it. */
export const formatPercent = (locale: Locale, value: number, digits = 0): string =>
  new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value / 100)
