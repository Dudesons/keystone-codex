// ABOUTME: Tests the label table's own rules: what to re-fetch, what to keep, what to refuse.
// ABOUTME: Pure, kept apart from fetch-assets.mjs, which runs its job at import.

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'
import { idsToFetch, languageRefusal, mergeLabels, partitionResults } from './label-cache.mjs'

const LANGS = ['en', 'fr']

/** A resolved entry, in the shape the spell table stores. */
const entry = (id, langs = LANGS) => ({
  id,
  icon: `icon-${id}`,
  text: Object.fromEntries(langs.map((lang) => [lang, { name: `${lang}-${id}` }])),
})

describe('languageRefusal', () => {
  it('passes a table holding every configured language', () => {
    expect(languageRefusal({ 1: entry(1) }, LANGS, { force: false })).toBeNull()
  })

  it('refuses a table that has never seen a configured language, and names it', () => {
    const message = languageRefusal({ 1: entry(1, ['en']) }, LANGS, { force: false })
    expect(message).toContain('fr')
    expect(message).toContain('FORCE=1')
  })

  it('passes an empty table, which is a first run rather than a stale one', () => {
    expect(languageRefusal({}, LANGS, { force: false })).toBeNull()
  })

  /**
   * The refusal exists to catch a language added to WOWHEAD_LOCALES without a full pass, and a
   * full pass is spelled FORCE=1. Refusing one would refuse the remedy for the very thing being
   * reported. It used to be suppressed by accident — FORCE emptied the table, so there were no
   * entries to check — and this pins it now that the table is loaded either way.
   */
  it('passes under force, because force is the remedy it asks for', () => {
    expect(languageRefusal({ 1: entry(1, ['en']) }, LANGS, { force: true })).toBeNull()
  })
})

describe('idsToFetch', () => {
  const cache = { 1: entry(1), 2: entry(2) }

  it('fetches only the ids the table has no base-language label for', () => {
    expect(idsToFetch([1, 2, 3], cache, { force: false, baseLang: 'en' })).toEqual([3])
  })

  it('fetches every id under force, without the table having to be emptied first', () => {
    expect(idsToFetch([1, 2, 3], cache, { force: true, baseLang: 'en' })).toEqual([1, 2, 3])
  })

  it('treats an entry with no text block at all as needing a fetch', () => {
    expect(idsToFetch([1], { 1: { id: 1, icon: 'x' } }, { force: false, baseLang: 'en' })).toEqual([1])
  })

  it('does not count a missing secondary language as stale, since Wowhead omits some', () => {
    expect(idsToFetch([1], { 1: entry(1, ['en']) }, { force: false, baseLang: 'en' })).toEqual([])
  })
})

describe('partitionResults', () => {
  /**
   * The distinction the old code did not draw. A 404 means the id is gone for good and one such
   * spell really exists in the pool, so it cannot be an error. A throw means three attempts
   * failed on something transient, which is the case that loses a label.
   */
  it('separates an id that is gone from one whose fetch failed', () => {
    const { resolved, missing, failed } = partitionResults([
      { id: 1, icon: 'a', text: {} },
      { id: 2, missing: true },
      { item: 3, error: 'HTTP 429' },
    ])
    expect(resolved.map((r) => r.id)).toEqual([1])
    expect(missing).toEqual([2])
    expect(failed).toEqual([{ id: 3, error: 'HTTP 429' }])
  })

  it('reports nothing wrong for a clean pass', () => {
    const { missing, failed } = partitionResults([{ id: 1, text: {} }])
    expect(missing).toEqual([])
    expect(failed).toEqual([])
  })
})

describe('mergeLabels', () => {
  const cache = { 1: entry(1), 2: entry(2) }

  /**
   * The bug this module exists for. A FORCE pass used to start from an empty table, so a spell
   * whose fetch failed was simply absent from what got written, and the app rendered its bare
   * numeric id. Keeping the old label is worse than a fresh one and far better than none.
   */
  it('keeps the previous label of an id this pass did not resolve', () => {
    const merged = mergeLabels(cache, [{ id: 1, icon: 'fresh', text: { en: { name: 'new' } } }])
    expect(merged['2']).toEqual(entry(2))
  })

  it('overwrites an id this pass did resolve', () => {
    const merged = mergeLabels(cache, [{ id: 1, icon: 'fresh', text: { en: { name: 'new' } } }])
    expect(merged['1']).toEqual({ id: 1, icon: 'fresh', text: { en: { name: 'new' } } })
  })

  it('adds an id the table had never seen', () => {
    const merged = mergeLabels(cache, [{ id: 9, text: { en: { name: 'nine' } } }])
    expect(merged['9']).toEqual({ id: 9, text: { en: { name: 'nine' } } })
  })

  it('leaves the table it was given alone', () => {
    mergeLabels(cache, [{ id: 1, icon: 'fresh', text: { en: { name: 'new' } } }])
    expect(cache['1']).toEqual(entry(1))
  })

  it('cannot shrink a table: every previous id survives a pass that resolved nothing', () => {
    expect(Object.keys(mergeLabels(cache, [])).sort()).toEqual(['1', '2'])
  })
})

/**
 * The issue's own scenario, run against the table that is actually committed: a `FORCE=1` pass
 * over a flaky connection, where the fetches fail rather than 404. What used to reach disk was a
 * table missing every failed id, and the app renders a spell with no label as its bare numeric
 * id. Reading the real file rather than a sample is the point — a hand-made table would only
 * hold the cases this test already thought of.
 */
describe('a FORCE pass against the committed spell table', () => {
  const real = JSON.parse(readFileSync('src/data/generated/spells.json', 'utf8'))
  const ids = Object.keys(real).map(Number)

  it('has something to lose in the first place', () => {
    expect(ids.length).toBeGreaterThan(800)
  })

  it('re-fetches every id, without the table being emptied to make it look stale', () => {
    expect(idsToFetch(ids, real, { force: true, baseLang: 'en' })).toHaveLength(ids.length)
  })

  it('writes the table unchanged when every single fetch fails', () => {
    const allFailed = ids.map((id) => ({ item: id, error: 'HTTP 429' }))
    const { resolved, failed } = partitionResults(allFailed)
    expect(failed).toHaveLength(ids.length)
    expect(mergeLabels(real, resolved)).toEqual(real)
  })

  it('keeps the labels of the ids that failed while taking the ones that resolved', () => {
    const [first, second, ...rest] = ids
    const results = [
      { id: first, icon: 'fresh', text: { en: { name: 'refreshed' } } },
      { item: second, error: 'socket hang up' },
      ...rest.map((id) => ({ ...real[String(id)] })),
    ]
    const { resolved, failed } = partitionResults(results)
    const merged = mergeLabels(real, resolved)

    expect(failed).toEqual([{ id: second, error: 'socket hang up' }])
    expect(merged[String(second)]).toEqual(real[String(second)])
    expect(merged[String(first)].text.en.name).toBe('refreshed')
    expect(Object.keys(merged)).toHaveLength(ids.length)
  })
})
