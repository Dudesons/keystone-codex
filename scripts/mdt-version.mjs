// ABOUTME: Reads the MDT addon version out of its .toc, so generated data carries its provenance.
// ABOUTME: Pure, so it can be tested against the real .toc without a WoW install.

/**
 * The addon version declared in a `.toc`, or null when none is.
 *
 * A `.toc` directive is `## Key: value`; a line starting with a single `#` is a comment, which is
 * why the anchor requires the double hash. Returns null rather than throwing: extraction must
 * not fail over a metadata line, and a missing version is reported, not fatal.
 */
export function parseTocVersion(tocText) {
  const match = /^##\s*Version:\s*(.+?)\s*$/m.exec(String(tocText ?? ''))
  return match ? match[1] : null
}
