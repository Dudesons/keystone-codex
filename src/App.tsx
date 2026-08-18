// ABOUTME: The route table: home, a dungeon's briefing, its codex (with a mob focused or not),
// ABOUTME: and its route. Anything unrecognised redirects home.

import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './routes/Home'
import HighlightsPage from './routes/HighlightsPage'
import DungeonPage from './routes/DungeonPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/d/:slug" element={<HighlightsPage />} />
      <Route path="/d/:slug/codex" element={<DungeonPage mode="codex" />} />
      <Route path="/d/:slug/codex/mob/:npcId" element={<DungeonPage mode="codex" />} />
      <Route path="/d/:slug/route" element={<DungeonPage mode="route" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
