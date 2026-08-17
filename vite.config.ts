import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { configDefaults } from 'vitest/config'

export default defineConfig({
  // Relatif, pour que le build fonctionne aussi bien en local qu'en sous-chemin GitHub Pages.
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    projects: [
      {
        // The application suite, unchanged: node by default, jsdom where a file asks for it.
        extends: true,
        test: {
          name: 'app',
          // A git worktree may sit under .claude/; its copies of every test file would
          // otherwise run beside the real ones, against a frozen checkout. `relay/` is
          // excluded here because it belongs to the project below, which runs in workerd.
          exclude: [...configDefaults.exclude, '.claude/**', 'relay/**', 'e2e/**'],
        },
      },
      './relay/vitest.config.ts',
    ],
  },
})
