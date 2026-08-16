// ABOUTME: Import failures the user can act on, carrying a code the UI translates.
// ABOUTME: Distinct from the codec's diagnostics, which stay in English and surface verbatim.

/**
 * Import failures that are the user's to act on, as opposed to codec diagnostics.
 *
 * The codec's own errors ("CBOR: truncated string") stay plain English `Error`s: whoever
 * sees one is filing a ticket, not fixing their paste. These four are different — they tell
 * someone their string is empty, or for the wrong dungeon — so they carry a code the UI
 * translates instead of a baked-in sentence.
 */

export type MdtErrorCode = 'noValue' | 'notInPool' | 'emptyString' | 'unknownFormat'

export class MdtUserError extends Error {
  constructor(
    readonly code: MdtErrorCode,
    readonly params: Record<string, string | number> = {},
  ) {
    // The message is a fallback for logs and stack traces; the UI reads `code`.
    super(`MDT import failed: ${code}`)
    this.name = 'MdtUserError'
  }
}
