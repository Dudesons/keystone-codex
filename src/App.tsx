// ABOUTME: The route table: home, a dungeon's highlights, its map, and the map focused on a mob.
// ABOUTME: Anything unrecognised redirects home.

import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './routes/Home'
import HighlightsPage from './routes/HighlightsPage'
import DungeonPage from './routes/DungeonPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/d/:slug" element={<HighlightsPage />} />
      <Route path="/d/:slug/map" element={<DungeonPage />} />
      <Route path="/d/:slug/map/mob/:npcId" element={<DungeonPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
