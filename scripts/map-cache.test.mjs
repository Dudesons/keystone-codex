// ABOUTME: Tests when a map has to be re-encoded and when its committed bytes may stand.
// ABOUTME: Pure, kept apart from build-maps.mjs, which runs its job at import.

import { describe, expect, it } from 'vitest'
import { rebuildReason, sourceDigest } from './map-cache.mjs'

const tiles = [
  { n: 1, hash: 'aaa' },
  { n: 2, hash: 'bbb' },
]
const inputs = { quality: 82, width: 1920, height: 1280, tiles }

describe('sourceDigest', () => {
  it('gives the same digest for the same inputs', () => {
    expect(sourceDigest(inputs)).toBe(sourceDigest({ ...inputs, tiles: [...tiles] }))
  })

  it('moves when a tile’s content changes', () => {
    const changed = [{ n: 1, hash: 'aaa' }, { n: 2, hash: 'ccc' }]
    expect(sourceDigest({ ...inputs, tiles: changed })).not.toBe(sourceDigest(inputs))
  })

  /**
   * A tile landing somewhere else changes the picture without changing any tile's bytes, and a
   * floor with holes really does produce a sparse set. Written with **one** tile on purpose: two
   * tiles swapping content already give a different concatenation once sorted by index, so a
   * digest that ignored the index entirely would still pass that version of this test. This one
   * fails without it.
   */
  it('moves when the same tile lands at a different index', () => {
    const at = (n) => sourceDigest({ ...inputs, tiles: [{ n, hash: 'aaa' }] })
    expect(at(2)).not.toBe(at(1))
  })

  it('moves when a tile goes missing', () => {
    expect(sourceDigest({ ...inputs, tiles: [tiles[0]] })).not.toBe(sourceDigest(inputs))
  })

  /**
   * Quality and dimensions decide the output as much as the tiles do. Leaving them out would
   * make MAP_QUALITY silently inert on a checkout whose maps are already built.
   */
  it('moves when the encoder quality changes', () => {
    expect(sourceDigest({ ...inputs, quality: 90 })).not.toBe(sourceDigest(inputs))
  })

  it('moves when the output dimensions change', () => {
    expect(sourceDigest({ ...inputs, width: 960 })).not.toBe(sourceDigest(inputs))
  })

  it('does not depend on the order the tiles were read in', () => {
    expect(sourceDigest({ ...inputs, tiles: [tiles[1], tiles[0]] })).toBe(sourceDigest(inputs))
  })
})

describe('rebuildReason', () => {
  const digest = sourceDigest(inputs)

  it('is silent when the digest matches and the map is on disk', () => {
    expect(rebuildReason({ digest, previous: digest, outputExists: true, force: false })).toBeNull()
  })

  /**
   * The failure this fix must not trade for the churn it removes: a map silently lagging its
   * tiles is worse than a map rewritten for nothing.
   *
   * "source" rather than "tiles" because the digest covers the encoder settings too, and a real
   * `MAP_QUALITY=90` run reported "tiles changed" over tiles that had not moved. A reason that
   * is printed is a claim, and that one was false.
   */
  it('rebuilds when anything the digest covers has moved', () => {
    expect(rebuildReason({ digest, previous: 'other', outputExists: true, force: false })).toBe(
      'source changed',
    )
  })

  it('calls a quality change a source change, since that is what moved the digest', () => {
    const atNinety = sourceDigest({ ...inputs, quality: 90 })
    expect(
      rebuildReason({ digest: atNinety, previous: digest, outputExists: true, force: false }),
    ).toBe('source changed')
  })

  it('rebuilds when no digest was recorded, which is any first run', () => {
    expect(rebuildReason({ digest, previous: undefined, outputExists: true, force: false })).toBe(
      'first build',
    )
  })

  /** A matching digest is not a promise that the file it describes is still there. */
  it('rebuilds when the map itself is gone, digest or no digest', () => {
    expect(rebuildReason({ digest, previous: digest, outputExists: false, force: false })).toBe(
      'output missing',
    )
  })

  it('rebuilds everything under force, which is the escape hatch for a new encoder', () => {
    expect(rebuildReason({ digest, previous: digest, outputExists: true, force: true })).toBe(
      'forced',
    )
  })
})
