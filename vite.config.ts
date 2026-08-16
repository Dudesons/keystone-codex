import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relatif, pour que le build fonctionne aussi bien en local qu'en sous-chemin GitHub Pages.
  base: './',
  plugins: [react(), tailwindcss()],
})
