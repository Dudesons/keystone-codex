// ABOUTME: Renders a component in a chosen language, since every one of them reads the locale.
// ABOUTME: A caller's own wrapper is nested inside the provider rather than replacing it.

/**
 * Rendering a component in a chosen language.
 *
 * Every component that displays text reads the locale from `LocaleProvider`, so a bare
 * `render()` throws. Going through here also forces each test to state which language it is
 * asserting, instead of depending on what the environment happens to detect.
 */

import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { LocaleProvider } from '../lib/i18n/context'
import type { Locale } from '../lib/i18n/locales'

/**
 * A caller's own `wrapper` (a router, typically) is nested inside the provider rather than
 * replacing it — overwriting it would silently drop the router and fail far from the cause.
 */
export function renderIn(locale: Locale, ui: ReactElement, options?: RenderOptions) {
  const Inner = options?.wrapper
  return render(ui, {
    ...options,
    wrapper: ({ children }: { children: ReactNode }) => (
      <LocaleProvider initialLocale={locale}>
        {Inner ? <Inner>{children}</Inner> : children}
      </LocaleProvider>
    ),
  })
}

/** The default language, and therefore the one most assertions are written against. */
export const renderEn = (ui: ReactElement, options?: RenderOptions) => renderIn('en', ui, options)

export const renderFr = (ui: ReactElement, options?: RenderOptions) => renderIn('fr', ui, options)
