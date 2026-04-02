import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
// Production build uses relative `./` so assets resolve correctly for both:
// - Project Pages: https://user.github.io/repo/ (index lives under /repo/)
// - Custom domain: https://example.com/ (site root; /repo/ in URLs would 404)
// Override with VITE_BASE_URL if you host under a fixed non-relative path.
export default defineConfig(({ command }) => ({
  base:
    process.env.VITE_BASE_URL ?? (command === 'build' ? './' : '/'),
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    tsconfigPaths: true,
  },
}))
