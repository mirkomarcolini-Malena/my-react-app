import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { cercaArticoliDB, type DbConfig } from './server/db'

function sapApiPlugin(cfg: DbConfig): Plugin {
  return {
    name: 'sap-articoli-api',
    configureServer(server) {
      server.middlewares.use(
        '/api/articoli',
        async (req: IncomingMessage, res: ServerResponse) => {
          const url = new URL(req.url ?? '/', 'http://localhost')
          const q = url.searchParams.get('q') ?? ''
          res.setHeader('Content-Type', 'application/json')
          try {
            const items = await cercaArticoliDB(q, cfg)
            res.end(JSON.stringify(items))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: String(err) }))
          }
        }
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const sqlCfg: DbConfig = {
    server: env.SQL_SERVER ?? '',
    database: env.SQL_DATABASE ?? '',
    user: env.SQL_USER ?? '',
    password: env.SQL_PASSWORD ?? '',
  }

  return {
    plugins: [react(), sapApiPlugin(sqlCfg)],
  }
})
