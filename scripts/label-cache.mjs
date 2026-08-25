// ABOUTME: The label table's rules: what a pass re-fetches, what it keeps, what it refuses to run on.
// ABOUTME: Its own module because fetch-assets.mjs runs its job at import and cannot be imported.

import { unfetchedLocales } from './wowhead-tooltip.mjs'

/**
 * The refusal message for a table that has never seen a configured language, or null.
 *
 * An entry with no `text` block predates localization and has to be redone. A missing
 * *secondary* locale, on the other hand, is not a signal — Wowhead does not translate
 * everything — so this looks at the table as a whole rather than entry by entry.
 *
 * That leniency would otherwise let a newly configured language pass unnoticed: every entry
 * still looks current, the run reports "0 to fetch" and succeeds, and the app falls back to
 * the base language for the whole pool without anyone being told. Hence **adding a language to
 * WOWHEAD_LOCALES requires a `FORCE=1`**, and hence this refusal when someone forgets.
 *
 * Under `force` it stays quiet, because a full pass is exactly the remedy it would ask for.
 * That used to happen by accident — `force` emptied the table, leaving no entries to check —
 * and is now deliberate, because the table is loaded either way.
 */
export function languageRefusal(cache, langs, { force, name = 'The label table' }) {
  if (force) return null
  const never = unfetchedLocales(cache, langs)
  if (!never.length || !Object.keys(cache).length) return null
  return (
    `${name} holds no ${never.join(', ')} label at all. A language added to ` +
    'WOWHEAD_LOCALES needs a full pass: FORCE=1 npm run fetch:assets'
  )
}

/**
 * Which ids this pass has to fetch.
 *
 * `force` means "re-fetch everything", and says nothing about what to keep. Those were one
 * decision until a failed fetch under `force` was found to drop a label: the table was emptied
 * to make every id look stale, which also threw away the value that should have been the
 * fallback. Selecting here, and merging in `mergeLabels`, keeps them apart.
 */
export function idsToFetch(ids, cache, { force, baseLang }) {
  if (force) return [...ids]
  return ids.filter((id) => !cache[String(id)]?.text?.[baseLang])
}

/**
 * Splits a pass's results into what resolved, what is gone, and what failed.
 *
 * The distinction matters because the two are answered differently. A 404 is `missing`: the id
 * is gone for good, one such spell really is in the pool, and a run that reports it has done
 * its job. A throw is `failed`: three attempts died on something transient, the label that
 * should have been refreshed was not, and the run has to say so loudly enough that nobody
 * commits the table thinking it is current. `pool` reports the second as `{ item, error }`.
 */
export function partitionResults(results) {
  const resolved = []
  const missing = []
  const failed = []
  for (const result of results) {
    if (result.error !== undefined) failed.push({ id: result.item, error: result.error })
    else if (result.missing) missing.push(result.id)
    else resolved.push(result)
  }
  return { resolved, missing, failed }
}

/**
 * Applies a pass's resolved entries onto the table, leaving every other entry as it was.
 *
 * This is what makes a failed fetch cost a *stale* label rather than *no* label. An id absent
 * from `resolved` keeps whatever the table already held, so the written table can never have
 * fewer entries than the one it was built from — including under `force`, which is where the
 * loss used to happen.
 */
export function mergeLabels(cache, resolved) {
  const merged = { ...cache }
  for (const entry of resolved) merged[String(entry.id)] = entry
  return merged
}
