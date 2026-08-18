// ABOUTME: One card per boss, in encounter order: portrait, trap sentence, and its prio-1 spells.
// ABOUTME: A boss's trap lives here rather than in the trap list, so it is not shown twice.

import { Link } from 'react-router-dom'
import type { HighlightMob } from '../../lib/highlights'
import { portraitUrl } from '../../lib/data'
import SpellChip from './SpellChip'

export default function BossStrip({ slug, bosses }: { slug: string; bosses: HighlightMob[] }) {
  if (!bosses.length) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {bosses.map((boss) => (
        <article
          key={boss.npcId}
          data-boss={boss.npcId}
          className="rounded-lg border border-ink-800 bg-ink-900 p-3"
        >
          <div className="flex items-center gap-2.5">
            {boss.displayId != null && (
              <img
                src={portraitUrl(boss.displayId)}
                alt=""
                loading="lazy"
                className="h-10 w-10 shrink-0 rounded-full border border-gold-500/40 object-cover"
              />
            )}
            <h3 className="min-w-0 text-sm font-semibold text-ink-100">
              <Link to={`/d/${slug}/map/mob/${boss.npcId}`} className="hover:text-gold-400">
                {boss.name}
              </Link>
            </h3>
          </div>

          {/* Authored markdown, already inline-rendered by the derivation. */}
          {boss.trapHtml && (
            <p
              className="mt-2 text-xs leading-relaxed text-ink-400"
              dangerouslySetInnerHTML={{ __html: boss.trapHtml }}
            />
          )}

          {boss.spells.length > 0 && (
            <ul className="mt-2 space-y-1">
              {boss.spells.map((spell) => (
                <SpellChip key={spell.name} spell={spell} variant="card" />
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  )
}
