import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Opens the connection to the API server (TLS handshake included) while the
// page is still loading, so the first request of every page starts sooner.
// The address comes from VITE_API_URL at build time; nothing is added without it.
function preconnectApi(apiUrl) {
  let origin = ''
  try {
    origin = apiUrl ? new URL(apiUrl).origin : ''
  } catch {
    origin = ''
  }
  return {
    name: 'preconnect-api',
    transformIndexHtml() {
      if (!origin || origin.includes('localhost')) return []
      return [
        { tag: 'link', attrs: { rel: 'preconnect', href: origin, crossorigin: '' }, injectTo: 'head' },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), preconnectApi(env.VITE_API_URL)],
    build: {
      rolldownOptions: {
        output: {
          // React and the router change rarely; keeping them out of the app's
          // own file means a deploy only re-downloads the app code, because
          // the vendor file keeps the same name (and the cached copy).
          advancedChunks: {
            groups: [{ name: 'vendor', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ }],
          },
        },
      },
    },
  }
})
