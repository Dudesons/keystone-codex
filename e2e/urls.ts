// ABOUTME: Where the harness lives. Imported by the Playwright config and by the fixtures alike.
// ABOUTME: `localhost` and not `127.0.0.1`: the preview server binds IPv6 only.

/** The relay, served by a local `wrangler dev`. Its plain-GET branch answers 200. */
export const RELAY = 'http://localhost:8787'

/**
 * The app, served by `vite preview` under the deployed sub-path.
 *
 * A context created by hand with `browser.newContext()` does inherit the config's `use` block —
 * for every key the call does not set itself — but `newParticipant` in `fixtures.ts` sets the
 * base URL and the clipboard permissions explicitly anyway, so the helper reads correctly on its
 * own, without requiring the reader to know what the runner fills in behind it.
 */
export const APP = 'http://localhost:4173/keystone-codex/'
