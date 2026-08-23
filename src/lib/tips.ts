// ABOUTME: Parses a card's `tips:` entries — a sentence, a YouTube video, or a committed image.
// ABOUTME: Pure: no glob and no React, so every accepted and rejected form is testable directly.

/**
 * Reading the `tips:` list of a card.
 *
 * A tip is written with one key naming its kind — `text:`, `video:` or `image:` — so there is no
 * separate `kind:` field that could disagree with the value beside it. An entry naming two kinds,
 * or none, is not a mismatch to reconcile: it is malformed, and is dropped with a warning.
 *
 * Nothing here reaches the network. A `video:` is reduced to its eleven-character id, and the
 * embed URL is built only when a reader clicks; an `image:` is a bare filename resolved against
 * `public/tips/<dungeon>/`, so the field cannot address a host we do not control.
 */

export type Tip =
  | { kind: 'text'; text: string }
  | { kind: 'video'; videoId: string; start?: number; portrait: boolean; label?: string }
  | { kind: 'image'; file: string; label?: string }

export interface Video {
  videoId: string
  start?: number
  /** A Short. The only reason the URL form survives parsing: it decides the aspect ratio. */
  portrait: boolean
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * A bare filename and nothing else.
 *
 * Anchored, and with no `/`, `\` or leading dot admitted, so the field cannot climb out of its
 * directory, name another host, or carry a scheme. SVG is absent deliberately: it is a document
 * that can carry script, not an image.
 */
const IMAGE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(webp|png|jpe?g|gif)$/i

/** `t=90` and `t=90s` both mean ninety seconds. Anything else means no timestamp. */
function startSeconds(value: string | null): number | undefined {
  const m = value ? /^(\d+)s?$/.exec(value) : null
  const n = m ? Number(m[1]) : 0
  return n > 0 ? n : undefined
}

/** The id, the timestamp and the orientation, or null if this is not a YouTube video URL. */
export function youtube(url: string): Video | null {
  let parsed: URL
  try {
    parsed = new URL(String(url).trim())
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null

  const host = parsed.hostname.replace(/^(www|m)\./, '')
  const [, first, second] = parsed.pathname.split('/')

  let id: string | undefined
  let portrait = false

  if (host === 'youtu.be') {
    id = first
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') id = parsed.searchParams.get('v') ?? undefined
    else if (first === 'shorts') (id = second), (portrait = true)
    else if (first === 'embed') id = second
  }

  if (!id || !VIDEO_ID.test(id)) return null
  const start = startSeconds(parsed.searchParams.get('t'))
  return start ? { videoId: id, portrait, start } : { videoId: id, portrait }
}

/**
 * The frame we load once the reader has clicked.
 *
 * `youtube-nocookie.com` because the click is the only consent we have, and `autoplay=1` because
 * that click already said "play" — the reader should not have to press a second button.
 */
export const embedUrl = (v: { videoId: string; start?: number }) =>
  `https://www.youtube-nocookie.com/embed/${v.videoId}?autoplay=1&rel=0${v.start ? `&start=${v.start}` : ''}`

/** Where the link beside the play button goes, for a browser that blocks the frame. */
export const watchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`

/** Same construction as `iconUrl` and `mapUrl`: relative to the deployed base path. */
export const tipImageUrl = (slug: string, file: string) =>
  `${import.meta.env.BASE_URL}tips/${slug}/${file}`

/**
 * The scroll target for a card's tips.
 *
 * `MobCard` renders the badge and `MobTips` renders the target, so the id is computed in one
 * place rather than written as a literal in two. Keyed by the mob because the route builder can
 * hold more than one card at a time.
 *
 * It lives in this module rather than in either component because `MobTips` already imports
 * from `Badges` and `Badges` is about to need this: exporting it from a component would put a
 * cycle between them.
 */
export const tipsSectionId = (npcId: number) => `tips-${npcId}`

const KINDS = ['text', 'video', 'image'] as const

function parseTip(raw: unknown, where: string): Tip | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    console.warn(`${where}: a tip must be a mapping, entry ignored`)
    return null
  }
  const entry = raw as Record<string, unknown>
  const named = KINDS.filter((k) => typeof entry[k] === 'string' && (entry[k] as string).trim())
  if (named.length !== 1) {
    console.warn(`${where}: a tip needs exactly one of text/video/image, got ${named.length}, entry ignored`)
    return null
  }

  const kind = named[0]
  const value = (entry[kind] as string).trim()
  const label = typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : undefined

  if (kind === 'text') {
    if (label) console.warn(`${where}: a text tip's label is ignored, entry unaffected`)
    return { kind: 'text', text: value }
  }

  if (kind === 'video') {
    const video = youtube(value)
    if (!video) {
      console.warn(`${where}: not a YouTube video URL: ${value}, entry ignored`)
      return null
    }
    return label ? { kind: 'video', ...video, label } : { kind: 'video', ...video }
  }

  if (!IMAGE_FILE.test(value)) {
    console.warn(`${where}: an image tip must be a bare filename under public/tips/: ${value}, entry ignored`)
    return null
  }
  return label ? { kind: 'image', file: value, label } : { kind: 'image', file: value }
}

/** The whole list. Returns undefined rather than an empty array, so "no tips" has one shape. */
export function parseTips(raw: unknown, where: string): Tip[] | undefined {
  if (raw == null) return undefined
  if (!Array.isArray(raw)) {
    console.warn(`${where}: \`tips:\` must be a list, ignored`)
    return undefined
  }
  const tips = raw.map((entry) => parseTip(entry, where)).filter((t): t is Tip => t !== null)
  return tips.length ? tips : undefined
}
