// ABOUTME: One row per mob: its name, threat and optional trap disclosure on the left, its
// ABOUTME: prio-1 spells as chips on the right. A row is a mob, the unit a player thinks in.

import { Link } from 'react-router-dom'
import type { HighlightMob } from '../../lib/highlights'
import { portraitUrl } from '../../lib/data'
import { useI18n } from '../../lib/i18n/context'
import { ThreatBadge } from '../codex/Badges'
import SpellChip from './SpellChip'

export default function MobTable({ slug, mobs }: { slug: string; mobs: HighlightMob[] }) {
  if (!mobs.length) return null

  return (
    <div className="overflow-hidden rounded-lg border border-ink-800">
      {mobs.map((mob) => (
        <MobRow key={mob.npcId} slug={slug} mob={mob} />
      ))}
    </div>
  )
}

function MobRow({ slug, mob }: { slug: string; mob: HighlightMob }) {
  const { t } = useI18n()

  return (
    <div
      data-mob={mob.npcId}
      className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-ink-800 px-3 py-2.5 last:border-b-0 hover:bg-ink-800/40"
    >
      <div className="flex min-w-[13rem] flex-col gap-1.5">
        <div className="flex items-center gap-2">
          {mob.displayId != null && (
            <img
              src={portraitUrl(mob.displayId)}
              alt=""
              loading="lazy"
              className="h-7 w-7 shrink-0 rounded-full border border-gold-500/40 object-cover"
            />
          )}
          <Link
            to={`/d/${slug}/codex/mob/${mob.npcId}`}
            className="text-sm font-semibold text-ink-100 hover:text-gold-400"
          >
            {mob.name}
          </Link>
          <ThreatBadge threat={mob.threat} />
          {mob.role === 'miniboss' && (
            <span className="rounded border border-gold-500/40 bg-gold-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-gold-400">
              {t('role.miniboss')}
            </span>
          )}
        </div>
        {mob.trapHtml && (
          <details
            data-trap={mob.npcId}
            className="group border-l-2 border-ink-700 pl-3 hover:border-gold-500"
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
              <span className="text-ink-500 transition-transform group-open:rotate-90">▸</span>
              <span className="text-xs font-semibold text-ink-100">{t('highlights.trap')}</span>
            </summary>
            {/* Authored markdown, already inline-rendered by the derivation. */}
            <p
              className="mt-0.5 pl-5 text-xs leading-relaxed text-ink-400"
              dangerouslySetInnerHTML={{ __html: mob.trapHtml }}
            />
          </details>
        )}
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
        {mob.spells.map((spell) => (
          <SpellChip key={spell.name} slug={slug} npcId={mob.npcId} spell={spell} variant="row" />
        ))}
      </div>
    </div>
  )
}
