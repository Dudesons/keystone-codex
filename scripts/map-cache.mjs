// ABOUTME: Decides whether a dungeon's map has to be re-encoded, from a digest of its tiles.
// ABOUTME: Its own module because build-maps.mjs runs its job at import and cannot be imported.

import { createHash } from 'node:crypto'

/**
 * A digest of everything that decides one map's bytes.
 *
 * The WebP encoder is not byte-stable: the same tiles encoded twice come out a few dozen bytes
 * apart, so the output cannot be compared to itself to answer "did anything change". The inputs
 * can. Tiles are sorted by index, so the digest describes the picture rather than the order the
 * directory happened to be read in, and each tile contributes its index as well as its content —
 * the same tiles in different places are a different map.
 *
 * `quality` and the dimensions are in here for a less obvious reason: without them, changing
 * MAP_QUALITY would be silently inert on any checkout whose maps are already built.
 */
export function sourceDigest({ quality, width, height, tiles }) {
  const hash = createHash('sha256')
  hash.update(`webp q=${quality} ${width}x${height}\n`)
  for (const { n, hash: tileHash } of [...tiles].sort((a, b) => a.n - b.n)) {
    hash.update(`${n}:${tileHash}\n`)
  }
  return hash.digest('hex')
}

/**
 * Why this map has to be rebuilt, or null if it does not.
 *
 * A reason rather than a boolean, so the run can say what moved instead of quietly skipping
 * seven of eight dungeons and leaving the reader to wonder whether it worked.
 *
 * `outputExists` is checked at all because a recorded digest is a claim about a file, not a
 * promise the file is still there — delete a map and the digest alone would never rebuild it.
 * Which of the two rebuild reasons wins when both apply decides only the wording.
 */
export function rebuildReason({ digest, previous, outputExists, force }) {
  if (force) return 'forced'
  if (!outputExists) return 'output missing'
  if (!previous) return 'first build'
  if (previous !== digest) return 'source changed'
  return null
}
