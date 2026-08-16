import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { LocaleProvider } from './lib/i18n/context'
import './index.css'

// HashRouter rather than BrowserRouter: the build is served statically (GitHub Pages, or a
// double-click on dist/index.html), with no server able to reroute deep paths.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </LocaleProvider>
  </StrictMode>,
)
