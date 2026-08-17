import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { configDefaults } from 'vitest/config'

export default defineConfig({
  // Relatif, pour que le build fonctionne aussi bien en local qu'en sous-chemin GitHub Pages.
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    // A git worktree may sit under .claude/; its copies of every test file would otherwise
    // run beside the real ones, against a frozen checkout.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
