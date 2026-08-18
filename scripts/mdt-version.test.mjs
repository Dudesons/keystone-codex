// ABOUTME: Tests the MDT addon version parser against the real .toc the addon ships.
// ABOUTME: The version is the only provenance the generated data carries.

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseTocVersion } from './mdt-version.mjs'

const realToc = fs.readFileSync(
  fileURLToPath(new URL('./__fixtures__/MythicDungeonTools.toc', import.meta.url)),
  'utf8',
)

describe('parseTocVersion', () => {
  it('reads the version out of the real addon .toc', () => {
    expect(parseTocVersion(realToc)).toBe('6.2.2')
  })

  it('takes the ## Version line, not a Version word appearing elsewhere', () => {
    // `## Interface:` precedes it and `## X-Curse-Project-ID:` follows: order must not matter.
    const shuffled = ['## Title: MDT', '## Version: 7.0.1', '## Interface: 120100'].join('\n')
    expect(parseTocVersion(shuffled)).toBe('7.0.1')
  })

  it('ignores a commented-out directive, which is a plain # in a .toc', () => {
    expect(parseTocVersion('# ## Version: 1.2.3\n## Version: 4.5.6')).toBe('4.5.6')
  })

  it('returns null rather than throwing when no version is declared', () => {
    expect(parseTocVersion('## Title: MDT')).toBeNull()
    expect(parseTocVersion('')).toBeNull()
  })
})
