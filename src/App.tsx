// ABOUTME: The route table: home, a dungeon page, and a dungeon page focused on one mob.
// ABOUTME: Anything unrecognised redirects home.

import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './routes/Home'
import DungeonPage from './routes/DungeonPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/d/:slug" element={<DungeonPage />} />
      <Route path="/d/:slug/mob/:npcId" element={<DungeonPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
