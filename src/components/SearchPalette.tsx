// ABOUTME: The search overlay, and the provider that lets any button open it.
// ABOUTME: An overlay rather than a field: the codex and route tabs have no room to give.

/**
 * Search, as an overlay.
 *
 * The codex and route tabs fill the viewport with fixed-width panels, so there is no space for a
 * search field on the two pages people spend the most time on. An overlay costs no layout and
 * behaves the same everywhere, including the home page.
 *
 * The provider holds the open state so a button anywhere in the tree can raise it, and the
 * palette reads the location so the dungeon a reader is already in sorts first.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { portraitUrl } from '../lib/data'
import { search, type SearchHit } from '../lib/search'
import { useI18n } from '../lib/i18n/context'
import { ThreatBadge } from './codex/Badges'

interface SearchControl {
  open: () => void
}

const SearchContext = createContext<SearchControl | null>(null)

/**
 * Throws outside a provider rather than returning a no-op, the same way `useI18n` does: a button
 * that silently fails to open anything is the bug this would otherwise hide.
 */
export function useSearch(): SearchControl {
  const control = useContext(SearchContext)
  if (!control) throw new Error('useSearch outside a SearchProvider')
  return control
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const control = useMemo(() => ({ open }), [open])

  // Ctrl/Cmd+K and a bare slash, from anywhere. The guard is the one `DungeonPage`'s own handler
  // uses, for the same reason: a key pressed in a text field is text, not a command. `/` needs it
  // because it is printable and the route panel holds two text fields; Ctrl+K gets it because one
  // rule is easier to keep true than two.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true
      if (typing) return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen(true)
        return
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setIsOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <SearchContext.Provider value={control}>
      {children}
      {isOpen && <Palette onClose={close} />}
    </SearchContext.Provider>
  )
}

function Palette({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // `/d/<slug>/…`. Absent on the home page, which is why it stays optional downstream.
  const currentSlug = pathname.match(/^\/d\/([^/]+)/)?.[1]

  const results = useMemo(() => search(query, locale, currentSlug), [query, locale, currentSlug])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const go = (hit: SearchHit) => {
    navigate(`/d/${hit.slug}/codex/mob/${hit.npcId}`)
    onClose()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((i) => Math.min(i + 1, results.hits.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const hit = results.hits[selected]
      if (hit) go(hit)
    }
  }

  const onQueryChange = (value: string) => {
    setQuery(value)
    // A new query is a new list, and Enter takes whatever is selected — a kept index would open
    // a mob the reader never saw.
    setSelected(0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* A backdrop, not a button: it carries no label and is not a control in its own right. */}
      <div
        data-search-backdrop
        className="absolute inset-0 bg-ink-950/70"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-ink-700 bg-ink-900 shadow-2xl">
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded="true"
          aria-controls="search-results"
          aria-label={t('search.label')}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('search.placeholder')}
          className="w-full border-b border-ink-800 bg-transparent px-4 py-3 text-sm text-ink-100 outline-none placeholder:text-ink-600"
        />

        {query.trim() && results.total === 0 && (
          <p className="px-4 py-6 text-center text-xs text-ink-400">
            {t('search.empty', { query: query.trim() })}
          </p>
        )}

        {results.hits.length > 0 && (
          <ul id="search-results" role="listbox" className="thin-scroll max-h-[50vh] overflow-y-auto">
            {results.hits.map((hit, i) => (
              <li key={`${hit.slug}:${hit.npcId}`} role="none">
                <button
                  type="button"
                  role="option"
                  data-testid={`hit-${hit.npcId}`}
                  aria-selected={i === selected}
                  onClick={() => go(hit)}
                  onMouseEnter={() => setSelected(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left ${
                    i === selected ? 'bg-ink-800' : 'hover:bg-ink-800/50'
                  }`}
                >
                  {hit.displayId != null && (
                    <img
                      src={portraitUrl(hit.displayId)}
                      alt=""
                      loading="lazy"
                      className="h-7 w-7 shrink-0 rounded-full border border-gold-500/40 object-cover"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink-100">{hit.name}</span>
                      <ThreatBadge threat={hit.threat} />
                    </span>
                    <span className="block truncate text-[11px] text-ink-400">
                      {hit.dungeonName}
                      {hit.viaSpell ? ` · ${t('search.viaSpell', { spell: hit.viaSpell })}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-ink-800 px-4 py-2 text-[10px] text-ink-600">
          <span>{t('search.hint')}</span>
          {results.total > results.hits.length && (
            <span>{t('search.showing', { shown: results.hits.length, total: results.total })}</span>
          )}
        </div>
      </div>
    </div>
  )
}
