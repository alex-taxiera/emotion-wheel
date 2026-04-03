import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

/** Placeholder in index.html; replaced at build time. */
const SITE_URL_PLACEHOLDER = '__SITE_URL__'

/** GitHub Actions sets VITE_SITE_URL from actions/configure-pages `base_url` (custom domain aware). */
const FALLBACK_SITE_URL = 'https://alex-taxiera.github.io/emotion-wheel/'

function normalizeSiteUrl(raw: string | undefined): string {
  const s = raw?.trim()
  if (!s) {
    return FALLBACK_SITE_URL.endsWith('/')
      ? FALLBACK_SITE_URL
      : `${FALLBACK_SITE_URL}/`
  }
  const base = s.replace(/\/+$/, '')
  return `${base}/`
}

// https://vite.dev/config/
// Production build uses relative `./` so assets resolve correctly for both:
// - Project Pages: https://user.github.io/repo/ (index lives under /repo/)
// - Custom domain: https://example.com/ (site root; /repo/ in URLs would 404)
// Override with VITE_BASE_URL if you host under a fixed non-relative path.
export default defineConfig(({ command, mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const siteUrl = normalizeSiteUrl(
    process.env.VITE_SITE_URL ?? fileEnv.VITE_SITE_URL,
  )

  return {
    base:
      process.env.VITE_BASE_URL ?? (command === 'build' ? './' : '/'),
    plugins: [
      {
        name: 'html-site-url',
        transformIndexHtml(html) {
          if (!html.includes(SITE_URL_PLACEHOLDER)) return html
          return html.replaceAll(SITE_URL_PLACEHOLDER, siteUrl)
        },
      },
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    resolve: {
      tsconfigPaths: true,
    },
  }
})
