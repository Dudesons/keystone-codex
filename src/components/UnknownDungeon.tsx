// ABOUTME: What both dungeon pages show for a slug with no entry in the pool — a message and
// ABOUTME: a way back home, instead of crashing on a lookup that came back empty.

import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n/context'

export default function UnknownDungeon() {
  const { t } = useI18n()

  return (
    <div className="p-8">
      <p className="text-ink-300">{t('dungeon.unknown')}</p>
      <Link to="/" className="text-gold-400 hover:underline">
        {t('dungeon.backHome')}
      </Link>
    </div>
  )
}
