// ABOUTME: What a card's markdown is allowed to emit — and what it must refuse.
// ABOUTME: Every hostile case here is something a pull request could plausibly carry.

import { describe, expect, it } from 'vitest'
import { renderBlock, renderInline } from './markdown'

/**
 * These tests are the barrier itself.
 *
 * `content/**.md` is written by contributors through the GitHub web UI, and every field below
 * reaches the page through `dangerouslySetInnerHTML`. `marked` passes raw HTML through and does
 * not police link schemes, so both halves of this file describe behaviour we add on purpose:
 * the refusals, and — just as important — the legitimate markdown that must keep working
 * untouched. 362 cross-links across the codex depend on the second half.
 */

describe('Refusing raw HTML', () => {
  it('escapes a tag written into a one-line field', () => {
    expect(renderInline('a <img src=x onerror=alert(1)> b')).toBe(
      'a &lt;img src=x onerror=alert(1)&gt; b',
    )
  })

  it('escapes a script block written into the prose', () => {
    expect(renderBlock('<script>alert(1)</script>')).not.toContain('<script>')
  })

  it('leaves a bare comparison alone: `<` is not a tag', () => {
    expect(renderInline('kick it under 5 < 10 stacks')).toBe('kick it under 5 &lt; 10 stacks')
  })
})

describe('Refusing a dangerous link scheme', () => {
  it('keeps the text of a javascript: link and emits no anchor', () => {
    const html = renderInline('[click here](javascript:alert(1))')
    expect(html).toBe('click here')
  })

  it('keeps the alt text of a javascript: image and emits no img', () => {
    expect(renderInline('![beams](javascript:alert(1))')).toBe('beams')
  })

  it('refuses a data: URL', () => {
    expect(renderInline('[x](data:text/html,hello)')).toBe('x')
  })

  it('refuses a scheme whose colon is written as an HTML entity', () => {
    // The href reaches the attribute verbatim and the browser decodes the entity there, so a
    // check that reads the raw string sees no scheme and waves this through.
    expect(renderInline('[x](javascript&colon;alert(1))')).toBe('x')
  })

  it('refuses a scheme whose colon is written as a numeric entity', () => {
    expect(renderInline('[x](javascript&#58;alert(1))')).toBe('x')
  })

  it('refuses a scheme split by an encoded tab', () => {
    // A literal tab stops marked seeing a link at all; the entity form is the one that gets
    // through, because the URL parser drops the tab after the attribute is decoded.
    expect(renderInline('[x](java&#9;script:alert(1))')).toBe('x')
  })

  it('refuses a scheme whose first letter is an entity', () => {
    expect(renderInline('[x](&#106;avascript:alert(1))')).toBe('x')
  })

  it('refuses a scheme in any casing', () => {
    expect(renderInline('[x](JaVaScRiPt:alert(1))')).toBe('x')
  })
})

describe('Leaving legitimate markdown untouched', () => {
  it('renders an https link, title and all', () => {
    expect(renderInline('[Naowh](https://youtu.be/abc "the pull")')).toBe(
      '<a href="https://youtu.be/abc" title="the pull">Naowh</a>',
    )
  })

  it('renders the in-app cross-link every card uses', () => {
    expect(renderInline('[the writhe](#/d/altar-of-fangs/codex/mob/262398)')).toBe(
      '<a href="#/d/altar-of-fangs/codex/mob/262398">the writhe</a>',
    )
  })

  it('renders a relative image path, which carries no scheme at all', () => {
    expect(renderInline('![beams](tips/zuljan-beams.webp)')).toContain(
      '<img src="tips/zuljan-beams.webp"',
    )
  })

  it('renders a mailto link', () => {
    expect(renderInline('[write](mailto:someone@example.com)')).toContain('<a href="mailto:')
  })

  it('renders the emphasis a spell note is written with', () => {
    expect(renderInline('**Dismember** hits the tank')).toBe(
      '<strong>Dismember</strong> hits the tank',
    )
  })

  it('renders the prose as blocks, not as one inline run', () => {
    expect(renderBlock('## Route plan\n\nPull it wide.')).toContain('<h2>Route plan</h2>')
  })
})
