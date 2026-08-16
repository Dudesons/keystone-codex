import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// HashRouter plutôt que BrowserRouter : le build est servi en statique (GitHub Pages,
// double-clic sur dist/index.html), sans serveur capable de rerouter les chemins profonds.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
