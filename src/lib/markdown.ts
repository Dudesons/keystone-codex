// ABOUTME: The one place a card's markdown becomes HTML, and the two things it refuses to emit.
// ABOUTME: Raw HTML is escaped; a link or image with a scheme we do not serve loses its tag.

/**
 * Why a card's markdown is not rendered by `marked` alone.
 *
 * Every field this module renders — `trap`, a spell's `note`, a text tip, the prose — is
 * written by hand into `content/**.md` and reaches the page through
 * `dangerouslySetInnerHTML`. `CONTRIBUTING.md` invites those edits from the GitHub web UI,
 * which makes the fields a place a stranger can write, and `marked` does two things that are
 * fine for a trusted author and not for that:
 *
 * - it passes **raw HTML** through untouched, so `<img src=x onerror=…>` in a trap sentence
 *   runs in the browser of every reader of that card;
 * - it does not police a **link's scheme**, so `[click](javascript:…)` is valid markdown that
 *   reads as an ordinary link in a pull request diff.
 *
 * Both are refused here rather than in review, because review is a person reading a long YAML
 * line. Nothing else changes: emphasis, links, headings and the 362 in-app cross-links across
 * the codex render exactly as they did — the tests beside this file pin both halves.
 *
 * A sanitizer library would do the same job and more; it is not here because the only sink is
 * markdown we render ourselves, and these two rules are the whole of what marked lets through.
 */

import { Marked } from 'marked'

const escapeHtml = (raw: string): string =>
  raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Out of range means a malformed entity, and dropping it can never manufacture a scheme. */
const fromCode = (code: number): string =>
  code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''

/**
 * The href as the **browser** will read it, which is not the string marked hands us.
 *
 * An href travels into an attribute, and the HTML parser decodes character references there
 * before the URL parser ever sees it — so `javascript&colon;…` and `java&#9;script:…` both
 * become a working `javascript:` URL that a check reading the raw string sees no scheme in.
 * The URL parser then ignores leading and embedded control characters, hence the last step.
 */
const asTheBrowserReadsIt = (href: string): string =>
  href
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => fromCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec: string) => fromCode(Number(dec)))
    .replace(/&colon;/gi, ':')
    .replace(/&tab;/gi, '\t')
    .replace(/&newline;/gi, '\n')
    .replace(/[\u0000-\u0020]/g, '')

const SCHEME = /^([a-z][a-z0-9+.-]*):/i

/** The schemes a card may link to. Everything **schemeless** — relative, `#/d/…` — is fine. */
const SERVED = new Set(['http', 'https', 'mailto'])

/**
 * Whether a link or image URL may keep its tag.
 *
 * An allowlist of schemes rather than a blocklist of `javascript:`: the next scheme that turns
 * out to be executable somewhere should be refused by default, not discovered.
 */
export function isSafeHref(href: string): boolean {
  const scheme = SCHEME.exec(asTheBrowserReadsIt(href))
  return !scheme || SERVED.has(scheme[1].toLowerCase())
}

/**
 * `false` hands the token back to marked's own renderer, so every link and image we do serve
 * is rendered by the default path and cannot drift from it — the refusals are the only code
 * here that produces output.
 */
const md = new Marked({ async: false })
md.use({
  renderer: {
    html(token) {
      return escapeHtml(token.text)
    },
    link(token) {
      return isSafeHref(token.href) ? false : this.parser.parseInline(token.tokens)
    },
    image(token) {
      return isSafeHref(token.href) ? false : escapeHtml(token.text ?? '')
    },
  },
})

/** Block markdown: the prose under a card's frontmatter, and a dungeon's plan. */
export const renderBlock = (body: string): string => md.parse(body.trim(), { async: false })

/** Inline markdown: `trap`, a spell's `note`, a text tip — sentences inside a paragraph. */
export const renderInline = (text: string): string => md.parseInline(text.trim(), { async: false })
