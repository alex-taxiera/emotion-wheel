import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
// Set VITE_BASE_URL in CI for GitHub Pages (e.g. /repo-name/); local dev uses "/".
export default defineConfig({
  base: process.env.VITE_BASE_URL ?? '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
