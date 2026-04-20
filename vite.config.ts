import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const sapUrl = env.VITE_SAP_URL ?? 'https://localhost:50000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy /b1s/* → SAP Service Layer per evitare CORS e nascondere credenziali
        '/b1s': {
          target: sapUrl,
          changeOrigin: true,
          // SAP usa spesso certificati self-signed: disabilita la verifica in sviluppo
          secure: false,
        },
      },
    },
  }
})
