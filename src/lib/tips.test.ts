// ABOUTME: Tests the tip parser — which YouTube URLs are accepted, and what is rejected.
// ABOUTME: Pure input/output: no files, no DOM, so every rejection can be stated as a case.

import { describe, expect, it, vi } from 'vitest'
import { embedUrl, parseFocus, parseTips, tipFocusParam, tipImageUrl, tipsSectionId, watchUrl, youtube } from './tips'

describe('youtube', () => {
  it('reads the id out of every form someone actually pastes', () => {
    expect(youtube('https://www.youtube.com/watch?v=9D0gCU8Tp5Y')).toMatchObject({ videoId: '9D0gCU8Tp5Y', portrait: false })
    expect(youtube('https://youtu.be/9D0gCU8Tp5Y')).toMatchObject({ videoId: '9D0gCU8Tp5Y', portrait: false })
    expect(youtube('https://www.youtube.com/embed/9D0gCU8Tp5Y')).toMatchObject({ videoId: '9D0gCU8Tp5Y', portrait: false })
  })

  it('marks a Short as portrait, which is the only reason the form is distinguished', () => {
    expect(youtube('https://www.youtube.com/shorts/9D0gCU8Tp5Y')).toMatchObject({ videoId: '9D0gCU8Tp5Y', portrait: true })
  })

  it('keeps a timestamp, with or without its trailing s', () => {
    expect(youtube('https://youtu.be/9D0gCU8Tp5Y?t=95')?.start).toBe(95)
    expect(youtube('https://www.youtube.com/watch?v=9D0gCU8Tp5Y&t=95s')?.start).toBe(95)
    expect(youtube('https://youtu.be/9D0gCU8Tp5Y')?.start).toBeUndefined()
    // A timestamp we cannot read is no timestamp, not a broken one.
    expect(youtube('https://youtu.be/9D0gCU8Tp5Y?t=1h2m')?.start).toBeUndefined()
  })

  it('refuses anything that is not a YouTube video id', () => {
    expect(youtube('https://www.youtube.com/watch?v=tooshort')).toBeNull()
    expect(youtube('https://vimeo.com/9D0gCU8Tp5Y')).toBeNull()
    expect(youtube('https://www.youtube.com/results?search_query=x')).toBeNull()
    expect(youtube('javascript:alert(1)')).toBeNull()
    expect(youtube('not a url at all')).toBeNull()
  })

  it('refuses a host that only looks like YouTube', () => {
    // `hostname` on both is a suffix match away from being accepted by a careless check —
    // the field decides which host a browser is sent to, so this is a security claim.
    expect(youtube('https://youtube.com.evil.com/watch?v=9D0gCU8Tp5Y')).toBeNull()
    expect(youtube('https://notyoutube.com/watch?v=9D0gCU8Tp5Y')).toBeNull()
  })

  it('accepts the mobile and no-cookie hosts, not just the canonical one', () => {
    expect(youtube('https://m.youtube.com/watch?v=9D0gCU8Tp5Y')).toMatchObject({ videoId: '9D0gCU8Tp5Y' })
    expect(youtube('https://youtube-nocookie.com/watch?v=9D0gCU8Tp5Y')).toMatchObject({ videoId: '9D0gCU8Tp5Y' })
  })
})

describe('URLs', () => {
  it('embeds through the no-cookie host, autoplaying because the click already happened', () => {
    expect(embedUrl({ videoId: '9D0gCU8Tp5Y' })).toBe(
      'https://www.youtube-nocookie.com/embed/9D0gCU8Tp5Y?autoplay=1&rel=0',
    )
    expect(embedUrl({ videoId: '9D0gCU8Tp5Y', start: 95 })).toBe(
      'https://www.youtube-nocookie.com/embed/9D0gCU8Tp5Y?autoplay=1&rel=0&start=95',
    )
  })

  it('links out to the canonical watch page', () => {
    expect(watchUrl('9D0gCU8Tp5Y')).toBe('https://www.youtube.com/watch?v=9D0gCU8Tp5Y')
  })

  it('starts an image from BASE_URL, to stay valid under a GitHub Pages subpath', () => {
    expect(tipImageUrl('the-blinding-vale', 'a.webp')).toBe(
      `${import.meta.env.BASE_URL}tips/the-blinding-vale/a.webp`,
    )
  })

  it('builds a scroll target from the npc id', () => {
    expect(tipsSectionId(254_850)).toBe('tips-254850')
  })
})

describe('parseTips', () => {
  it('reads the three kinds, taking the key as the kind', () => {
    const tips = parseTips(
      [
        { text: 'Kick the second cast.' },
        { video: 'https://www.youtube.com/shorts/9D0gCU8Tp5Y', label: 'The pull' },
        { image: 'beams.webp', label: 'Where they land' },
      ],
      'card.md',
    )
    expect(tips).toEqual([
      { kind: 'text', text: 'Kick the second cast.' },
      { kind: 'video', videoId: '9D0gCU8Tp5Y', portrait: true, label: 'The pull' },
      { kind: 'image', file: 'beams.webp', label: 'Where they land' },
    ])
  })

  it('drops an entry that names no kind, or two, and warns rather than throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseTips([{ label: 'orphan' }], 'card.md')).toBeUndefined()
    expect(parseTips([{ text: 'a', video: 'https://youtu.be/9D0gCU8Tp5Y' }], 'card.md')).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it('keeps the good entries when one is bad, because a card must never break over content', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const tips = parseTips([{ text: 'kept' }, { video: 'https://vimeo.com/x' }], 'card.md')
    expect(tips).toEqual([{ kind: 'text', text: 'kept' }])
    warn.mockRestore()
  })

  it('refuses an image that is anything but a bare filename', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const file of ['../secret.webp', 'sub/dir.webp', 'C:\\x.webp', 'https://example.com/x.webp', 'x.svg', '.webp']) {
      expect(parseTips([{ image: file }], 'card.md'), file).toBeUndefined()
    }
    warn.mockRestore()
  })

  it('treats a missing or malformed list as no tips at all', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseTips(undefined, 'card.md')).toBeUndefined()
    expect(parseTips(null, 'card.md')).toBeUndefined()
    expect(parseTips('a string', 'card.md')).toBeUndefined()
    expect(parseTips([], 'card.md')).toBeUndefined()
    warn.mockRestore()
  })
})

describe('a tip that names its pull', () => {
  it('reads a list of pack numbers', () => {
    const [tip] = parseTips([{ text: 'x', packs: [44, 45] }], 'card')!
    expect(tip.packs).toEqual([44, 45])
  })

  // Someone will write the scalar form. Dropping it silently would produce a card that looks
  // right and a map that behaves as though the key were never there.
  it('accepts a bare number as a list of one', () => {
    const [tip] = parseTips([{ text: 'x', packs: 44 }], 'card')!
    expect(tip.packs).toEqual([44])
  })

  it('leaves a tip with no packs unscoped', () => {
    const [tip] = parseTips([{ text: 'x' }], 'card')!
    expect(tip.packs).toBeUndefined()
  })

  it('scopes a video and an image too, not only text', () => {
    const [video] = parseTips([{ video: 'https://youtu.be/9D0gCU8Tp5Y', packs: [44] }], 'card')!
    const [image] = parseTips([{ image: 'a.webp', packs: [44] }], 'card')!
    expect(video.packs).toEqual([44])
    expect(image.packs).toEqual([44])
  })

  /**
   * One bad entry unscopes the whole tip rather than narrowing it silently. An unscoped tip is
   * noisy on the map — a badge on every clone — which is visible; a quietly narrowed one points
   * at the wrong pull and looks correct doing it.
   */
  it('drops the scope, and warns, when any value is not a pack number', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseTips([{ text: 'x', packs: [44, 'nope'] }], 'card')![0].packs).toBeUndefined()
    expect(parseTips([{ text: 'x', packs: [0] }], 'card')![0].packs).toBeUndefined()
    expect(parseTips([{ text: 'x', packs: [-3] }], 'card')![0].packs).toBeUndefined()
    expect(parseTips([{ text: 'x', packs: [1.5] }], 'card')![0].packs).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(4)
    warn.mockRestore()
  })

  it('leaves an empty list unscoped without complaining', () => {
    const [tip] = parseTips([{ text: 'x', packs: [] }], 'card')!
    expect(tip.packs).toBeUndefined()
  })
})

describe('tipFocusParam', () => {
  it('lists the pulls a tip names', () => {
    expect(tipFocusParam({ kind: 'text', text: 'x', packs: [44, 45] })).toBe('44,45')
  })

  it('names the mob when the tip is unscoped', () => {
    expect(tipFocusParam({ kind: 'text', text: 'x' })).toBe('mob')
  })
})

describe('parseFocus', () => {
  it('reads a single pull', () => {
    expect(parseFocus('44')).toEqual({ packs: [44] })
  })

  it('reads a combined pull', () => {
    expect(parseFocus('44,45')).toEqual({ packs: [44, 45] })
  })

  it('reads the mob', () => {
    expect(parseFocus('mob')).toEqual({ mob: true })
  })

  it('is null for an absent, empty or unrecognised value', () => {
    expect(parseFocus(null)).toBeNull()
    expect(parseFocus('')).toBeNull()
    expect(parseFocus('pack-44')).toBeNull()
    expect(parseFocus('44,')).toBeNull()
    expect(parseFocus('0')).toBeNull()
    expect(parseFocus('-3')).toBeNull()
  })

  it('round-trips what tipFocusParam writes', () => {
    expect(parseFocus(tipFocusParam({ kind: 'text', text: 'x', packs: [44] }))).toEqual({ packs: [44] })
    expect(parseFocus(tipFocusParam({ kind: 'text', text: 'x' }))).toEqual({ mob: true })
  })

  it('rejects forms that Number() would accept but are not plain decimal digits', () => {
    expect(parseFocus(' 44')).toBeNull() // whitespace padding
    expect(parseFocus('44 ')).toBeNull()
    expect(parseFocus(' 44 ')).toBeNull()
    expect(parseFocus('0x2c')).toBeNull() // hex
    expect(parseFocus('1e2')).toBeNull() // exponential
    expect(parseFocus('+44')).toBeNull() // explicit sign
  })

  it('accepts duplicate pack numbers as written, without deduplicating', () => {
    expect(parseFocus('44,44')).toEqual({ packs: [44, 44] })
  })

  it('accepts leading zeroes and resolves them correctly', () => {
    expect(parseFocus('044')).toEqual({ packs: [44] })
    expect(parseFocus('044,045')).toEqual({ packs: [44, 45] })
  })
})
