// ABOUTME: Import failures the user can act on, carrying a code the UI translates.
// ABOUTME: Distinct from the codec's diagnostics, which stay in English and surface verbatim.

/**
 * Import failures that are the user's to act on, as opposed to codec diagnostics.
 *
 * The codec's own errors ("CBOR: truncated string") stay plain English `Error`s: whoever
 * sees one is filing a ticket, not fixing their paste. These five are different — they tell
 * someone their string is empty, or for the wrong dungeon — so they carry a code the UI
 * translates instead of a baked-in sentence.
 *
 * `notInPool` and `wrongDungeon` are both "wrong dungeon" and are not the same failure.
 * `notInPool` means the string names a dungeon this app does not carry at all, and no page
 * would accept it. `wrongDungeon` means the string is for a dungeon we do have, just not the
 * one you are looking at — so it is fixable by going to that dungeon, and the message says which.
 */

export type MdtErrorCode =
  | 'noValue'
  | 'notInPool'
  | 'emptyString'
  | 'unknownFormat'
  | 'wrongDungeon'

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
