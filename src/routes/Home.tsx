import { Link } from 'react-router-dom'
import { dungeonList, getDungeon, mapUrl } from '../lib/data'
import { contentProgress, getDungeonContent } from '../lib/content'

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold-500">MIDNIGHT · SAISON 2</p>
        <h1 className="mt-1 text-3xl font-bold text-ink-100">Codex Mythique+</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-400">
          Les huit donjons du pool, leurs packs et leurs pièges. Clique un donjon pour ouvrir sa carte
          et son codex, importer une route MDT ou en construire une.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dungeonList.map((summary) => {
          const dungeon = getDungeon(summary.slug)
          const content = getDungeonContent(summary.slug)
          const progress = dungeon
            ? contentProgress(summary.slug, [...new Set(dungeon.enemies.map((e) => e.id))])
            : { written: 0, total: 0 }

          return (
            <Link
              key={summary.slug}
              to={`/d/${summary.slug}`}
              className="group overflow-hidden rounded-lg border border-ink-700 bg-ink-900 transition hover:border-gold-500"
            >
              <div className="relative h-32 overflow-hidden bg-ink-950">
                <img
                  src={mapUrl(summary.slug)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover opacity-60 transition group-hover:opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-transparent" />
              </div>

              <div className="p-3">
                <h2 className="font-semibold text-ink-100 group-hover:text-gold-400">
                  {summary.englishName}
                </h2>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-400">
                  <span>{summary.bosses} boss</span>
                  <span>{summary.packCount} packs</span>
                  <span>{summary.totalCount} forces</span>
                  {content?.timer && <span className="text-gold-500">{content.timer} min</span>}
                </div>
                {content?.summary && <p className="mt-2 text-xs text-ink-400">{content.summary}</p>}

                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-800">
                    <div
                      className="h-full rounded-full bg-gold-500"
                      style={{ width: `${progress.total ? (progress.written / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-ink-600 tabular-nums">
                    {progress.written}/{progress.total} fiches
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <footer className="mt-10 border-t border-ink-800 pt-4 text-xs text-ink-600">
        Données de mobs et cartes extraites de Mythic Dungeon Tools. Descriptions et pièges à éditer
        dans <code className="text-ink-400">content/</code>.
      </footer>
    </div>
  )
}
