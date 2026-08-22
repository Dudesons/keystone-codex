// ABOUTME: A card's tips: a sentence, a click-to-load YouTube embed, or a committed image.
// ABOUTME: Nothing reaches YouTube until the reader clicks the button — that click is the consent.

import { useState } from 'react'
import { inlineMarkdown } from '../../lib/content'
import { embedUrl, tipImageUrl, watchUrl, type Tip } from '../../lib/tips'
import { useI18n } from '../../lib/i18n/context'
import { BaseLanguageMark } from './Badges'

export default function MobTips({
  slug,
  tips,
  /** The list fell back to the base language: mark the section, not each row. */
  fallback,
}: {
  slug: string
  tips: Tip[]
  fallback: boolean
}) {
  const { t } = useI18n()
  if (!tips.length) return null

  return (
    <div className="border-t border-ink-700 px-3 py-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <div className="text-[10px] font-bold tracking-widest text-ink-400">{t('tip.section')}</div>
        {fallback && <BaseLanguageMark />}
      </div>
      <ul className="space-y-2">
        {/* The index is the key: the list is replaced whole by a translation, never reordered. */}
        {tips.map((tip, i) => (
          <li key={i}>
            {tip.kind === 'text' && (
              <p
                className="text-xs leading-snug text-ink-300"
                dangerouslySetInnerHTML={{ __html: inlineMarkdown(tip.text) }}
              />
            )}
            {tip.kind === 'video' && <VideoTip tip={tip} />}
            {tip.kind === 'image' && (
              <figure>
                <img
                  src={tipImageUrl(slug, tip.file)}
                  alt={tip.label ?? ''}
                  loading="lazy"
                  className="w-full rounded border border-ink-700"
                />
                {tip.label && (
                  <figcaption className="mt-0.5 text-[11px] text-ink-400">{tip.label}</figcaption>
                )}
              </figure>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A video, loaded only once asked for.
 *
 * The button is ours and the frame is not: until it is clicked, this component makes no request
 * to anyone. The link beside it is the way out for a browser that refuses the frame — and the
 * way to watch it full size, which an inline embed is bad at.
 */
function VideoTip({ tip }: { tip: Extract<Tip, { kind: 'video' }> }) {
  const { t } = useI18n()
  const [playing, setPlaying] = useState(false)
  const label = tip.label ?? t('tip.play')

  if (playing) {
    return (
      <div
        className={`overflow-hidden rounded border border-ink-700 ${
          tip.portrait ? 'mx-auto aspect-[9/16] max-w-[240px]' : 'aspect-video'
        }`}
      >
        <iframe
          src={embedUrl(tip)}
          title={label}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setPlaying(true)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded border border-ink-600 bg-ink-800 px-2 py-1.5 text-left text-xs text-ink-100 hover:border-gold-400 hover:text-gold-400"
      >
        <span aria-hidden="true">▶</span>
        <span className="truncate">{label}</span>
      </button>
      <a
        href={watchUrl(tip.videoId)}
        target="_blank"
        rel="noreferrer"
        title={t('tip.openOnYouTube')}
        aria-label={t('tip.openOnYouTube')}
        className="shrink-0 rounded px-1 text-ink-400 hover:text-gold-400"
      >
        ↗
      </a>
    </div>
  )
}
