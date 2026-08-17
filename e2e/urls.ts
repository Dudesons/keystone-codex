// ABOUTME: Where the harness lives. Imported by the Playwright config and by the fixtures alike.
// ABOUTME: `localhost` and not `127.0.0.1`: the preview server binds IPv6 only.

/** The relay, served by a local `wrangler dev`. Its plain-GET branch answers 200. */
export const RELAY = 'http://localhost:8787'

/**
 * The app, served by `vite preview` under the deployed sub-path.
 *
 * A context created by hand with `browser.newContext()` inherits **nothing** from the config's
 * `use` block — not this base URL, not the clipboard permissions — which is why the fixtures pass
 * them explicitly and why this constant cannot simply live in the config.
 */
export const APP = 'http://localhost:4173/keystone-codex/'
