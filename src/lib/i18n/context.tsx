// ABOUTME: The running app's language: detection, persistence, and the useI18n hook.
// ABOUTME: React state, not a module variable, so a switch re-renders everything that reads it.

/**
 * The language of the running app: detection, persistence, and the hook components use.
 *
 * The locale is React state rather than a module variable, so switching language re-renders
 * everything that reads it — including the content and indicator lookups, which are keyed
 * by locale.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { PluralKey, TranslationKey } from './en'
import { en } from './en'
import { fr } from './fr'
import { resolveLocale } from './detect'
import { formatNumber, formatPercent, pluralize, translate, type Params } from './format'
import { STORAGE_KEY, type Locale } from './locales'

const DICTIONARIES = { en, fr } as const

export interface I18n {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: Params) => string
  plural: (key: PluralKey, n: number, params?: Params) => string
  formatNumber: (value: number) => string
  /** `value` is a percentage, 0–100. */
  formatPercent: (value: number, digits?: number) => string
}

const I18nContext = createContext<I18n | null>(null)

function storedLocale(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    // Private browsing and blocked storage: fall through to browser detection.
    return null
  }
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode
  /** Forces the language instead of detecting it — used by tests. */
  initialLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(
    () => initialLocale ?? resolveLocale(storedLocale(), navigator.languages),
  )

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // The choice still holds for this session, it just will not survive a reload.
    }
  }, [])

  const value = useMemo<I18n>(() => {
    const dict = DICTIONARIES[locale]
    return {
      locale,
      setLocale,
      t: (key, params) => translate(dict, key, params),
      plural: (key, n, params) => pluralize(dict, locale, key, n, params),
      formatNumber: (v) => formatNumber(locale, v),
      formatPercent: (v, digits) => formatPercent(locale, v, digits),
    }
  }, [locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be called inside a <LocaleProvider>')
  return ctx
}
