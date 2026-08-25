// ABOUTME: The route table: home, a dungeon's briefing, its codex (with a mob focused or not),
// ABOUTME: and its route — wrapped in the search palette, which every page can raise.

import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './routes/Home'
import HighlightsPage from './routes/HighlightsPage'
import DungeonPage from './routes/DungeonPage'
import { SearchProvider } from './components/SearchPalette'

export default function App() {
  return (
    <SearchProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/d/:slug" element={<HighlightsPage />} />
        <Route path="/d/:slug/codex" element={<DungeonPage mode="codex" />} />
        <Route path="/d/:slug/codex/mob/:npcId" element={<DungeonPage mode="codex" />} />
        <Route path="/d/:slug/route" element={<DungeonPage mode="route" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SearchProvider>
  )
}
