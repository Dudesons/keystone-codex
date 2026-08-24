// ABOUTME: Who made what this app is built on, on screen rather than only in NOTICE.md.
// ABOUTME: The MDT release is read from the generated data, so it cannot go stale by hand.

import { mdtRelease } from '../lib/data'
import { useI18n } from '../lib/i18n/context'

const REPO = 'https://github.com/Dudesons/keystone-codex'

export const SOURCE_LINKS = {
  mdt: 'https://github.com/Nnoggie/MythicDungeonTools',
  wowhead: 'https://www.wowhead.com',
  licence: `${REPO}/blob/main/LICENSE`,
  source: REPO,
} as const

/**
 * The credit line.
 *
 * `NOTICE.md` names every borrowed file and says which parts no licence of ours can grant, but
 * it only reaches somebody who clones the repository. A reader of the site was told one
 * sentence, on the home page, with no link in it and no version — so nothing on screen said
 * whose work the map is, or how old it is.
 *
 * Mounted on the pages that scroll: the home page and a dungeon's Overview. The codex and route
 * tabs fill the viewport by design and have no bottom to put this at; the map's legend carries
 * the short form instead, which is also why `credits.blizzardShort` exists.
 */
export default function SiteFooter() {
  const { t, locale } = useI18n()
  const guide = locale === 'en' ? 'CONTRIBUTING.md' : `CONTRIBUTING.${locale}.md`

  return (
    <footer className="mt-10 border-t border-ink-800 pt-4 text-xs leading-relaxed text-ink-600">
      <p>
        {t('credits.mdt', { version: mdtRelease.version })} {t('credits.wowhead')}{' '}
        {t('credits.cards')}
      </p>
      <p className="mt-1">{t('credits.blizzard')}</p>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        <a className="hover:text-gold-400" href={SOURCE_LINKS.mdt} target="_blank" rel="noreferrer">
          Mythic Dungeon Tools
        </a>
        <a
          className="hover:text-gold-400"
          href={SOURCE_LINKS.wowhead}
          target="_blank"
          rel="noreferrer"
        >
          Wowhead
        </a>
        <a
          className="hover:text-gold-400"
          href={SOURCE_LINKS.licence}
          target="_blank"
          rel="noreferrer"
        >
          {t('credits.link.licence')}
        </a>
        <a
          className="hover:text-gold-400"
          href={SOURCE_LINKS.source}
          target="_blank"
          rel="noreferrer"
        >
          {t('credits.link.source')}
        </a>
        <a
          className="hover:text-gold-400"
          href={`${REPO}/blob/main/${guide}`}
          target="_blank"
          rel="noreferrer"
        >
          {t('credits.link.contribute')}
        </a>
      </p>
    </footer>
  )
}
